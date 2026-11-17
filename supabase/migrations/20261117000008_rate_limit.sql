-- Limite di chiamate (anti-abuso) sulle funzioni pubbliche, 17/11/2026.
--
-- Le tre funzioni che il pubblico può chiamare per SCRIVERE (create_cart_request,
-- create_quote_request, mark_request_waiting) erano aperte senza tetto: chiunque, con la
-- chiave pubblicabile che sta nel browser, poteva riempire la tabella delle richieste
-- con uno script. Qui si aggiunge un contatore per chiamante e una finestra di tempo.
--
-- Come funziona, in breve:
--   * il contatore si alza PRIMA del controllo; se si supera il limite la funzione
--     solleva un errore, la transazione torna indietro e con essa anche l'aumento.
--     Il contatore resta quindi fermo sul limite per tutta la finestra: le chiamate
--     oltre il tetto vengono respinte una per una e non gonfiano la tabella;
--   * oltre al limite per chiamante c'è un tetto complessivo per finestra: serve
--     quando l'indirizzo IP non arriva o è contraffatto, perché l'intestazione
--     x-forwarded-for la scrive il client e non è una prova d'identità;
--   * il limite NON è una misura di sicurezza sui dati (quella resta la RLS):
--     serve solo a non farsi riempire il database e a tenere bassi i costi.
--
-- validate_cart non è compresa: è di sola lettura (stable, non può scrivere il
-- contatore) e non crea niente. Se servirà un tetto anche lì, va messo davanti al
-- database (Cloudflare o il rate limit dell'hosting), non dentro una funzione stable.

-- ------------------------------------------------------------------ contatore
create table if not exists public.rate_limits (
  bucket text not null,
  client text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (bucket, client, window_start)
);

comment on table public.rate_limits is
  'Contatore delle chiamate alle funzioni pubbliche. Scritto solo dalle funzioni SECURITY DEFINER; le righe vecchie si cancellano da sole.';

alter table public.rate_limits enable row level security;

-- Nessun permesso al pubblico: ci scrivono solo le funzioni, che girano come proprietario.
revoke all on public.rate_limits from anon, authenticated;
grant select on public.rate_limits to authenticated;

drop policy if exists "admin legge i contatori" on public.rate_limits;
create policy "admin legge i contatori" on public.rate_limits
  for select to authenticated using (public.is_admin());

create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

-- ------------------------------------------------------------------ chi sta chiamando
-- Con PostgREST le intestazioni della richiesta arrivano in request.headers.
-- Si preferisce cf-connecting-ip (la scrive Cloudflare, il client non la controlla),
-- poi x-real-ip, poi il primo valore di x-forwarded-for. Fuori da PostgREST (console
-- SQL, migrazioni) non c'è nessuna intestazione e la chiave diventa 'locale'.
create or replace function public.client_key() returns text
language plpgsql stable security definer set search_path = public as $$
declare
  h json;
  ip text;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    h := null;
  end;
  if h is not null then
    ip := coalesce(h ->> 'cf-connecting-ip', h ->> 'x-real-ip', split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1));
    ip := nullif(btrim(coalesce(ip, '')), '');
  end if;
  if ip is not null then
    return left(ip, 64);
  end if;
  return coalesce(nullif(auth.uid()::text, ''), 'locale');
end $$;

-- ------------------------------------------------------------------ il limite
-- p_limit: chiamate per finestra e per chiamante. p_global: tetto complessivo.
-- L'errore ha SQLSTATE PT429: PostgREST lo restituisce al browser come HTTP 429.
create or replace function public.throttle(p_bucket text, p_limit int, p_window_seconds int, p_global int)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  who text := public.client_key();
  w timestamptz := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  n int;
  g int;
begin
  -- pulizia saltuaria: una chiamata su cento butta via le finestre di ieri
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  insert into public.rate_limits (bucket, client, window_start, hits)
  values (p_bucket, who, w, 1)
  on conflict (bucket, client, window_start) do update set hits = rate_limits.hits + 1
  returning hits into n;

  insert into public.rate_limits (bucket, client, window_start, hits)
  values (p_bucket, '*', w, 1)
  on conflict (bucket, client, window_start) do update set hits = rate_limits.hits + 1
  returning hits into g;

  if n > p_limit or g > p_global then
    raise exception 'Troppe richieste ravvicinate. Riprova tra qualche minuto oppure scrivici su WhatsApp.'
      using errcode = 'PT429',
            detail = format('bucket=%s finestra=%ss', p_bucket, p_window_seconds),
            hint = 'Limite anti-abuso delle funzioni pubbliche.';
  end if;
