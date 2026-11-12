-- Funzioni chiamabili dal sito pubblico. Sono l'unico modo per il pubblico di
-- creare richieste: ricontrollano prezzo, pubblicazione e disponibilità lato
-- server, non accettano dati personali e non segnano mai nulla come pagato.

-- Riferimento leggibile: VS-R-20261112-7KQ4 / VS-Q-…
create function public.make_ref(prefix text) returns text
language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  code text;
  candidate text;
begin
  loop
    code := '';
    for i in 1..4 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    candidate := 'VS-' || prefix || '-' || to_char(now() at time zone 'Europe/Rome', 'YYYYMMDD') || '-' || code;
    exit when not exists (select 1 from public.requests where ref = candidate);
  end loop;
  return candidate;
end $$;

-- items: [{"variant_id": uuid, "qty": int, "seen_price_cents": int|null}]
-- Restituisce le righe con stato ok | price_changed | unavailable | missing.
create function public.validate_cart(items jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  it jsonb;
  v record;
  lines jsonb := '[]'::jsonb;
  total int := 0;
  issues int := 0;
  qty int;
  status text;
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 or jsonb_array_length(items) > 30 then
    raise exception 'Carrello non valido' using errcode = '22023';
  end if;
  for it in select * from jsonb_array_elements(items) loop
    qty := coalesce((it ->> 'qty')::int, 0);
    if qty < 1 or qty > 20 then
      raise exception 'Quantità non valida' using errcode = '22023';
    end if;
    select va.id, va.sku, va.size, va.height_cm, va.price_cents, va.availability, va.active,
           p.id as product_id, p.name, p.status as p_status, c.status as c_status
      into v
      from public.variants va
      join public.products p on p.id = va.product_id
      join public.categories c on c.id = p.category_id
     where va.id = (it ->> 'variant_id')::uuid;
    if not found then
      status := 'missing';
    elsif not (v.active and v.price_cents is not null and v.availability <> 'unavailable'
               and v.p_status = 'published' and v.c_status = 'published') then
      status := 'unavailable';
    elsif (it ->> 'seen_price_cents') is not null and (it ->> 'seen_price_cents')::int <> v.price_cents then
      status := 'price_changed';
    else
      status := 'ok';
      total := total + v.price_cents * qty;
    end if;
    if status <> 'ok' then issues := issues + 1; end if;
    lines := lines || jsonb_build_object(
      'variant_id', it ->> 'variant_id', 'qty', qty, 'status', status,
      'product_id', case when found then v.product_id end,
      'name', case when found then v.name end, 'sku', case when found then v.sku end,
      'size', case when found then v.size end, 'height_cm', case when found then v.height_cm end,
      'unit_cents', case when status in ('ok', 'price_changed') then v.price_cents end);
  end loop;
  return jsonb_build_object('lines', lines, 'total_cents', total, 'issues', issues, 'can_submit', issues = 0);
end $$;

-- Crea la richiesta in stato "bozza" solo se il carrello è valido.
create function public.create_cart_request(items jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  res jsonb;
  ref text;
  rid uuid;
begin
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

-- Il click su WhatsApp NON prova l'invio: passa solo da bozza a "in attesa di contatto".
create function public.mark_request_waiting(p_ref text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare rid uuid;
begin
  update public.requests set status = 'in_attesa_contatto'
   where ref = p_ref and status = 'bozza'
   returning id into rid;
  if rid is not null then
    insert into public.request_events (request_id, status, note, actor)
    values (rid, 'in_attesa_contatto', 'Il cliente ha aperto WhatsApp (invio non verificabile)', 'sito');
  end if;
end $$;

-- Preventivo fuori misura: solo misure e note, nessun dato personale richiesto.
create function public.create_quote_request(p_product_id uuid, p_width_cm numeric, p_length_cm numeric,
                                            p_height_cm numeric, p_notes text, p_b2b boolean default false)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  ref text;
  rid uuid;
  pname text;
begin
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

-- Esecuzione consentita al pubblico solo per queste funzioni.
revoke all on function public.make_ref(text) from public;
revoke all on function public.validate_cart(jsonb) from public;
revoke all on function public.create_cart_request(jsonb) from public;
revoke all on function public.mark_request_waiting(text) from public;
revoke all on function public.create_quote_request(uuid, numeric, numeric, numeric, text, boolean) from public;
grant execute on function public.validate_cart(jsonb) to anon, authenticated;
grant execute on function public.create_cart_request(jsonb) to anon, authenticated;
grant execute on function public.mark_request_waiting(text) to anon, authenticated;
grant execute on function public.create_quote_request(uuid, numeric, numeric, numeric, text, boolean) to anon, authenticated;
