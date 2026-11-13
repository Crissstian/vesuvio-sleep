// Spazi immagine del sito (non legati a un prodotto). Ogni spazio mostra, in
// ordine: la foto caricata e pubblicata dall'admin, l'immagine predefinita
// (render illustrativo consegnato il 13/11/2026), oppure un segnaposto dichiarato.
const f = (name, alt, { portrait = false } = {}) => ({
  src: `img/foto/${name}-${portrait ? 900 : 1600}.webp`,
  srcset: portrait ? `img/foto/${name}-600.webp 600w, img/foto/${name}-900.webp 900w` : `img/foto/${name}-900.webp 900w, img/foto/${name}-1600.webp 1536w`,
  alt,
  caption: 'Immagine illustrativa',
});

export const SITE_SLOTS = [
  { key: 'hero_napoli', label: 'Apertura: Napoli', hint: 'Foto orizzontale del Golfo di Napoli con il Vesuvio, almeno 2400 px di larghezza', ratio: '16 / 9' },
  { key: 'fabbrica_panoramica', label: 'Fabbrica: panoramica', hint: 'Il reparto visto d’insieme', ratio: '5 / 2', default: f('fabbrica-panoramica', 'Reparto di produzione con materassi impilati, rotoli di tessuto e macchine per la trapuntatura') },
  { key: 'fabbrica_cucito', label: 'Fabbrica: reparto cucito', hint: 'Foto reale del reparto di Casoria, persone solo con consenso', ratio: '4 / 5', default: f('fabbrica-cucito', 'Mani che guidano la fascia di un materasso sotto una macchina da cucire industriale', { portrait: true }) },
  { key: 'fabbrica_taglio', label: 'Fabbrica: taglio delle lastre', hint: 'Foto reale di lavorazione', ratio: '4 / 5', default: f('fabbrica-taglio', 'Taglio di una lastra di espanso con una lama verticale', { portrait: true }) },
  { key: 'fabbrica_materiali', label: 'Fabbrica: materiali', hint: 'Dettaglio di Memory Foam, molle o tessuti', ratio: '4 / 5', default: f('fabbrica-materiali', 'Campioni di Memory Foam, poliuretano, molle insacchettate e tessuto trapuntato', { portrait: true }) },
  { key: 'showroom', label: 'Showroom di Casoria', hint: 'Foto dell’esposizione o dell’ingresso', ratio: '4 / 3', default: f('showroom', 'Showroom luminoso con materassi esposti su basi imbottite') },
  { key: 'camera', label: 'Camera ambientata', hint: 'Camera luminosa con un materasso', ratio: '3 / 2', default: f('camera-ambientata', 'Camera mediterranea con un materasso trapuntato e il Vesuvio sul mare oltre la finestra ad arco') },
  { key: 'consegna', label: 'Consegna', hint: 'Furgone o consegna al piano', ratio: '3 / 2', default: f('consegna-furgone', 'Furgone bianco con le porte aperte e un materasso imballato, in una strada di Napoli con il Vesuvio sullo sfondo') },
  { key: 'guanciali_ambiente', label: 'Guanciali sul letto', hint: 'Guanciali su un letto rifatto', ratio: '3 / 2', default: f('guanciali-gruppo', 'Quattro guanciali bianchi su un letto rifatto con lenzuola color avorio') },
  { key: 'testata_materasso', label: 'Testata: materassi', hint: 'Dettaglio d’atmosfera, formato molto largo', ratio: '21 / 9', default: f('testata-materassi', 'Dettaglio della trapuntatura di un materasso con bordino blu') },
  { key: 'testata_rete', label: 'Testata: reti', hint: 'Dettaglio d’atmosfera, formato molto largo', ratio: '21 / 9', default: f('testata-reti', 'Rete a doghe in legno con telaio scuro su un parquet') },
  { key: 'testata_guanciale', label: 'Testata: guanciali', hint: 'Dettaglio d’atmosfera, formato molto largo', ratio: '21 / 9', default: f('testata-guanciali', 'Due guanciali trapuntati con bordino blu su un letto') },
];

/** Diapositive dell'apertura, in ordine. "hero_napoli" entra per prima quando viene caricata. */
export const HERO_SLIDES = ['hero_napoli', 'camera', 'consegna', 'fabbrica_panoramica', 'showroom'];
export const HERO_CAPTIONS = {
  hero_napoli: 'Napoli e il suo golfo',
  camera: 'Una camera con vista sul Vesuvio',
  consegna: 'Dalla fabbrica a casa tua, anche a Napoli',
  fabbrica_panoramica: 'Prodotti a Casoria dal 1986',
  showroom: 'Vieni a provarli nel nostro showroom',
};

/** Spazi immagine dei prodotti, per categoria: cosa fotografare per ogni scheda. */
export const PRODUCT_SLOTS = {
  materasso: [
    { slot: 'hero', label: 'Prodotto in prospettiva 3/4', hint: 'Sfondo neutro, luce morbida' },
    { slot: 'exploded', label: 'Vista esplosa o sezione', hint: 'Strati reali del modello' },
    { slot: 'fabric', label: 'Dettaglio del tessuto', hint: 'Fascia, cuciture, cerniera' },
  ],
  rete: [
    { slot: 'hero', label: 'Rete in prospettiva 3/4', hint: 'Sfondo neutro' },
    { slot: 'extra', label: 'Dettaglio di doghe e piedi', hint: 'Angolo del telaio' },
  ],
  guanciale: [
    { slot: 'hero', label: 'Guanciale in prospettiva', hint: 'Sfondo neutro' },
    { slot: 'fabric', label: 'Dettaglio della fodera', hint: 'Tessuto e cuciture' },
  ],
  topper: [
    { slot: 'hero', label: 'Topper in prospettiva', hint: 'Sfondo neutro' },
    { slot: 'fabric', label: 'Dettaglio del rivestimento', hint: 'Cerniera e tessuto' },
  ],
};
