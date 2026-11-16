# Creare il primo admin (Supabase)

Non ci sono password predefinite né utenti creati dal seed.

## Stato attuale

Il **primo admin è già creato** sul progetto «Vesuvio Sleep – nuovo sito» (16/11/2026):
l'utente esiste, l'email risulta confermata ed è già in `public.admins`.
**Non ha una password**: la sceglie il titolare dell'indirizzo.

1. Apri la pagina di accesso dell'area admin (o Supabase › Authentication › Users).
2. Usa **«Password dimenticata»** con quell'indirizzo email.
3. Dal link ricevuto imposta la password. Da quel momento l'accesso funziona.

Nessuno, nemmeno chi ha costruito il sito, conosce quella password.

## Aggiungere altri admin

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
