// Spazi immagine del sito (non legati a un prodotto). Finché non c'è una foto
// approvata e pubblicata dall'admin, ogni spazio mostra un segnaposto dichiarato.
export const SITE_SLOTS = [
  { key: 'hero_napoli', label: 'Apertura: Napoli', hint: 'Foto orizzontale del Golfo di Napoli con il Vesuvio, almeno 2400 px di larghezza', ratio: '16 / 9' },
  { key: 'fabbrica_cucito', label: 'Fabbrica: reparto cucito', hint: 'Foto reale del reparto di Casoria, persone solo con consenso', ratio: '4 / 5' },
  { key: 'fabbrica_taglio', label: 'Fabbrica: taglio delle lastre', hint: 'Foto reale di lavorazione', ratio: '4 / 5' },
  { key: 'fabbrica_materiali', label: 'Fabbrica: materiali', hint: 'Dettaglio di Memory Foam, molle o tessuti', ratio: '4 / 5' },
  { key: 'showroom', label: 'Showroom di Casoria', hint: "Foto dell'esposizione o dell'ingresso", ratio: '4 / 3' },
];

/** Spazi immagine dei prodotti: cosa fotografare per ogni scheda. */
export const PRODUCT_SLOTS = [
  { slot: 'hero', label: 'Prodotto in prospettiva 3/4', hint: 'Sfondo neutro, luce morbida' },
  { slot: 'exploded', label: 'Vista esplosa o sezione', hint: 'Strati reali del modello' },
  { slot: 'fabric', label: 'Dettaglio del tessuto', hint: 'Fascia, cuciture, cerniera' },
];
