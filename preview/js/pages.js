// Pagine informative, legali e guide. Ogni pagina ha un URL canonico, titolo e descrizione
// per i motori di ricerca, un H1 e il testo. I fatti vengono solo dai dati confermati
// (listino, dataset aziendale, indicazioni del titolare del 15/11/2026): niente tempi di
// consegna, certificazioni o garanzie aggiuntive non dichiarate.
import { P, u } from './nav.js';
import { normalizeWhatsAppNumber } from './core/index.js';

export const CONTACT = {
  phone: '+39 366 121 8346',
  phoneHref: 'tel:+393661218346',
  phoneShort: '366 121 8346',
  waDigits: '393661218346',
  waShort: '366 121 8346',
  email: 'fdimaterassi@gmail.com',
  address: 'Via Raffaele Salierno 38, 80026 Casoria (NA)',
  legalName: "MATERASSI D'AUTORE A.V. S.R.L.S.",
  vat: '10456501211',
  rea: 'NA-1107535',
  mapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent('Via Raffaele Salierno 38, 80026 Casoria NA'),
};
const shortNum = (digits) => (digits.startsWith('39') && digits.length === 12 ? `${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}` : '+' + digits);
/** I contatti modificati in Admin › Impostazioni prevalgono sui valori di partenza. */
export function applySettings(st = {}) {
  const w = normalizeWhatsAppNumber(st.whatsapp_number || '');
  if (w.ok) {
    CONTACT.waDigits = w.digits;
    CONTACT.waShort = shortNum(w.digits);
  }
  const ph = normalizeWhatsAppNumber(st.public_phone || '');
  if (ph.ok) {
    CONTACT.phone = st.public_phone;
    CONTACT.phoneHref = 'tel:+' + ph.digits;
    CONTACT.phoneShort = shortNum(ph.digits);
  }
  if (st.contact_email && /@/.test(st.contact_email)) CONTACT.email = st.contact_email;
}
export const waHref = (text = 'Ciao Vesuvio Sleep, vorrei qualche informazione.') => `https://wa.me/${CONTACT.waDigits}?text=${encodeURIComponent(text)}`;

export const PAYMENT_METHODS = [
  {
    id: 'contrassegno',
    label: 'Contrassegno',
    msg: 'contrassegno alla consegna',
    text: 'Paghi alla consegna, direttamente a chi ti porta il materasso.',
  },
  {
    id: 'bonifico',
    label: 'Bonifico bancario',
    msg: 'bonifico bancario',
    text: 'Ti inviamo gli estremi su WhatsApp; dopo il bonifico ricevi poco dopo la bolla di spedizione.',
  },
];

export const LEGAL_UPDATED = '15 novembre 2026';

const L = {
  eco: '/materassi/eco/',
  duo: '/materassi/memory-duo/',
  duoClassic: '/materassi/memory-duo-classic/',
  trio: '/materassi/memory-trio/',
  p1600: '/materassi/pocket-1600/',
  pocket: '/materassi/pocket-3000-elite/',
  flex: '/reti/rete-flex/',
  strong: '/reti/rete-strong/',
  topper: '/topper/topper-memory-cloud-5/',
};
const a = (path, text) => `<a href="${u(path)}">${text}</a>`;
const ext = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
const mail = () => `<a href="mailto:${CONTACT.email}">${CONTACT.email}</a>`;
const tel = () => `<a href="${CONTACT.phoneHref}">${CONTACT.phoneShort}</a>`;
const wa = (t = 'WhatsApp') => ext(waHref(), t);
const toc = (items) => `<nav class="toc" aria-label="In questa pagina"><p>In questa pagina</p><ol>${items.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('')}</ol></nav>`;
const sec = (id, title, body) => `<section id="${id}"><h2>${title}</h2>${body}</section>`;

// ------------------------------------------------------------------ FAQ
export const FAQ = [
  {
    q: 'Come si ordina un materasso Vesuvio Sleep?',
    a: () => `Scegli il modello, l'altezza e la misura e aggiungilo al carrello. Nel riepilogo scegli come pagare e invii la richiesta su WhatsApp con un clic: il messaggio contiene articoli, prezzi e un numero di riferimento. Ti rispondiamo noi per confermare disponibilità, consegna e pagamento. Aprire WhatsApp non è ancora un ordine: l'ordine è confermato solo quando te lo confermiamo per iscritto.`,
  },
  {
    q: 'Come si paga?',
    a: () => `In due modi: in <strong>contrassegno</strong>, pagando alla consegna, oppure con <strong>bonifico bancario</strong>: ti mandiamo gli estremi su WhatsApp e, dopo il bonifico, ricevi poco dopo la bolla di spedizione. Sul sito non si paga e non si inseriscono carte. Dettagli nella pagina ${a(P.payments, 'Pagamenti')}.`,
  },
  {
    q: 'Quanto costa la spedizione?',
    a: () => `Niente: la spedizione è gratuita in tutta Italia, isole comprese. Fuori Napoli consegna il corriere, con il tracciamento della spedizione. Tutti i dettagli in ${a(P.shipping, 'Spedizioni e consegna')}.`,
  },
  {
    q: 'Quanto tempo ci vuole?',
    a: () => `I materassi sono prodotti su ordinazione nella nostra fabbrica di Casoria: servono circa 2 giorni di lavorazione prima della spedizione. I tempi del corriere te li indichiamo con la conferma dell'ordine.`,
  },
  {
    q: 'Consegnate a Napoli?',
    a: () => `Sì, a Napoli consegniamo con il nostro furgone: consegna al piano gratuita, ritiro del vecchio materasso e montaggio delle reti. Vedi ${a(P.naples, 'Materassi a Napoli')}.`,
  },
  {
    q: 'Posso provare i materassi prima di comprarli?',
    a: () => `Sì. Fabbrica, esposizione e showroom sono nello stesso posto, in Via Raffaele Salierno 38 a Casoria: lunedì–venerdì 9:00–18:00, sabato 10:00–14:00. ${a(P.showroom, 'Come arrivare')}.`,
  },
  {
    q: 'Fate materassi su misura?',
    a: () => `Sì, fuori misura e altezze personalizzate. Indica prodotto e misure nella pagina ${a(P.quote, 'Materassi su misura')}: ti mandiamo il preventivo su WhatsApp, senza pagamenti anticipati.`,
  },
  {
    q: 'Quali misure sono disponibili?',
    a: () => `Tredici misure standard, dal singolo 80×190 al King Size 180×200, passando per piazza e mezza, francese e matrimoniale. La ${a(P.sizes, 'guida alle misure')} le confronta in scala.`,
  },
  {
    q: 'Il rivestimento è sfoderabile?',
    a: () => `Dipende dal modello: Memory Duo, Pocket 3000 Elite e il Topper Memory Cloud 5 hanno il rivestimento sfoderabile; l'Eco e il Memory Duo Classic no. Lo trovi indicato in ogni scheda prodotto, alla voce Rivestimento.`,
  },
  {
    q: 'Posso restituire il materasso?',
    a: () => `Per le misure standard hai 14 giorni dalla consegna per recedere, senza dover dare una motivazione; le spese di restituzione sono a tuo carico. Il recesso non vale per i prodotti fatti su misura, salvo difetti. Come fare: ${a(P.returns, 'Resi e recesso')}.`,
  },
  {
    q: 'Che garanzia hanno i prodotti?',
    a: () => `Tutti i prodotti hanno la garanzia legale di conformità di 2 anni dalla consegna, prevista dal Codice del Consumo. Come funziona: ${a(P.warranty, 'Garanzia')}.`,
  },
  {
    q: 'Fornite hotel e B&B?',
    a: () => `Sì, anche in grandi quantità e fuori misura, con prezzi su preventivo. Vedi ${a(P.b2b, 'Hotel e B&B')}.`,
  },
  {
    q: 'Come vi contatto?',
    a: () => `Su WhatsApp e al telefono al ${CONTACT.phoneShort}, per email a ${CONTACT.email}, oppure in showroom a Casoria. Tutti i recapiti in ${a(P.contacts, 'Contatti')}.`,
  },
];
const stripTags = (h) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
export const faqForLd = () => FAQ.map((f) => ({ q: f.q, a: stripTags(f.a()) }));

