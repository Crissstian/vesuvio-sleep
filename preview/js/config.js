// Configurazione d'ambiente della preview (equivalente di .env per il sito statico).
// whatsappNumber: se valorizzato prevale sull'impostazione admin. Formato +39…
// Lasciato vuoto finché il numero per il checkout non è confermato.
//
// supabaseUrl / supabaseKey: collegamento al database. La chiave è quella PUBBLICABILE,
// pensata da Supabase per stare nel browser: da sola non apre niente, perché a decidere
// che cosa si può leggere e scrivere sono le policy RLS del database. La service role
// non compare in nessun file di questo repository.
window.VS_CONFIG = {
  preview: true,
  whatsappNumber: '',
  // mappa: si carica solo al clic del visitatore. mapsQuery = che cosa cercare su Google Maps
  // (l'indirizzo, oppure il nome dell'attività com'è registrato su Google, per mostrarne la scheda).
  mapsQuery: 'Via Raffaele Salierno 38, 80026 Casoria NA',
  // recensioni Google: si accende dopo aver configurato la funzione google-reviews su Supabase
  reviews: false,
  supabaseUrl: 'https://bsojqhtidiwwzmzqtgde.supabase.co',
  supabaseKey: 'sb_publishable_NVOzmQyo3OyH4iNjaMXQ0A_6di8aWF3',
  supabaseBucket: 'product-media',
};
