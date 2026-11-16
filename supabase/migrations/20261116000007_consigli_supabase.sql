-- Correzioni suggerite dai controlli di Supabase (16/11/2026).
-- 1) search_path fisso anche per le funzioni dei trigger
alter function public.touch_updated_at() set search_path = public;
alter function public.guard_product_delete() set search_path = public;
-- 2) is_admin serve solo agli utenti autenticati (le regole admin sono "to authenticated")
revoke execute on function public.is_admin() from anon;
-- 3) indici sulle chiavi esterne usate dallo storico
create index if not exists price_history_variant_idx on public.price_history (variant_id);
create index if not exists request_events_request_idx on public.request_events (request_id);
-- Nota: validate_cart, create_cart_request, mark_request_waiting e create_quote_request
-- restano eseguibili dal pubblico di proposito: sono l'unico modo per creare richieste
-- e ricontrollano tutto lato server.