// ------------------------------------------------------------------ testi delle categorie
export const CATEGORY_SEO = {
  materasso: {
    metaTitle: 'Materassi Memory Foam, a molle e in poliuretano',
    description: (from) => `Materassi di fabbrica${from ? ` da ${from}` : ''}: Memory Foam, molle insacchettate e poliuretano in 13 misure, prodotti a Casoria (Napoli). Spedizione gratuita.`,
    html: () => `<h2>Come scegliere tra i nostri materassi</h2>
      <p>La gamma è piccola di proposito: ogni modello ha un carattere preciso. Il ${a(L.eco, 'Vesuvio Eco')} in poliuretano espanso ad alta densità dà un sostegno uniforme e stabile ed è l'unico disponibile in tre altezze, H20, H25 e H30. Il ${a(L.duoClassic, 'Vesuvio Memory Duo Classic')} introduce il Memory Foam con il rivestimento fisso; il ${a(L.duo, 'Vesuvio Memory Duo')} è lo stesso materasso sfoderabile e reversibile, con un lato invernale e uno estivo. Il ${a(L.trio, 'Vesuvio Memory Trio')} porta gli strati di Memory a tre, per 27 cm di altezza.</p>
      <p>Chi cerca un sostegno più deciso, o dorme in due, guarda alle molle insacchettate: il ${a(L.p1600, 'Vesuvio Pocket 1600')} è l'ingresso nella gamma, il ${a(L.pocket, 'Vesuvio Pocket 3000 Elite')} ne ha 3000 e aggiunge uno strato di Memory Foam.</p>
      <p>Se non sai da dove partire, il ${a(P.sleepMatch, 'Sleep Match')} ti propone un modello in poche domande, e la guida ${a('/guide/materasso-memory-molle-o-poliuretano/', 'Memory, molle o poliuretano')} spiega le differenze. Tutti i prezzi sono IVA inclusa e la spedizione è gratuita in Italia. Per letti con misure non standard c'è il ${a(P.quote, 'materasso su misura')}.</p>`,
  },
  rete: {
    metaTitle: 'Reti a doghe in legno con telaio in acciaio',
    description: (from) => `Reti a doghe in legno con telaio in acciaio, piedi inclusi${from ? `, da ${from}` : ''}. Nelle stesse 13 misure dei nostri materassi, spedizione gratuita in Italia e montaggio a Napoli.`,
    html: () => `<h2>Quale rete scegliere</h2>
      <p>Le nostre reti hanno telaio in acciaio e doghe in legno, con i piedi già inclusi. La ${a(L.flex, 'Vesuvio Rete Flex')} distribuisce il carico in modo uniforme; la ${a(L.strong, 'Vesuvio Rete Strong')} ha una struttura rinforzata, per chi cerca un supporto più robusto.</p>
      <p>Sono disponibili nelle stesse misure dei materassi: scegli la rete della stessa misura del materasso. A Napoli la montiamo noi alla consegna.</p>`,
  },
  topper: {
    metaTitle: 'Topper in Memory Foam alto 5 cm',
    description: (from) => `Topper in Memory Foam alto 5 cm, sfoderabile${from ? `, da ${from}` : ''}. In tutte le 13 misure dei nostri materassi, prodotto a Casoria e spedito gratis in Italia.`,
    html: () => `<h2>A cosa serve un topper</h2>
      <p>Il topper si appoggia sopra il materasso e ne cambia l'accoglienza senza sostituirlo. Il ${a(L.topper, 'Vesuvio Topper Memory Cloud 5')} è in Memory Foam, alto 5 cm, con rivestimento sfoderabile, nelle stesse misure dei nostri materassi: scegli la misura del materasso su cui lo appoggerai.</p>`,
  },
};

