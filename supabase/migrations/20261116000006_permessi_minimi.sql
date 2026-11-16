-- Permessi minimi (16/11/2026). Su Supabase le tabelle nuove di "public" sono concesse
-- per intero ad anon e authenticated: la protezione resta la Row Level Security, ma qui
-- si toglie anche il permesso di base. Il pubblico può solo leggere il catalogo
-- e chiamare le funzioni delle richieste; scrive solo chi è admin (RLS).
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on public.categories, public.products, public.variants, public.media, public.settings, public.slug_redirects to anon;

revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke insert, update, delete on public.price_history, public.admins from authenticated;
revoke update, delete on public.audit_log from authenticated;

-- Tabelle future: nessun permesso automatico al pubblico
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon;
