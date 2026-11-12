# Creare il primo admin (Supabase)

Non ci sono password predefinite né utenti creati dal seed.

1. In Supabase › Authentication, invita l'utente con la sua email. L'utente sceglie la propria password dal link ricevuto.
2. In SQL Editor (ruolo `postgres`), promuovilo:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'indirizzo@dominio.it'
   on conflict do nothing;
   ```

3. Verifica: con quell'utente l'area `/admin` mostra bozze e richieste; con qualsiasi altro utente le policy RLS restituiscono zero righe.

Per revocare l'accesso: `delete from public.admins where user_id = '…';`.

Nella **preview statica** il primo accesso a `#admin` chiede di creare una password locale (almeno 10 caratteri, PBKDF2 con 150.000 iterazioni). Vale solo per quel browser.
