# Collegamento del sito al database (Supabase)

## Come funziona

Il sito parte **sempre** con il catalogo compilato nel bundle: la pagina si disegna subito
e si vede anche se il database è spento. Subito dopo, se la configurazione c'è, chiede il
catalogo a Supabase; se risponde, il sito si ridisegna con quei dati e da quel momento la
fonte di verità è il database. Se non risponde, non succede niente: resta il catalogo
compilato e nel diario del browser compare un avviso.

Lo stesso vale per il carrello. Il ricontrollo dei prezzi e la creazione delle richieste
passano dalle funzioni SQL (`validate_cart`, `create_cart_request`, `create_quote_request`),
che sono le uniche a sapere quanto costa davvero una variante adesso. Ogni chiamata ha un
tempo massimo di 2,5 secondi e, dopo un errore, per mezzo minuto il sito non riprova: chi
sta comprando non deve aspettare un server che non risponde.

## Chiavi

In `preview/js/config.js` (e, per il sito pubblico, in `dist/js/config.js` generato dal
build) ci sono solo `supabaseUrl` e `supabaseKey`. La chiave è quella **pubblicabile**:
sta nel browser per progetto, e a decidere che cosa si legge e si scrive sono le policy RLS
del database. **La service role non è in nessun file di questo repository** e non deve
entrarci: chi la ottiene scavalca tutte le policy.

Chi non ha fatto l'accesso vede quello che le policy concedono al ruolo anonimo: prodotti
pubblicati, foto pubblicate, impostazioni pubbliche. Bozze, archiviati, note interne,
richieste e storico prezzi restano fuori, e li protegge il database, non il JavaScript.

## Dall'admin

Admin › Impostazioni › **Database**:

- dice da dove arriva il catalogo che si sta guardando, compilato o database, e quando è
  stato letto;
- **Rileggi dal database** lo richiede subito;
- **Accedi al database** con email e password dell'utente Supabase. Il primo amministratore
  nasce senza password: «Non ho una password» manda il link per impostarla;
- **Pubblica il catalogo sul database** manda prodotti, varianti, foto e impostazioni come
  si vedono nell'admin. Lo può fare solo un amministratore: per chiunque altro le policy
  rifiutano la scrittura.

Le foto caricate nel browser dell'admin (`idb:`) non vengono pubblicate: non esiste ancora
un file nel bucket a cui collegarle. Per quelle serve il caricamento su Storage, che non è
ancora fatto.

## Che cosa è verificato e che cosa no

**Verificato**: le policy RLS, le funzioni SQL e i conteggi del catalogo, con i test su
Postgres 16 e con query di controllo sul progetto reale. L'utente amministratore esiste,
è promosso e vede bozze e note interne.

**Non verificato da qui**: la chiamata vera dal browser a Supabase. L'ambiente in cui è
stato scritto questo codice non ha accesso di rete a `supabase.co`, quindi il percorso
browser → PostgREST non è mai stato eseguito per intero. Si verifica in trenta secondi:
apri il sito, vai in Admin › Impostazioni › Database e leggi la prima riga. Se dice che il
catalogo arriva dal database, il collegamento funziona.