end $$;

-- ------------------------------------------------------------------ funzioni pubbliche
-- Si riscrivono con il limite davanti. CREATE OR REPLACE conserva i permessi già
-- concessi, ma i grant si ripetono in fondo per non dipendere da quel dettaglio.

create or replace function public.create_cart_request(items jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  res jsonb;
  ref text;
  rid uuid;
begin
  perform public.throttle('create_cart_request', 10, 600, 300);
  res := public.validate_cart(items);
  if not (res ->> 'can_submit')::boolean then
    return jsonb_build_object('ok', false, 'validation', res);
  end if;
  ref := public.make_ref('R');
  insert into public.requests (ref, type, status, items, total_cents)
  values (ref, 'cart', 'bozza',
          (select jsonb_agg(l - 'status') from jsonb_array_elements(res -> 'lines') l),
          (res ->> 'total_cents')::int)
  returning id into rid;
  insert into public.request_events (request_id, status, note, actor) values (rid, 'bozza', 'Riepilogo generato dal carrello', 'sito');
  return jsonb_build_object('ok', true, 'ref', ref, 'validation', res);
end $$;

create or replace function public.mark_request_waiting(p_ref text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare rid uuid;
begin
  perform public.throttle('mark_request_waiting', 30, 600, 900);
  update public.requests set status = 'in_attesa_contatto'
   where ref = p_ref and status = 'bozza'
   returning id into rid;
  if rid is not null then
    insert into public.request_events (request_id, status, note, actor)
    values (rid, 'in_attesa_contatto', 'Il cliente ha aperto WhatsApp (invio non verificabile)', 'sito');
  end if;
end $$;

create or replace function public.create_quote_request(p_product_id uuid, p_width_cm numeric, p_length_cm numeric,
                                                       p_height_cm numeric, p_notes text, p_b2b boolean default false)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  ref text;
  rid uuid;
  pname text;
begin
  perform public.throttle('create_quote_request', 5, 600, 150);
  if p_width_cm is null or p_width_cm < 40 or p_width_cm > 250 then raise exception 'Larghezza non valida' using errcode = '22023'; end if;
  if p_length_cm is null or p_length_cm < 100 or p_length_cm > 250 then raise exception 'Lunghezza non valida' using errcode = '22023'; end if;
  if p_height_cm is not null and (p_height_cm < 5 or p_height_cm > 45) then raise exception 'Altezza non valida' using errcode = '22023'; end if;
  if length(coalesce(p_notes, '')) > 500 then raise exception 'Note troppo lunghe' using errcode = '22023'; end if;
  if p_product_id is not null then
    select name into pname from public.products where id = p_product_id and status = 'published';
    if pname is null then raise exception 'Prodotto non disponibile' using errcode = '22023'; end if;
  end if;
  ref := public.make_ref('Q');
  insert into public.requests (ref, type, status, quote)
  values (ref, case when p_b2b then 'b2b'::public.request_type else 'quote'::public.request_type end, 'bozza',
          jsonb_build_object('product_id', p_product_id, 'product', coalesce(pname, 'Da definire'),
                             'width_cm', p_width_cm, 'length_cm', p_length_cm, 'height_cm', p_height_cm,
                             'notes', coalesce(p_notes, ''), 'price_cents', null, 'reply', '', 'custom_sku', null))
  returning id into rid;
  insert into public.request_events (request_id, status, note, actor) values (rid, 'bozza', 'Richiesta di preventivo fuori misura', 'sito');
  return jsonb_build_object('ok', true, 'ref', ref);
end $$;

-- ------------------------------------------------------------------ permessi
-- throttle e client_key sono attrezzi interni: le chiama il proprietario dentro le
-- funzioni SECURITY DEFINER, non il pubblico.
revoke all on function public.throttle(text, int, int, int) from public, anon, authenticated;
revoke all on function public.client_key() from public, anon, authenticated;
grant execute on function public.create_cart_request(jsonb) to anon, authenticated;
grant execute on function public.mark_request_waiting(text) to anon, authenticated;
grant execute on function public.create_quote_request(uuid, numeric, numeric, numeric, text, boolean) to anon, authenticated;