// ------------------------------------------------------------------ pagine
// photo: chiave di un'immagine del sito (slots.js) per la testata
export const PAGES = {
  [P.contacts]: {
    nav: 'Contatti',
    h1: 'Contatti',
    metaTitle: 'Contatti: WhatsApp, telefono e showroom a Casoria',
    description: `Scrivi a Vesuvio Sleep su WhatsApp o chiama il ${CONTACT.phoneShort}, email ${CONTACT.email}. Showroom e fabbrica in Via Raffaele Salierno 38, Casoria (Napoli).`,
    lead: 'Per ordini, preventivi su misura, hotel e B&B: rispondiamo noi, dalla fabbrica.',
    photo: 'showroom',
    type: 'contact',
    body: () => `<div class="contact-cards">
        <a class="contact-card" href="${waHref()}" target="_blank" rel="noopener"><span class="contact-card__k">WhatsApp</span><strong>${CONTACT.waShort}</strong><span>Il modo più veloce: ordini, preventivi, informazioni</span></a>
        <a class="contact-card" href="${CONTACT.phoneHref}"><span class="contact-card__k">Telefono</span><strong>${CONTACT.phoneShort}</strong><span>Negli orari dello showroom</span></a>
        <a class="contact-card contact-card--mail" href="mailto:${CONTACT.email}"><span class="contact-card__k">Email</span><strong>${CONTACT.email}</strong><span>Per documenti, fatture e richieste scritte</span></a>
      </div>
      ${sec('showroom-c', 'Showroom e fabbrica', `<p>Fabbrica, esposizione e showroom sono nello stesso posto: puoi provare i materassi e parlare con chi li produce.</p>
        <p><strong>Vesuvio Sleep</strong><br>Via Raffaele Salierno 38<br>80026 Casoria (NA)</p>
        <dl class="hours"><dt>Lunedì–venerdì</dt><dd>09:00–18:00</dd><dt>Sabato</dt><dd>10:00–14:00</dd><dt>Domenica</dt><dd>Chiuso</dd></dl>
        <p class="btn-row"><a class="btn btn--primary" href="${CONTACT.mapsUrl}" target="_blank" rel="noopener">Indicazioni stradali</a></p>`)}
      ${sec('dati', 'Dati aziendali', `<p>${CONTACT.legalName}<br>Sede: ${CONTACT.address}<br>Partita IVA ${CONTACT.vat} · REA ${CONTACT.rea}</p>`)}`,
  },

  [P.faq]: {
    nav: 'Domande frequenti',
    h1: 'Domande frequenti',
    metaTitle: 'Domande frequenti: ordini, pagamenti, consegna e resi',
    description: 'Come si ordina, come si paga (contrassegno o bonifico), spedizione gratuita, consegna a Napoli, misure, resi e garanzia: le risposte di Vesuvio Sleep.',
    lead: 'Ordini, pagamenti, consegna, resi. Se non trovi la risposta, scrivici su WhatsApp.',
    type: 'faq',
    body: () => `<div class="faq">${FAQ.map((f, i) => `<details class="faq__item" ${i === 0 ? 'open' : ''}><summary><h2>${f.q}</h2></summary><div class="faq__a"><p>${f.a()}</p></div></details>`).join('')}</div>`,
  },

  [P.about]: {
    nav: 'Chi siamo',
    h1: 'Una fabbrica di materassi a Casoria, dal 1986',
    metaTitle: 'Chi siamo: fabbrica di materassi a Casoria dal 1986',
    description: 'Vesuvio Sleep produce materassi a Casoria, alle porte di Napoli, dal 1986 e li vende direttamente, senza intermediari: fabbrica, esposizione e showroom nello stesso posto.',
    lead: 'Produciamo materassi alle porte di Napoli e li vendiamo direttamente, a prezzo di fabbrica.',
    photo: 'fabbrica_panoramica',
    body: () => `${sec('fabbrica', 'Fabbrica, esposizione e showroom nello stesso posto', `<p>Vesuvio Sleep è il marchio di ${CONTACT.legalName}. Dal 1986 produciamo materassi a Casoria, in Via Raffaele Salierno 38: qui tagliamo, assembliamo e cuciamo, e qui c'è lo showroom dove puoi provarli.</p>
        <p>Vendiamo direttamente, senza intermediari. Per questo il prezzo che vedi è il prezzo di fabbrica, IVA inclusa, e la spedizione in Italia è gratuita.</p>`)}
      ${sec('cosa', 'Cosa produciamo', `<p>${a('/materassi/', 'Materassi')} in poliuretano espanso, Memory Foam e molle insacchettate, ${a('/reti/', 'reti a doghe')} con telaio in acciaio e ${a('/topper/', 'topper in Memory Foam')}. Ogni materasso è prodotto su ordinazione, in 13 misure standard; su richiesta realizziamo ${a(P.quote, 'fuori misura e altezze personalizzate')}.</p>`)}
      ${sec('come', 'Come lavoriamo', `<p>Gli ordini arrivano su WhatsApp e li confermiamo noi, uno per uno. Paghi in contrassegno o con bonifico, mai online. A Napoli consegniamo con il nostro furgone, al piano e con il ritiro del vecchio materasso; nel resto d'Italia spediamo con corriere.</p>
        <p>Lavoriamo anche per ${a(P.b2b, 'hotel, B&B e strutture ricettive')}.</p>`)}`,
  },

  [P.b2b]: {
    nav: 'Hotel e B&B',
    h1: 'Materassi per hotel, B&B e strutture ricettive',
    metaTitle: 'Materassi per hotel e B&B dalla fabbrica',
    description: 'Forniture di materassi, reti e topper per hotel, B&B e strutture ricettive, anche fuori misura e in grandi quantità, direttamente dalla fabbrica di Casoria (Napoli).',
    lead: 'Forniture dirette dalla fabbrica, anche in grandi quantità e fuori misura.',
    photo: 'camera',
    body: () => `${sec('fornitura', 'Una fornitura senza intermediari', `<p>Produciamo noi i materassi, a Casoria: per una struttura ricettiva vuol dire trattare direttamente con chi li fa, su quantità, misure e tempi.</p>
        <ul class="ticks"><li>Materassi, reti e topper della nostra gamma, nelle 13 misure standard</li><li>Fuori misura e altezze personalizzate per letti particolari</li><li>Grandi quantità, con un unico referente</li><li>A Napoli consegna con il nostro furgone e ritiro dei materassi usati</li></ul>`)}
      ${sec('preventivo', 'Come chiedere un preventivo', `<p>Per le strutture i prezzi sono su preventivo. Indica il numero di camere, le misure dei letti e i modelli che ti interessano: puoi farlo dal modulo ${a(P.quote + '?hotel=1', 'Materassi su misura')} (spunta "È per un hotel, un B&B o una struttura ricettiva") oppure scriverci direttamente.</p>
        <p>Se la struttura ha requisiti specifici sui materiali, indicali nella richiesta: ti diciamo con precisione cosa possiamo fornire.</p>
        <p class="btn-row"><a class="btn btn--primary" href="${u(P.quote + '?hotel=1')}">Richiedi un preventivo</a><a class="btn btn--ghost" href="${waHref('Ciao Vesuvio Sleep, vorrei un preventivo per una struttura ricettiva.')}" target="_blank" rel="noopener">Scrivici su WhatsApp</a></p>`)}`,
  },

  [P.naples]: {
    nav: 'Materassi a Napoli',
    h1: 'Materassi a Napoli, dalla fabbrica di Casoria',
    metaTitle: 'Materassi a Napoli: fabbrica e showroom a Casoria',
    description: 'Materassi di fabbrica a Napoli: showroom a Casoria, consegna con il nostro furgone, al piano gratuita, ritiro del vecchio materasso e montaggio delle reti.',
    lead: 'Li produciamo a Casoria, alle porte di Napoli, e te li portiamo noi.',
    photo: 'consegna',
    type: 'local',
    body: () => `${sec('consegna-na', 'A Napoli consegniamo noi', `<p>A Napoli non usiamo il corriere: consegniamo con il nostro furgone. Il servizio comprende:</p>
        <ul class="ticks"><li>consegna al piano gratuita</li><li>ritiro del vecchio materasso</li><li>montaggio delle reti</li></ul>
        <p>Come nel resto d'Italia, la spedizione è gratuita. Paghi alla consegna in contrassegno oppure con bonifico.</p>`)}
      ${sec('showroom-na', 'Provali in showroom', `<p>Lo showroom è nella fabbrica, in Via Raffaele Salierno 38 a Casoria: aperto dal lunedì al venerdì 9:00–18:00 e il sabato 10:00–14:00. Puoi provare i materassi e scegliere con chi li produce. ${a(P.showroom, 'Come arrivare')}.</p>`)}
      ${sec('gamma-na', 'I materassi più richiesti', `<p>Il ${a(L.eco, 'Vesuvio Eco')} in poliuretano, in tre altezze; il ${a(L.duo, 'Vesuvio Memory Duo')}, reversibile estate-inverno; il ${a(L.pocket, 'Vesuvio Pocket 3000 Elite')} con 3000 molle insacchettate e Memory Foam. Completa il letto con una ${a('/reti/', 'rete a doghe')}: a Napoli la montiamo noi.</p>`)}`,
  },

  [P.shipping]: {
    nav: 'Spedizioni e consegna',
    h1: 'Spedizioni e consegna',
    metaTitle: 'Spedizioni e consegna gratuite in tutta Italia',
    description: 'Spedizione gratuita in tutta Italia, isole comprese, con tracciamento. A Napoli consegna al piano, ritiro dell’usato e montaggio reti.',
    lead: 'Gratuita in tutta Italia, isole comprese.',
    photo: 'consegna',
    body: () => `${sec('costi', 'Quanto costa', `<p>La spedizione è <strong>gratuita in tutta Italia, isole comprese</strong>. Non ci sono supplementi per le isole. Al momento spediamo solo in Italia.</p>`)}
      ${sec('tempi', 'Tempi', `<p>I materassi sono prodotti su ordinazione: servono circa <strong>2 giorni di lavorazione</strong> prima della spedizione. Con la conferma dell'ordine ti indichiamo i tempi di consegna.</p>`)}
      ${sec('italia', 'Nel resto d’Italia: corriere', `<p>Fuori Napoli consegna il corriere, con il <strong>tracciamento</strong> della spedizione. Se paghi con bonifico, poco dopo il pagamento ricevi la bolla di spedizione.</p>`)}
      ${sec('napoli', 'A Napoli: il nostro furgone', `<p>A Napoli consegniamo noi, con il nostro furgone: <strong>consegna al piano gratuita</strong>, <strong>ritiro del vecchio materasso</strong> e <strong>montaggio delle reti</strong>. ${a(P.naples, 'Materassi a Napoli')}.</p>`)}
      ${sec('ricevere', 'Al momento della consegna', `<p>Controlla che l'imballo sia integro e che i colli corrispondano. Se l'imballo è danneggiato, accetta la merce con riserva specifica sul documento del corriere e scrivici subito su ${wa()} o a ${mail()} con qualche foto.</p>`)}`,
  },

  [P.payments]: {
    nav: 'Pagamenti',
    h1: 'Pagamenti',
    metaTitle: 'Pagamenti: contrassegno o bonifico bancario',
    description: 'Da Vesuvio Sleep paghi in contrassegno alla consegna oppure con bonifico bancario. Nessun pagamento sul sito: confermi l’ordine con noi su WhatsApp.',
    lead: 'Contrassegno o bonifico. Sul sito non si paga e non si inseriscono carte.',
    body: () => `${sec('come', 'Come funziona', `<p>Invii il riepilogo del carrello su WhatsApp, indicando come preferisci pagare. Ti rispondiamo per confermare disponibilità e consegna: l'ordine è confermato solo con la nostra conferma scritta. Tutti i prezzi sono in euro, IVA inclusa.</p>`)}
      ${sec('contrassegno', 'Contrassegno', `<p>Paghi al momento della consegna, a chi ti porta la merce: il corriere nel resto d'Italia, il nostro incaricato a Napoli. Non paghi nulla in anticipo.</p>`)}
      ${sec('bonifico', 'Bonifico bancario', `<p>Ti inviamo gli estremi per il bonifico su WhatsApp, insieme alla conferma dell'ordine. Dopo il bonifico ricevi poco dopo la bolla di spedizione.</p>`)}
      ${sec('online', 'Pagamenti online', `<p>Sul sito non ci sono pagamenti online: non ti chiediamo mai numeri di carta, né sul sito né su WhatsApp. Se qualcuno te li chiede a nome di Vesuvio Sleep, non è un nostro messaggio: chiamaci al ${tel()}.</p>`)}`,
  },

  [P.returns]: {
    nav: 'Resi e recesso',
    h1: 'Resi e diritto di recesso',
    metaTitle: 'Resi e diritto di recesso entro 14 giorni',
    description: 'Hai 14 giorni dalla consegna per recedere dall’acquisto delle misure standard. Come comunicarlo, come restituire il prodotto e quando arriva il rimborso. Modulo di recesso.',
    lead: 'Per le misure standard hai 14 giorni dalla consegna per ripensarci.',
    legal: true,
    body: () => `${toc([['chi', 'Chi può recedere'], ['esclusioni', 'Quando non si applica'], ['come', 'Come comunicarlo'], ['restituzione', 'Come restituire il prodotto'], ['rimborso', 'Rimborso'], ['modulo', 'Modulo di recesso']])}
      ${sec('chi', 'Chi può recedere', `<p>Se hai acquistato come consumatore (per uso personale, non per un'attività), hai diritto di recedere dal contratto entro <strong>14 giorni</strong> senza dover dare alcuna motivazione, come previsto dagli articoli 52 e seguenti del Codice del Consumo (D.lgs. 206/2005). Il termine decorre dal giorno in cui tu, o una persona da te indicata diversa dal corriere, ricevi il prodotto. Se un ordine comprende più prodotti consegnati separatamente, decorre dalla consegna dell'ultimo.</p>`)}
      ${sec('esclusioni', 'Quando non si applica', `<p>Il diritto di recesso è escluso per i beni <strong>confezionati su misura o chiaramente personalizzati</strong> (art. 59, lettera c, del Codice del Consumo): materassi fuori misura, altezze personalizzate e ogni prodotto realizzato su tue specifiche. Restano comunque la ${a(P.warranty, 'garanzia legale')} e i diritti per i difetti.</p>
        <p>I prodotti nelle misure standard del catalogo, anche se prodotti su ordinazione, si possono restituire.</p>
        <p>Il diritto di recesso non spetta a chi acquista per la propria attività (ad esempio hotel e B&B con partita IVA).</p>`)}
      ${sec('come', 'Come comunicarlo', `<p>Prima della scadenza dei 14 giorni inviaci una dichiarazione esplicita della tua decisione di recedere, indicando il riferimento dell'ordine: per email a ${mail()} oppure su ${wa()}. Puoi usare il modulo qui sotto, ma non è obbligatorio. Ti confermiamo la ricezione senza ritardo.</p>`)}
      ${sec('restituzione', 'Come restituire il prodotto', `<p>Devi restituire il prodotto entro 14 giorni dalla comunicazione del recesso, all'indirizzo: ${CONTACT.legalName}, ${CONTACT.address}. <strong>Le spese di restituzione sono a tuo carico.</strong> Ti indichiamo noi come imballarlo e, se ti è utile, come organizzare il ritiro.</p>
        <p>Il prodotto va restituito integro e protetto. Rispondi della diminuzione di valore dovuta a un uso diverso da quello necessario per verificarne natura e caratteristiche: puoi provarlo come faresti in negozio, non usarlo.</p>`)}
      ${sec('rimborso', 'Rimborso', `<p>Ti rimborsiamo l'importo pagato, compresi gli eventuali costi di consegna standard, entro 14 giorni dal giorno in cui riceviamo la tua comunicazione di recesso. Possiamo sospendere il rimborso finché non riceviamo il prodotto o la prova della spedizione.</p>
        <p>Rimborsiamo con lo stesso mezzo di pagamento usato: con bonifico, sullo stesso conto. Se hai pagato in contrassegno, ti rimborsiamo con bonifico sull'IBAN che ci indichi. Il rimborso non ha costi per te.</p>`)}
      ${sec('modulo', 'Modulo di recesso', `<p>Compila e inviaci questo modulo solo se vuoi recedere dal contratto.</p>
        <div class="legal-form"><p>Destinatario: ${CONTACT.legalName}, ${CONTACT.address}, ${CONTACT.email}</p>
        <p>Con la presente io/noi (*) notifico/notifichiamo (*) il recesso dal mio/nostro (*) contratto di vendita dei seguenti beni:</p>
        <p>Riferimento dell'ordine: ____________________</p>
        <p>Ordinato il (*) / ricevuto il (*): ____________________</p>
        <p>Nome del/dei consumatore/i: ____________________</p>
        <p>Indirizzo del/dei consumatore/i: ____________________</p>
        <p>Firma del/dei consumatore/i (solo se il modulo è inviato su carta): ____________________</p>
        <p>Data: ____________________</p>
        <p class="small">(*) Cancellare la dicitura inutile.</p></div>
        <p><button class="btn btn--ghost btn--sm" type="button" data-act="print">Stampa il modulo</button></p>`)}
      <p class="small muted">Ultimo aggiornamento: ${LEGAL_UPDATED}.</p>`,
  },

  [P.warranty]: {
    nav: 'Garanzia',
    h1: 'Garanzia legale di conformità',
    metaTitle: 'Garanzia legale di 2 anni sui materassi',
    description: 'Tutti i prodotti Vesuvio Sleep hanno la garanzia legale di conformità di 2 anni prevista dal Codice del Consumo. Cosa copre e come segnalare un difetto.',
    lead: 'Due anni dalla consegna, come prevede il Codice del Consumo.',
    legal: true,
    body: () => `${toc([['cosa', 'Cosa copre'], ['durata', 'Durata e termini'], ['rimedi', 'Cosa ti spetta'], ['segnalare', 'Come segnalare un difetto']])}
      ${sec('cosa', 'Cosa copre', `<p>Se hai acquistato come consumatore, tutti i prodotti godono della garanzia legale di conformità prevista dagli articoli 128 e seguenti del Codice del Consumo (D.lgs. 206/2005). Copre i difetti di conformità: il prodotto deve corrispondere alla descrizione, avere le qualità dichiarate ed essere idoneo all'uso.</p>
        <p>Non copre i danni dovuti a uso improprio, incidenti, mancato rispetto delle indicazioni di cura riportate in etichetta, né la normale usura.</p>`)}
      ${sec('durata', 'Durata e termini', `<p>La garanzia dura <strong>2 anni dalla consegna</strong>. Si presume, salvo prova contraria, che i difetti che si manifestano entro un anno dalla consegna esistessero già al momento della consegna. Il difetto va segnalato entro due mesi da quando lo scopri.</p>`)}
      ${sec('rimedi', 'Cosa ti spetta', `<p>In caso di difetto hai diritto, senza spese, alla riparazione o alla sostituzione del prodotto. Se non sono possibili o non avvengono in tempi ragionevoli, puoi chiedere una riduzione del prezzo o la risoluzione del contratto. Le spese di spedizione per i prodotti difettosi sono a nostro carico.</p>`)}
      ${sec('segnalare', 'Come segnalare un difetto', `<p>Scrivici su ${wa()} o a ${mail()} con il riferimento dell'ordine, una breve descrizione e qualche foto. Ti rispondiamo con la soluzione.</p>
        <p>Chi acquista per la propria attività è soggetto alla garanzia prevista dal Codice civile, secondo le condizioni concordate.</p>`)}
      <p class="small muted">Ultimo aggiornamento: ${LEGAL_UPDATED}.</p>`,
  },

  [P.terms]: {
    nav: 'Condizioni di vendita',
    h1: 'Condizioni generali di vendita',
    metaTitle: 'Condizioni generali di vendita',
    description: 'Condizioni generali di vendita di Vesuvio Sleep (Materassi d’Autore A.V. S.R.L.S.): ordini via WhatsApp, prezzi, pagamenti, consegna, recesso, garanzia e controversie.',
    lead: 'Le regole delle vendite a distanza di Vesuvio Sleep.',
    legal: true,
    body: () => `${toc([['venditore', 'Venditore'], ['ambito', 'Ambito'], ['prodotti', 'Prodotti e prezzi'], ['contratto', 'Come si conclude il contratto'], ['pagamento', 'Pagamento'], ['consegna', 'Consegna'], ['misura', 'Prodotti su misura'], ['recesso', 'Recesso'], ['garanzia', 'Garanzia'], ['dati', 'Dati personali'], ['controversie', 'Reclami e controversie'], ['legge', 'Legge applicabile']])}
      ${sec('venditore', '1. Venditore', `<p>I prodotti presentati sul sito sono venduti da ${CONTACT.legalName}, con sede in ${CONTACT.address}, Partita IVA ${CONTACT.vat}, REA ${CONTACT.rea}, che opera con il marchio Vesuvio Sleep (di seguito "Vesuvio Sleep"). Contatti: telefono e WhatsApp ${CONTACT.phoneShort}, email ${CONTACT.email}.</p>`)}
      ${sec('ambito', '2. Ambito', `<p>Queste condizioni regolano le vendite a distanza concluse a partire dal sito. Se acquisti come consumatore si applicano anche le norme del Codice del Consumo (D.lgs. 206/2005), che prevalgono su qualsiasi clausola meno favorevole. Le forniture a imprese, hotel e strutture ricettive seguono le condizioni del preventivo accettato.</p>`)}
      ${sec('prodotti', '3. Prodotti e prezzi', `<p>Le caratteristiche dei prodotti sono descritte nelle schede. Le immagini servono a rappresentare il prodotto; colori e resa possono variare leggermente a seconda dello schermo. I prezzi sono in euro e comprendono l'IVA. La spedizione in Italia è gratuita. Il prezzo applicato è quello indicato nella nostra conferma d'ordine.</p>`)}
      ${sec('contratto', '4. Come si conclude il contratto', `<p>Il riepilogo che invii su WhatsApp dal sito è una richiesta d'ordine, non un ordine concluso. Il contratto si conclude quando Vesuvio Sleep ti invia la conferma scritta (su WhatsApp o per email) con prodotti, prezzo totale, modalità di pagamento e di consegna. Fino ad allora nessuna delle due parti è vincolata. Conserva la conferma: è il riepilogo del contratto.</p>`)}
      ${sec('pagamento', '5. Pagamento', `<p>Puoi pagare in contrassegno, al momento della consegna, oppure con bonifico bancario sugli estremi indicati nella conferma d'ordine. Nel caso del bonifico, la merce viene spedita dopo il pagamento e ricevi la bolla di spedizione. Sul sito non si effettuano pagamenti. ${a(P.payments, 'Dettagli sui pagamenti')}.</p>`)}
      ${sec('consegna', '6. Consegna', `<p>Consegniamo in Italia, isole comprese, senza costi di spedizione. I materassi sono prodotti su ordinazione; i tempi indicativi sono comunicati con la conferma d'ordine. A Napoli consegniamo con il nostro furgone, con consegna al piano, ritiro dell'usato e montaggio delle reti. Il rischio di perdita o danneggiamento passa a te quando ricevi il prodotto. ${a(P.shipping, 'Spedizioni e consegna')}.</p>`)}
      ${sec('misura', '7. Prodotti su misura', `<p>I prodotti fuori misura o con altezze personalizzate sono realizzati su tue specifiche, in base a un preventivo che accetti espressamente. Controlla con attenzione le misure prima della conferma: per questi prodotti il diritto di recesso è escluso, salvo difetti.</p>`)}
      ${sec('recesso', '8. Recesso', `<p>Il consumatore ha 14 giorni dalla consegna per recedere dall'acquisto dei prodotti in misura standard. Le spese di restituzione sono a carico del consumatore. Condizioni, esclusioni e modulo: ${a(P.returns, 'Resi e recesso')}.</p>`)}
      ${sec('garanzia', '9. Garanzia', `<p>Si applica la garanzia legale di conformità di 2 anni prevista dal Codice del Consumo. ${a(P.warranty, 'Come funziona')}.</p>`)}
      ${sec('dati', '10. Dati personali', `<p>I dati personali sono trattati come descritto nell'${a(P.privacy, 'informativa sulla privacy')}.</p>`)}
      ${sec('controversie', '11. Reclami e controversie', `<p>Per qualsiasi reclamo scrivici a ${CONTACT.email} o su WhatsApp: rispondiamo nel più breve tempo possibile.</p>
        <p>Il consumatore può ricorrere alle procedure di risoluzione extragiudiziale delle controversie (ADR) presso gli organismi iscritti nell'elenco tenuto dal Ministero delle Imprese e del Made in Italy, consultabile sul sito del Ministero. Resta fermo il diritto di rivolgersi al giudice ordinario.</p>
        <p>Per le controversie con un consumatore è competente il giudice del luogo di residenza o domicilio del consumatore.</p>`)}
      ${sec('legge', '12. Legge applicabile', `<p>Il contratto è regolato dalla legge italiana, fatte salve le norme più favorevoli al consumatore. Il contratto è concluso in lingua italiana.</p>`)}
      <p class="small muted">Ultimo aggiornamento: ${LEGAL_UPDATED}.</p>`,
  },

  [P.privacy]: {
    nav: 'Privacy',
    h1: 'Informativa sulla privacy',
    metaTitle: 'Informativa sulla privacy',
    description: 'Come Vesuvio Sleep tratta i dati di chi visita il sito, chiede un preventivo o ordina: finalità, basi giuridiche, conservazione e diritti.',
    lead: 'Raccogliamo solo i dati che servono a risponderti e a consegnare.',
    legal: true,
    body: () => `${toc([['titolare', 'Titolare'], ['quali', 'Quali dati trattiamo'], ['perche', 'Finalità e basi giuridiche'], ['terzi', 'Servizi di terzi'], ['destinatari', 'A chi li comunichiamo'], ['conservazione', 'Per quanto tempo'], ['diritti', 'I tuoi diritti']])}
      ${sec('titolare', 'Titolare del trattamento', `<p>${CONTACT.legalName}, ${CONTACT.address}, Partita IVA ${CONTACT.vat}. Per ogni richiesta sulla privacy: ${mail()}, telefono ${tel()}.</p>`)}
      ${sec('quali', 'Quali dati trattiamo', `<p><strong>Navigazione.</strong> Come ogni sito, i server che ospitano il sito registrano dati tecnici delle visite (indirizzo IP, data e ora, pagina richiesta, tipo di browser), usati per far funzionare il sito e per la sua sicurezza.</p>
        <p><strong>Carrello e preferenze.</strong> Il carrello e alcune impostazioni sono salvati solo nel tuo browser (memoria locale): non ci vengono inviati finché non li mandi tu. Le risposte allo Sleep Match restano nella pagina e non vengono salvate.</p>
        <p><strong>Richieste dal sito.</strong> Quando invii un riepilogo o una richiesta di preventivo, registriamo prodotti, misure, prezzi, note che scrivi e un numero di riferimento. Il sito non ti chiede nome, telefono o indirizzo.</p>
        <p><strong>Comunicazioni e ordini.</strong> Se ci scrivi su WhatsApp, per email o ci chiami, trattiamo i dati che ci fornisci: nome, numero di telefono, indirizzo di consegna, eventuali dati per la fattura e il contenuto dei messaggi.</p>`)}
      ${sec('perche', 'Finalità e basi giuridiche', `<ul><li>Rispondere alle tue richieste, preparare preventivi, gestire ordini, consegne, resi e garanzia: esecuzione di un contratto o di misure precontrattuali (art. 6.1.b GDPR).</li><li>Adempiere agli obblighi fiscali e contabili: obbligo di legge (art. 6.1.c).</li><li>Proteggere il sito da abusi e difendere i nostri diritti: legittimo interesse (art. 6.1.f).</li></ul>
        <p>Non usiamo i tuoi dati per pubblicità, non li vendiamo e non facciamo profilazione. Non prendiamo decisioni basate unicamente su trattamenti automatizzati.</p>`)}
      ${sec('terzi', 'Servizi di terzi', `<p><strong>WhatsApp.</strong> Se scegli di inviare la richiesta su WhatsApp, lasci il nostro sito e usi il servizio di WhatsApp (Meta), che tratta i dati secondo la propria informativa. Puoi sempre scegliere email o telefono.</p>
        <p><strong>Caratteri tipografici.</strong> Il sito carica i caratteri dal servizio Google Fonts: il tuo browser si collega ai server di Google, che ricevono il tuo indirizzo IP.</p>
        <p><strong>Mappe.</strong> I pulsanti "Indicazioni stradali" aprono Google Maps o Apple Mappe in una nuova pagina: nel nostro sito non c'è nessuna mappa incorporata.</p>
        <p>Questi servizi possono trasferire dati fuori dall'Unione Europea, in particolare negli Stati Uniti, sulla base del Data Privacy Framework UE-USA o di clausole contrattuali standard.</p>`)}
      ${sec('destinatari', 'A chi li comunichiamo', `<p>Solo a chi ci serve per fornirti il servizio: corrieri per la consegna, banca per i pagamenti, consulenti fiscali, fornitori tecnici del sito (hosting). Agiscono come responsabili del trattamento o come titolari autonomi. Non diffondiamo i tuoi dati.</p>`)}
      ${sec('conservazione', 'Per quanto tempo', `<p>I dati di ordini e fatture sono conservati per 10 anni, come prevede la legge. Le richieste e i preventivi che non diventano ordini sono conservati per 12 mesi. I dati di navigazione sono conservati per il tempo strettamente necessario alla sicurezza del sito.</p>`)}
      ${sec('diritti', 'I tuoi diritti', `<p>Puoi chiedere in qualsiasi momento l'accesso ai tuoi dati, la rettifica, la cancellazione, la limitazione del trattamento, la portabilità e opporti al trattamento basato sul legittimo interesse (artt. 15–22 GDPR), scrivendo a ${mail()}. Hai il diritto di proporre reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).</p>`)}
      <p>Per gli strumenti di memorizzazione usati dal sito vedi la ${a(P.cookies, 'cookie policy')}.</p>
      <p class="small muted">Ultimo aggiornamento: ${LEGAL_UPDATED}.</p>`,
  },

  [P.cookies]: {
    nav: 'Cookie',
    h1: 'Cookie policy',
    metaTitle: 'Cookie policy',
    description: 'Il sito Vesuvio Sleep usa solo strumenti tecnici necessari (carrello e preferenze salvati nel browser): nessun cookie di profilazione o di statistica di terze parti.',
    lead: 'Solo strumenti tecnici: nessuna profilazione, nessuna pubblicità.',
    legal: true,
    body: () => `${sec('cosa', 'Cosa usa il sito', `<p>Il sito non usa cookie di profilazione, pubblicitari o di statistica. Usa solo strumenti tecnici, necessari a farlo funzionare, che salvano dati nel tuo browser:</p>
        <div class="table-scroll"><table class="size-table"><thead><tr><th>Nome</th><th>Tipo</th><th>A cosa serve</th><th>Durata</th></tr></thead><tbody>
        <tr><td>vs-cart-v1</td><td>Memoria locale</td><td>Ricorda gli articoli nel carrello</td><td>Finché non svuoti il carrello o i dati del browser</td></tr>
        <tr><td>vs-preview-db-v1</td><td>Memoria locale</td><td>Copia del catalogo per caricare le pagine più velocemente</td><td>Finché non cancelli i dati del browser</td></tr>
        <tr><td>vs-review</td><td>Memoria di sessione</td><td>Collega il riepilogo al suo numero di riferimento</td><td>Fino alla chiusura della scheda</td></tr>
        </tbody></table></div>
        <p>Per gli strumenti tecnici non serve il consenso, per questo il sito non mostra un banner. Se in futuro aggiungeremo strumenti di statistica o di marketing, ti chiederemo prima il consenso.</p>`)}
      ${sec('terzi', 'Servizi esterni', `<p>Il sito carica i caratteri tipografici da Google Fonts, che riceve l'indirizzo IP del tuo browser. I collegamenti a WhatsApp, Google Maps e Apple Mappe aprono servizi esterni, con le loro regole sui cookie. Vedi l'${a(P.privacy, 'informativa sulla privacy')}.</p>`)}
      ${sec('gestire', 'Come cancellarli', `<p>Puoi cancellare in qualsiasi momento i dati salvati dal sito dalle impostazioni del browser (cronologia o dati dei siti). In quel caso il carrello si svuota.</p>`)}
      <p class="small muted">Ultimo aggiornamento: ${LEGAL_UPDATED}.</p>`,
  },

  [P.guides]: {
    nav: 'Guide',
    h1: 'Guide per scegliere il materasso',
    metaTitle: 'Guide: come scegliere materasso, misura e tecnologia',
    description: 'Come scegliere il materasso giusto, le differenze tra Memory Foam, molle insacchettate e poliuretano, e le misure dei materassi spiegate dalla fabbrica Vesuvio Sleep.',
    lead: 'Quello che diciamo ai clienti in showroom, scritto.',
    type: 'guides',
    body: () => `<div class="guide-list">
      <a class="guide-card" href="${u('/guide/come-scegliere-il-materasso/')}"><h2>Come scegliere il materasso</h2><p>Posizione nel sonno, corporatura, chi dorme in due, caldo e freddo: i criteri che contano davvero.</p><span>Leggi la guida</span></a>
      <a class="guide-card" href="${u('/guide/materasso-memory-molle-o-poliuretano/')}"><h2>Memory, molle o poliuretano?</h2><p>Le tre tecnologie a confronto, con pregi e limiti di ciascuna.</p><span>Leggi la guida</span></a>
      <a class="guide-card" href="${u(P.sizes)}"><h2>Le misure dei materassi</h2><p>Singolo, piazza e mezza, francese, matrimoniale, King Size: le 13 misure in scala.</p><span>Apri la guida</span></a>
    </div>`,
  },

  '/guide/come-scegliere-il-materasso/': {
    nav: 'Come scegliere il materasso',
    parent: [P.guides, 'Guide'],
    h1: 'Come scegliere il materasso',
    metaTitle: 'Come scegliere il materasso: la guida della fabbrica',
    description: 'Come scegliere il materasso giusto: posizione nel sonno, corporatura, rigidità, chi dorme in due, caldo e freddo, misura e altezza. La guida di Vesuvio Sleep.',
    lead: 'I criteri che usiamo in showroom, in ordine di importanza.',
    type: 'article',
    body: () => `${toc([['posizione', 'Come dormi'], ['corporatura', 'Corporatura e sostegno'], ['coppia', 'Se dormite in due'], ['temperatura', 'Caldo o freddo'], ['misura', 'Misura e altezza'], ['provare', 'Provarlo'], ['rete', 'Non dimenticare la rete']])}
      <p>Non esiste il materasso migliore in assoluto: esiste quello giusto per come dormi tu. Questi sono i criteri da considerare, nell'ordine in cui li valutiamo con i clienti in showroom.</p>
      ${sec('posizione', '1. Come dormi', `<p>Chi dorme <strong>sul fianco</strong> carica spalle e fianchi: in genere sta meglio con una superficie che accoglie, come il Memory Foam, che si adatta alla forma del corpo. Chi dorme <strong>sulla schiena</strong> cerca un equilibrio tra sostegno e comfort. Chi dorme <strong>a pancia in giù</strong> di solito preferisce un materasso più sostenuto, che non lasci affondare il bacino.</p>`)}
      ${sec('corporatura', '2. Corporatura e sostegno', `<p>Più il peso è elevato, più conta il sostegno: un materasso troppo morbido cede e la schiena non resta allineata. Per corporature robuste valuta un modello sostenuto o un'altezza maggiore. Una corporatura leggera può invece apprezzare un materasso più accogliente.</p>`)}
      ${sec('coppia', '3. Se dormite in due', `<p>Se uno dei due si muove molto, contano l'indipendenza delle zone e la stabilità. Le <strong>molle insacchettate</strong> lavorano una per una e trasmettono meno movimento; anche le schiume ad alta densità sono stabili. Se avete esigenze diverse, scegliete un modello di compromesso e una misura generosa: un matrimoniale da 160 o un 180×200.</p>`)}
      ${sec('temperatura', '4. Caldo o freddo', `<p>Il Memory Foam avvolge e tende a trattenere più calore; le molle lasciano circolare più aria. Un materasso reversibile, con un lato invernale e uno estivo, come il ${a(L.duo, 'Vesuvio Memory Duo')}, aiuta a gestire le stagioni.</p>`)}
      ${sec('misura', '5. Misura e altezza', `<p>Il materasso va scelto sulla misura <strong>interna</strong> del letto o della rete, non su quella esterna della struttura. Per la lunghezza, conta almeno 15–20 cm in più della tua altezza: per chi è alto, meglio un 200 cm. Le ${a(P.sizes, '13 misure standard')} si confrontano in scala; se il letto non è standard, c'è il ${a(P.quote, 'materasso su misura')}.</p>
        <p>L'altezza del materasso incide sul comfort percepito e sul sostegno; verifica anche che il letto la possa contenere.</p>`)}
      ${sec('provare', '6. Provarlo', `<p>La prova resta il metodo migliore: sdraiati qualche minuto nella posizione in cui dormi davvero. Nel nostro ${a(P.showroom, 'showroom di Casoria')} puoi provare tutti i modelli. Se non puoi venire, il ${a(P.sleepMatch, 'Sleep Match')} ti propone un modello in poche domande.</p>`)}
      ${sec('rete', '7. Non dimenticare la rete', `<p>Un buon materasso su una rete stanca o deformata lavora male. Una ${a('/reti/', 'rete a doghe')} della stessa misura completa il letto.</p>`)}
      <p class="small muted">Questa guida dà indicazioni generali di comfort. In caso di dolori o problemi alla schiena, chiedi consiglio al tuo medico.</p>`,
  },

  '/guide/materasso-memory-molle-o-poliuretano/': {
    nav: 'Memory, molle o poliuretano',
    parent: [P.guides, 'Guide'],
    h1: 'Materasso in Memory Foam, a molle o in poliuretano?',
    metaTitle: 'Memory Foam, molle o poliuretano: differenze',
    description: 'Le differenze tra materassi in Memory Foam, a molle insacchettate e in poliuretano espanso: sostegno, accoglienza, calore e per chi è adatto ciascuno.',
    lead: 'Tre tecnologie, tre caratteri diversi.',
    type: 'article',
    body: () => `${toc([['poliuretano', 'Poliuretano espanso'], ['memory', 'Memory Foam'], ['molle', 'Molle insacchettate'], ['confronto', 'In sintesi']])}
      ${sec('poliuretano', 'Poliuretano espanso', `<p>È una schiuma che, ad alta densità, offre un sostegno uniforme e stabile. Non si modella sul corpo come il Memory: risponde in modo più diretto. È la scelta più essenziale e conveniente, adatta a chi cerca un letto solido e a chi preferisce non "affondare".</p>
        <p>Il nostro modello: ${a(L.eco, 'Vesuvio Eco')}, anima monoblocco in poliuretano ad alta densità, in tre altezze (H20, H25, H30).</p>`)}
      ${sec('memory', 'Memory Foam', `<p>Il Memory Foam reagisce al calore e al peso del corpo e ne segue la forma, distribuendo la pressione: per questo è <strong>accogliente</strong> e piace a chi dorme sul fianco. Tende a trattenere più calore delle molle. Nei materassi è di solito uno strato di comfort sopra una base portante più rigida.</p>
        <p>I nostri modelli: ${a(L.duoClassic, 'Vesuvio Memory Duo Classic')}, Memory su base in poliuretano con rivestimento fisso; ${a(L.duo, 'Vesuvio Memory Duo')}, lo stesso sfoderabile e reversibile estate-inverno; ${a(L.trio, 'Vesuvio Memory Trio')}, tre strati di Memory per 27 cm.</p>`)}
      ${sec('molle', 'Molle insacchettate', `<p>Ogni molla è chiusa nel suo sacchetto e lavora in modo indipendente: il materasso si adatta per zone e trasmette poco il movimento a chi dorme accanto. Tra le molle circola aria, quindi resta più fresco. Spesso le molle si uniscono a uno strato di Memory: è quello che chiamiamo Hybrid.</p>
        <p>I nostri modelli: ${a(L.p1600, 'Vesuvio Pocket 1600')}, 1600 molle insacchettate alto 25 cm; ${a(L.pocket, 'Vesuvio Pocket 3000 Elite')}, 3000 molle con uno strato di comfort in Memory Foam.</p>`)}
      ${sec('confronto', 'In sintesi', `<div class="table-scroll"><table class="size-table"><thead><tr><th></th><th>Poliuretano</th><th>Memory Foam</th><th>Molle insacchettate</th></tr></thead><tbody>
        <tr><th scope="row">Sensazione</th><td>Stabile, diretta</td><td>Accogliente, avvolgente</td><td>Elastica, per zone</td></tr>
        <tr><th scope="row">Calore</th><td>Neutro</td><td>Trattiene di più</td><td>Più fresco</td></tr>
        <tr><th scope="row">In due</th><td>Stabile</td><td>Stabile</td><td>Movimento poco trasmesso</td></tr>
        <tr><th scope="row">Da noi</th><td>${a(L.eco, 'Eco')}</td><td>${a(L.duoClassic, 'Memory Duo Classic')}, ${a(L.duo, 'Memory Duo')}, ${a(L.trio, 'Memory Trio')}</td><td>${a(L.p1600, 'Pocket 1600')}, ${a(L.pocket, 'Pocket 3000 Elite')}</td></tr>
        </tbody></table></div>
        <p>Per affiancare i modelli caratteristica per caratteristica c'è il ${a(P.compare, 'confronto')}; per una proposta su misura, lo ${a(P.sleepMatch, 'Sleep Match')}.</p>`)}`,
  },
};

/** Testo aggiuntivo per pagine già esistenti (guida misure, su misura, showroom, sleep match, confronto). */
export const VIEW_SEO = {
  home: {
    metaTitle: 'Materassi di fabbrica a Napoli, dal 1986',
    description: 'Materassi prodotti a Casoria (Napoli) e venduti a prezzo di fabbrica: Memory Foam, molle e poliuretano. Spedizione gratuita, paghi alla consegna.',
  },
  [P.sleepMatch]: {
    metaTitle: 'Sleep Match: trova il materasso adatto a te',
    description: 'Rispondi a qualche domanda su come dormi: Sleep Match ti propone un solo materasso Vesuvio Sleep, con il perché. Le risposte non vengono salvate.',
  },
  [P.compare]: {
    metaTitle: 'Confronta i materassi: caratteristiche e prezzi',
    description: 'Confronta i materassi Vesuvio Sleep fianco a fianco: tecnologia, composizione, altezze, rivestimento, rigidità indicativa e prezzi di fabbrica.',
  },
  [P.sizes]: {
    metaTitle: 'Misure dei materassi: guida e confronto in scala',
    description: 'Le 13 misure dei materassi, dal singolo 80×190 al King Size 180×200: nomi, dimensioni e confronto in scala vista dall’alto. Come misurare il letto.',
  },
  [P.quote]: {
    metaTitle: 'Materassi su misura e fuori misura: preventivo',
    description: 'Materassi su misura e con altezze personalizzate, prodotti nella fabbrica di Casoria (Napoli). Indica misure e modello: ti mandiamo il preventivo su WhatsApp.',
  },
  [P.offers]: {
    metaTitle: 'Letto completo: materasso e rete insieme costano meno',
    description: 'Materasso e rete della stessa misura, prodotti nella fabbrica di Casoria: insieme costano meno che separati. Letti già composti e Componi il tuo letto.',
  },
  [P.showroom]: {
    metaTitle: 'Showroom e fabbrica di materassi a Casoria (Napoli)',
    description: 'Prova i materassi nello showroom della fabbrica Vesuvio Sleep, Via Raffaele Salierno 38, Casoria (NA). Aperto lun–ven 9–18 e sabato 10–14.',
  },
};
