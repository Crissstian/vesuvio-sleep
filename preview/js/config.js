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
  mapEmbed: false,
  supabaseUrl: 'https://bsojqhtidiwwzmzqtgde.supabase.co',
  supabaseKey: 'sb_publishable_NVOzmQyo3OyH4iNjaMXQ0A_6di8aWF3',
  supabaseBucket: 'product-media',
};
