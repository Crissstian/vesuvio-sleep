"""Genera il catalogo del sito.

Uso:
  python3 -I scripts/build_seed.py

Fonti:
  - PREZZI E MISURE: input-vesuvio/catalogo-2026-11-15/01_CATALOGO/
    Vesuvio_Sleep_Listino_Prezzi_CONFERMATO_2600_H5.xlsx (fonte primaria, 130 varianti).
  - Testi descrittivi già confermati: input-vesuvio/dati/Vesuvio_Sleep_Site_Data_v1.0.json.
  - Immagini prodotto: preview/img/prodotti/manifest.json (da scripts/build_product_images.py),
    che segue MEDIA_MANIFEST.csv.

Output:
  - preview/js/seed.js
  - supabase/seed.sql (installazione nuova: ON CONFLICT DO NOTHING)
  - supabase/catalog/catalogo_corrente.sql (database esistente: upsert del catalogo)

Regole: una variante è acquistabile solo con prezzo > 0 nell'Excel. Nessun prezzo
storico, nessuna interpolazione, nessuno zero al posto delle celle vuote. I prodotti
senza alcun prezzo restano in bozza. Gli ID restano stabili (upsert, non duplicati):
il Pocket 3000 Elite conserva l'ID del vecchio "Pocket 2400 Elite", l'Eco quello dell'Essential Foam.
"""
import json, os, uuid, sys
import openpyxl
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, 'input-vesuvio/catalogo-2026-11-15/01_CATALOGO/Vesuvio_Sleep_Listino_Prezzi_CONFERMATO_2600_H5.xlsx')
DATASET = os.path.join(ROOT, 'input-vesuvio/dati/Vesuvio_Sleep_Site_Data_v1.0.json')
CATALOG_VERSION = 'catalogo-2026-11-16c'

NS = uuid.UUID('6f1d1b8e-6b2a-4d3e-9a51-0e3444206786')
def uid(*parts):
    return str(uuid.uuid5(NS, '/'.join(map(str, parts))))

data = json.load(open(DATASET, encoding='utf-8'))
old = {p['id']: p for p in data['products']}
LEAD = 'Produzione in circa 2 giorni prima della spedizione'

# ------------------------------------------------------------------ Excel
wb = openpyxl.load_workbook(XLSX, data_only=True)
norm = lambda s: str(s).replace('×', 'x').strip()

def read_sheet(name, first_size_col, height_col):
    ws = wb[name]
    hdr = [c.value for c in ws[4]]
    sizes = [norm(s) for s in hdr[first_size_col:] if s]
    rows = []
    for r in ws.iter_rows(min_row=5, values_only=True):
        if not r[0]:
            continue
        h = int(r[height_col]) if height_col is not None and r[height_col] is not None else None
        prices = {}
        for j, s in enumerate(sizes):
            v = r[first_size_col + j]
            prices[s] = int(round(v * 100)) if isinstance(v, (int, float)) and v > 0 else None
        rows.append(dict(name=r[0].strip(), tipologia=(r[1] if height_col != 1 else None), height=h, prices=prices))
    return sizes, rows

SIZES, MATT = read_sheet('Materassi', 3, 2)
_, BASES_X = read_sheet('Reti', 2, None)
_, TOPPER_X = read_sheet('Topper', 2, 1)
for r in TOPPER_X:
    r['tipologia'] = 'Topper Memory Foam'

# ------------------------------------------------------------------ categorie
categories = [
    dict(slug='materassi', kind='materasso', name='Materassi', sort=1, status='published',
         description='Poliuretano, Memory Foam e molle insacchettate, prodotti nella nostra fabbrica di Casoria.'),
    dict(slug='reti', kind='rete', name='Reti', sort=2, status='published',
         description='Reti a doghe in acciaio e legno, con piedi inclusi.'),
    dict(slug='topper', kind='topper', name='Topper', sort=3, status='published',
         description='Topper in Memory Foam alto 5 cm, in tutte le misure dei nostri materassi.'),
    dict(slug='guanciali', kind='guanciale', name='Guanciali', sort=4, status='published',
         description='Guanciali in piuma e in Memory.'),
    dict(slug='letti-a-castello', kind='letto', name='Letti a castello', sort=5, status='draft',
         description='Letti a castello in acciaio.'),
]
for c in categories:
    c['id'] = uid('cat', c['slug'])
cat = {c['kind']: c['id'] for c in categories}

# ------------------------------------------------------------------ prodotti
# key = chiave dell'ID (stabile), slug = indirizzo pubblico
MATTRESSES = {
    'Vesuvio Essential Foam': dict(
        key='essential-foam', slug='eco', display='Vesuvio Eco', line='ESS', sort=1,
        notes='Rinominato da "Vesuvio Essential Foam" il 16/11/2026 su indicazione dell\'azienda. '
              'Il vecchio indirizzo /materassi/essential-foam/ reindirizza qui. '
              'Da verificare: il nome "Eco" e\' una denominazione commerciale, sul sito non e\' accompagnato '
              'da alcuna dichiarazione ambientale perche\' non ne abbiamo di documentate.',
        short='Poliuretano espanso ad alta densità: sostegno uniforme e stabile, in tre altezze.',
        description="L'anima monoblocco in poliuretano ad alta densità e alta portanza dà un sostegno uniforme, stabile e duraturo. "
                    "È il modello più essenziale della gamma, disponibile in H20, H25 e H30. Il rivestimento non è sfoderabile.",
        composition=old['essential-foam']['composition_public'],
        highlights=['Anima monoblocco ad alta densità', 'Tre altezze: H20, H25, H30', 'Sostegno uniforme'],
        removable_cover=False, summer_winter=False, firmness=old['essential-foam'].get('firmness_display'),
        claims=old['essential-foam'].get('claims', []),
        match=dict(tech='foam', welcome=0, ventilation=False, independent_springs=False)),
    'Vesuvio Memory Duo': dict(
        key='memory-duo', slug='memory-duo', line='MD', sort=3,
        notes='H30 indicata dall\'azienda la sera del 16/11/2026. DA RICONTROLLARE: il 160x190 in H30 costa '
              '329 euro, l\'unico prezzo dei materassi che non sia un multiplo di 10, tra un 290 e un 340.',
        override={30: {'80x190': 150, '80x200': 160, '90x190': 180, '90x200': 190, '120x190': 250, '120x200': 260,
                       '140x190': 280, '140x200': 290, '160x190': 329, '160x200': 340, '165x190': 340,
                       '170x200': 360, '180x200': 390}},
        short='Memory Foam su base in poliuretano ad alta densità. Sfoderabile e reversibile.',
        description="Uno strato di comfort in Memory Foam poggia su una base portante in poliuretano ad alta densità. "
                    "È più accogliente dell'Eco ed è reversibile: un lato invernale in Memory e un lato più fresco per l'estate. Il rivestimento è sfoderabile.",
        composition=old['memory-duo']['composition_public'],
        highlights=['Memory Foam 2 strati', 'Lato invernale e lato estivo', 'Sfoderabile'],
        removable_cover=True, summer_winter=True, firmness=old['memory-duo'].get('firmness_display'),
        claims=old['memory-duo'].get('claims', []),
        match=dict(tech='memory', welcome=2, ventilation=False, independent_springs=False)),
    # Non è nel listino Excel: i prezzi li ha indicati l'azienda il 16/11/2026
    # come "Memory Duo sfoderabile meno 20 euro", misura per misura.
    'Vesuvio Memory Duo Classic': dict(
        key='memory-duo-classic', slug='memory-duo-classic', line='MDC', sort=2, heights=[25],
        prices={'80x190': 110, '80x200': 120, '90x190': 140, '90x200': 150, '120x190': 200, '120x200': 210,
                '140x190': 230, '140x200': 240, '160x190': 260, '160x200': 280, '165x190': 290,
                '170x200': 310, '180x200': 330},
        short='Lo stesso Memory Duo, con il rivestimento fisso.',
        description='Stessa costruzione del Vesuvio Memory Duo: uno strato di comfort in Memory Foam su una base portante '
                    'in poliuretano ad alta densità. Qui il rivestimento è fisso, non sfoderabile.',
        composition=old['memory-duo']['composition_public'],
        highlights=['Memory Foam 2 strati', 'Rivestimento fisso'],
        removable_cover=False,
        notes='Aggiunto il 16/11/2026 su indicazione dell\'azienda. Prezzi: Memory Duo sfoderabile meno 20 euro '
              'per ogni misura, confermati dall\'azienda la sera del 16/11/2026 rimandando indietro il listino. Da confermare: se è reversibile estate/inverno come lo '
              'sfoderabile e quali claim valgono per questo tessuto. Nessuna foto propria: la scheda mostra i segnaposto.',
        match=dict(tech='memory', welcome=2, ventilation=False, independent_springs=False)),
    'Vesuvio Pocket 2600 Elite': dict(
        key='pocket-2400-elite', slug='pocket-3000-elite', display='Vesuvio Pocket 3000 Elite', line='P3000', sort=6, hybrid=True,
        technical='3000 molle insacchettate + Memory',
        override={25: {'80x190': 230, '80x200': 250, '90x190': 280, '90x200': 290, '120x190': 390, '120x200': 410,
                       '140x190': 470, '140x200': 480, '160x190': 620, '160x200': 630, '165x190': 630,
                       '170x200': 680, '180x200': 730},
                  30: {'80x190': 260, '80x200': 270, '90x190': 300, '90x200': 310, '120x190': 420, '120x200': 440,
                       '140x190': 500, '140x200': 520, '160x190': 650, '160x200': 660, '165x190': 660,
                       '170x200': 720, '180x200': 800}},
        short='3000 molle insacchettate e Memory Foam: il nostro Hybrid più sostenuto.',
        description="Molle indipendenti insacchettate, uno strato di comfort in Memory Foam ed elementi in poliuretano ad alta densità per stabilizzazione e supporto. "
                    "Pensato per chi cerca più sostegno e per chi dorme in due. Rivestimento sfoderabile.",
        composition='3000 molle insacchettate, Memory Foam ed elementi in poliuretano ad alta densità.',
        highlights=['3000 molle insacchettate', 'Strato di comfort in Memory', 'Sfoderabile'],
        removable_cover=True, summer_winter=False, firmness=old['pocket-2400-elite'].get('firmness_display'),
        claims=old['pocket-2400-elite'].get('claims', []),
        notes='Storico del nome: "Pocket 2400 Elite" fino al 15/11/2026, "Pocket 2600 Elite" fino al 16/11/2026, '
              'poi "Pocket 3000 Elite" su indicazione dell\'azienda. DA VERIFICARE PRIMA DEL LANCIO: il numero di molle '
              'pubblicato e a quale misura si riferisce; le foto in scheda sono quelle scattate il 15/11/2026. '
              'Prezzi H25 del 16/11/2026: ricostruiti in proporzione dal listino portando il 160x190 a 620 euro '
              '(fattore 1,1273) e CONFERMATI dall\'azienda la sera del 16/11 rimandando indietro il listino. '
              'H30 indicata dall\'azienda la sera del 16/11.',
        match=dict(tech='molle', welcome=1, ventilation=False, independent_springs=True)),
    'Vesuvio Pocket 1600': dict(
        key='pocket-1600', slug='pocket-1600', line='P1600', sort=5,
        technical='1600 molle insacchettate',
        override={25: {'80x190': 220, '80x200': 240, '90x190': 270, '90x200': 280, '120x190': 390, '120x200': 400,
                       '140x190': 420, '140x200': 440, '160x190': 500, '160x200': 510, '165x190': 510,
                       '170x200': 530, '180x200': 580},
                  30: {'80x190': 240, '80x200': 260, '90x190': 290, '90x200': 310, '120x190': 420, '120x200': 420,
                       '140x190': 440, '140x200': 450, '160x190': 540, '160x200': 530, '165x190': 530,
                       '170x200': 550, '180x200': 600}},
        short='1600 molle insacchettate, alto 25 cm: l\'ingresso nella gamma a molle.',
        description='Materasso a molle indipendenti insacchettate alto 25 cm, prodotto nella nostra fabbrica di Casoria. '
                    'È il modello a molle più essenziale della gamma: stesso principio del Pocket 3000 Elite, con un numero '
                    'di molle inferiore.',
        composition='Molle insacchettate.',
        highlights=['1600 molle insacchettate', 'Altezza 25 cm'],
        notes='Rientrato in catalogo il 16/11/2026 (era archiviato dalla mattina dello stesso giorno). '
              'Prezzi H25 del 16/11/2026: ricostruiti in proporzione dal listino portando il 160x190 a 500 euro '
              '(fattore 1,1111) e CONFERMATI dall\'azienda la sera del 16/11. H30 indicata la stessa sera. '
              'DA RICONTROLLARE: in H30 il 160x190 costa 540 euro mentre il 160x200 e il 165x190 ne costano 530, '
              'cioe il prezzo scende al crescere della misura. In H25 lo stesso passaggio sale (500, 510, 510). DA VERIFICARE PRIMA DEL LANCIO: il numero di molle pubblicato '
              'e la composizione di dettaglio. Nessuna foto propria: la scheda mostra i segnaposto.',
        match=dict(tech='molle', welcome=1, ventilation=False, independent_springs=True)),
    'Memory Foam 3 strati': dict(
        key='memory-foam-3-strati', slug='memory-trio', display='Vesuvio Memory Trio', line='MF3', sort=4,
        short='Tre strati di Memory Foam, alto 27 cm: il più accogliente della gamma in schiuma.',
        description='Tre strati di Memory Foam per un totale di 27 cm di altezza, prodotto nella nostra fabbrica di Casoria. '
                    'Dove il Memory Duo ha un solo strato di comfort sopra la base, qui gli strati sono tre: '
                    'l\'accoglienza è più progressiva e il materasso è più alto.',
        composition='Memory Foam, 3 strati.',
        highlights=['Memory Foam a 3 strati', 'Altezza 27 cm'],
        notes='Rinominato da "Memory Foam 3 strati" (nome di listino) a "Vesuvio Memory Trio" il 16/11/2026: '
              'il nome richiama il Memory Duo e dichiara i tre strati. Il vecchio indirizzo reindirizza qui. '
              'DA VERIFICARE PRIMA DEL LANCIO: la composizione di dettaglio dei tre strati e se è sfoderabile. '
              'Foto annunciate dall\'azienda il 16/11/2026, non ancora ricevute: la scheda mostra i segnaposto.',
        match=dict(tech='memory', welcome=1.5, ventilation=False, independent_springs=False)),
    'Vesuvio Memory Air 3D': dict(
        key='memory-air-3d', slug='memory-air-3d', line='MA3D', sort=6,
        short='Memory Foam e poliuretano ad alta densità con fascia perimetrale 3D traspirante.',
        description="Memory Foam e poliuretano ad alta densità, con una fascia perimetrale 3D traspirante che favorisce la ventilazione laterale. "
                    "Reversibile con lato invernale e lato estivo, rivestimento sfoderabile.",
        composition=old['memory-air-3d']['composition_public'],
        highlights=['Fascia perimetrale 3D traspirante', 'Lato invernale e lato estivo', 'Sfoderabile'],
        removable_cover=True, summer_winter=True, firmness=old['memory-air-3d'].get('firmness_display'),
        claims=old['memory-air-3d'].get('claims', []),
        status='archived',
        notes='Fuori gamma dal 16/11/2026: non compare nell\'elenco dei prodotti indicato dall\'azienda. '
              'Archiviato, non compare sul sito. Si ripubblica da Admin se rientra in gamma.',
        match=dict(tech='memory', welcome=1.5, ventilation=True, independent_springs=False)),
    'Vesuvio Bonnell Classic': dict(
        key='bonnell-classic', slug='bonnell-classic', line='BON', sort=7,
        short='Molle Bonnell.', description='', composition='Molle Bonnell.', highlights=[], status='archived',
        notes='Fuori gamma dal 16/11/2026: non compare nell\'elenco dei prodotti indicato dall\'azienda. '
              'Archiviato, non compare sul sito. Si ripubblica da Admin se rientra in gamma.'),
}
BASES = {
    'Vesuvio Rete Flex': dict(key='rete-flex', line='FLEX', sort=10,
        short='Acciaio e doghe in legno, piedi inclusi.',
        description='Telaio in acciaio ad alta resistenza e doghe in legno, pensato per distribuire il carico in modo uniforme. Piedi inclusi.'),
    'Vesuvio Rete Strong': dict(key='rete-strong', line='STRONG', sort=11,
        short='Acciaio rinforzato e doghe in legno, piedi inclusi.',
        description='Struttura rinforzata in acciaio e piano a doghe in legno ad alta stabilità, per chi cerca un supporto più robusto. Piedi inclusi.'),
}

products, variants, media = [], [], []
def add_product(key, **kw):
    p = dict(id=uid('prod', key), slug=key, technical_name='', short='', description='', composition='',
             highlights=[], claims=[], removable_cover=None, reversible=None, summer_winter=None, hybrid=False,
             firmness_display=None, line_code='', status='published', sort=0, lead_time=None, match=None, internal_notes='')
    p.update(kw)
    products.append(p)
    return p

def add_variants(p, key, line, rows, kind):
    for r in rows:
        h = r['height']
        for j, size in enumerate(SIZES):
            cents = r['prices'].get(size)
            vid = uid('var', key, h, size) if kind == 'materasso' else uid('var', key, size) if kind == 'rete' else uid('var', 'topper', size)
            sku = (f'VS-{line}-H{h}-{size.replace("x", "")}' if kind == 'materasso'
                   else f'VS-RETE-{line}-{size.replace("x", "")}' if kind == 'rete'
                   else f'VS-TOP-{line}-{size.replace("x", "")}')
            variants.append(dict(id=vid, product_id=p['id'], sku=sku, size=size, height_cm=h, price_cents=cents,
                                 availability='made_to_order' if cents else 'unavailable', active=True,
                                 sort=(h or 0) * 100 + j))

def euro(d):
    """Prezzi indicati dall'azienda in euro -> centesimi. Nessun valore dedotto: le misure
    non elencate restano vuote, quindi non acquistabili."""
    return {z: (int(round(d[z] * 100)) if d.get(z) else None) for z in SIZES}

for name, spec in MATTRESSES.items():
    rows = [r for r in MATT if r['name'] == name]
    if not rows and 'heights' in spec:
        # modello non presente nel listino Excel: misure standard, prezzi solo se forniti
        rows = [dict(name=name, tipologia='Memory Foam 2 strati', height=h, prices=euro(spec['prices']))
                for h in spec['heights']]
    # prezzi aggiornati dall'azienda dopo il listino: sostituiscono la riga dell'altezza indicata
    for h, table in spec.get('override', {}).items():
        hit = [r for r in rows if r['height'] == h]
        assert hit, (name, h)
        hit[0]['prices'] = euro(table)
    priced = any(v for r in rows for v in r['prices'].values())
    p = add_product(spec['key'], slug=spec['slug'], category_id=cat['materasso'], name=spec.get('display', name),
                    technical_name=spec.get('technical') or (rows[0]['tipologia'] if rows else ''), short=spec['short'], description=spec['description'],
                    composition=spec['composition'], highlights=spec['highlights'], claims=spec.get('claims', []),
                    removable_cover=spec.get('removable_cover'), reversible=spec.get('summer_winter'),
                    summer_winter=spec.get('summer_winter'), hybrid=spec.get('hybrid', False),
                    firmness_display=spec.get('firmness'), line_code=spec['line'], sort=spec['sort'],
                    status=spec.get('status') or ('published' if priced else 'draft'), lead_time=LEAD if priced else None,
                    match=spec.get('match'), internal_notes=spec.get('notes', ''))
    add_variants(p, spec['key'], spec['line'], rows, 'materasso')

for r in BASES_X:
    spec = BASES.get(r['name'])
    if not spec:
        print('non pubblicata (nessun prezzo / non presente sul sito):', r['name'])
        continue
    p = add_product(spec['key'], category_id=cat['rete'], name=r['name'], technical_name=r['tipologia'],
                    short=spec['short'], description=spec['description'], composition=spec['short'],
                    highlights=['Piedi inclusi', 'Telaio in acciaio', 'Doghe in legno'], line_code=spec['line'], sort=spec['sort'],
                    internal_notes='Portata massima non verificata: non pubblicare un valore.')
    add_variants(p, spec['key'], spec['line'], [r], 'rete')

for r in TOPPER_X:
    p = add_product('topper-memory-cloud-5', category_id=cat['topper'], name=r['name'], technical_name='Topper Memory Foam H5',
                    short='Topper in Memory Foam alto 5 cm, sfoderabile.',
                    description='Topper in Memory Foam alto 5 cm con rivestimento sfoderabile, nelle stesse misure dei nostri materassi.',
                    composition='Memory Foam, altezza 5 cm.', highlights=['Altezza 5 cm', 'Sfoderabile'], removable_cover=True,
                    line_code='MC5', sort=20, lead_time=LEAD,
                    internal_notes='Altezza 5 cm confermata (il valore 80 del file originario era un errore). SKU VS-TOP-MC5-… proposto.')
    add_variants(p, 'topper', 'MC5', [r], 'topper')

# Guanciali e letti a castello: nessun prezzo nel listino -> bozza, varianti senza prezzo
PILLOWS = [('piuma', 'Vesuvio Piuma', 'PIUMA', 'Piuma'), ('memory-flakes', 'Vesuvio Memory Flakes', 'MFLAKES', 'Fiocchi di Memory'),
           ('memory-classic', 'Vesuvio Memory Classic', 'MCLASSIC', 'Memory'), ('memory-cervical', 'Vesuvio Memory Cervical', 'MCERV', 'Memory Foam')]
for i, (k, name, line, mat) in enumerate(PILLOWS):
    slug = 'guanciale-' + k
    p = add_product(slug, category_id=cat['guanciale'], name=name, technical_name=f'Guanciale {mat.lower()}',
                    short=f'Guanciale in {mat.lower()}.', description=f'Guanciale in {mat.lower()}.', composition=mat + '.',
                    highlights=[mat], line_code=line, sort=30 + i, status='draft',
                    internal_notes='Sospeso: nessun prezzo nel listino del 15/11/2026.')
    variants.append(dict(id=uid('var', slug), product_id=p['id'], sku=f'VS-GUA-{line}', size=None, height_cm=12,
                         price_cents=None, availability='unavailable', active=True, sort=0))
add_product('castello-steel', category_id=cat['letto'], name='Vesuvio Castello Steel', technical_name='Letto a castello in acciaio',
            line_code='CAST', status='draft', sort=50, internal_notes='Sospeso: misure e prezzi non presenti nel listino.')

pid = lambda key: uid('prod', key)

# ------------------------------------------------------------------ media
# 1) immagini approvate del 15/11/2026 (MEDIA_MANIFEST.csv)
IMG = json.load(open(os.path.join(ROOT, 'preview/img/prodotti/manifest.json')))
FOLDER_KEY = {'vesuvio-eco': 'essential-foam', 'vesuvio-memory-duo': 'memory-duo', 'vesuvio-pocket-3000-elite': 'pocket-2400-elite'}
# Le cartelle sono state rinominate con i prodotti il 16/11/2026, ma l'ID della foto si
# continua a calcolare dal nome originale: altrimenti il database vedrebbe foto nuove.
ID_FOLDER = {'vesuvio-eco': 'vesuvio-essential-foam', 'vesuvio-pocket-3000-elite': 'vesuvio-pocket-2600-elite'}
SLOT = {'hero': 'hero', 'exploded': 'exploded', 'detail': 'fabric'}
ALT = {
    ('essential-foam', 'hero'): 'Vesuvio Eco, materasso con rivestimento bianco trapuntato',
    ('essential-foam', 'exploded'): 'Vista esplosa del Vesuvio Eco: rivestimento e anima in poliuretano espanso',
    ('essential-foam', 'detail'): 'Dettaglio del rivestimento trapuntato del Vesuvio Eco',
    ('memory-duo', 'hero'): 'Vesuvio Memory Duo con piano trapuntato bianco e fascia laterale grigio scuro',
    ('memory-duo', 'exploded'): 'Vista esplosa del Vesuvio Memory Duo: rivestimento, strato in Memory Foam e base in poliuretano',
    ('memory-duo', 'detail'): 'Dettaglio del tessuto e della fascia grigio scuro del Vesuvio Memory Duo',
    ('pocket-2400-elite', 'hero'): 'Vesuvio Pocket 3000 Elite con piano trapuntato e fascia laterale marrone chiaro',
    ('pocket-2400-elite', 'exploded'): 'Vista esplosa del Vesuvio Pocket 3000 Elite: rivestimento, Memory Foam, poliuretano e molle insacchettate',
    ('pocket-2400-elite', 'detail'): 'Dettaglio del rivestimento trapuntato e della cerniera del Vesuvio Pocket 3000 Elite',
}
ORDER = {'hero': 1, 'exploded': 2, 'detail': 3}
for it in IMG:
    key = FOLDER_KEY[it['prodotto']]
    (big, bw, bh), (small, sw, sh) = it['files'][0], it['files'][1]
    base = f"img/prodotti/{it['prodotto']}/"
    white_bg = it['ruolo'] != 'detail'
    media.append(dict(id=uid('media', 'catalogo-2026-11-15', ID_FOLDER.get(it['prodotto'], it['prodotto']), it['ruolo']), product_id=pid(key),
                      slot=SLOT[it['ruolo']], src=base + big, srcset=f'{base}{small} {sw}w, {base}{big} {bw}w', width=bw, height=bh,
                      alt=ALT[(key, it['ruolo'])], caption='', illustrative=it['ruolo'] == 'exploded',
                      fit='contain' if white_bg else 'cover', bg='white' if white_bg else None,
                      is_cover=it['ruolo'] == 'hero', published=True, sort=ORDER[it['ruolo']], focal_x=50, focal_y=50))

# 2) immagini precedenti del Pocket (riferite al 2400): restano in archivio, non pubblicate
media += [
    dict(id=uid('media', 'pocket', 'cutaway'), product_id=pid('pocket-2400-elite'), slot='extra', src='img/pocket-2400-cutaway-1200.webp',
         srcset='img/pocket-2400-cutaway-720.webp 720w, img/pocket-2400-cutaway-1200.webp 1200w', width=1200, height=800,
         alt='Render precedente del Pocket Elite in sezione', caption='', illustrative=True, is_cover=False, published=False,
         sort=90, focal_x=50, focal_y=50),
    dict(id=uid('media', 'pocket', 'exploded'), product_id=pid('pocket-2400-elite'), slot='extra', src='img/pocket-2400-esploso-1200.webp',
         srcset='img/pocket-2400-esploso-720.webp 720w, img/pocket-2400-esploso-1200.webp 1200w', width=1200, height=800,
         alt='Vista esplosa precedente del Pocket Elite', caption='', illustrative=True, is_cover=False, published=False,
         sort=91, focal_x=50, focal_y=50),
]

# 3) foto generate del 13/11/2026 ancora pertinenti (reti; Memory Air 3D e guanciali restano col prodotto sospeso)
_FOTO = os.path.join(ROOT, 'preview/img/foto')
def foto(name):
    big_name = f'{name}-1600.webp' if os.path.exists(os.path.join(_FOTO, f'{name}-1600.webp')) else f'{name}-900.webp'
    small_name = f'{name}-900.webp' if big_name.endswith('1600.webp') else f'{name}-600.webp'
    b = Image.open(os.path.join(_FOTO, big_name)); sm = Image.open(os.path.join(_FOTO, small_name))
    return dict(src=f'img/foto/{big_name}', srcset=f'img/foto/{small_name} {sm.width}w, img/foto/{big_name} {b.width}w', width=b.width, height=b.height)
GEN = [
    ('memory-air-3d', 'memory-air-3d-34', 'hero', True, True, 'Vesuvio Memory Air 3D in prospettiva, con la fascia perimetrale 3D traspirante sul lato'),
    ('memory-air-3d', 'memory-air-3d-sezione', 'exploded', False, True, 'Vesuvio Memory Air 3D con un angolo aperto: Memory Foam sopra la base in poliuretano'),
    ('memory-air-3d', 'memory-air-3d-tessuto', 'fabric', False, True, 'Dettaglio della fascia 3D a rete traspirante'),
    ('pocket-2400-elite', 'pocket-2400-elite-tessuto', 'extra', False, False, 'Dettaglio precedente del rivestimento del Pocket Elite'),
    ('rete-flex', 'rete-flex-34', 'hero', True, True, 'Vesuvio Rete Flex con telaio in acciaio scuro, doghe in legno chiaro e piedi'),
    ('rete-flex', 'rete-flex-dettaglio', 'extra', False, True, "Dettaglio dell'angolo della Rete Flex: doghe fissate al telaio e piede"),
    ('rete-strong', 'rete-strong-34', 'hero', True, True, 'Vesuvio Rete Strong con telaio rinforzato in acciaio e doghe in legno'),
    ('rete-strong', 'rete-strong-dettaglio', 'extra', False, True, 'Dettaglio del telaio rinforzato della Rete Strong'),
    ('guanciale-piuma', 'guanciale-piuma', 'hero', True, True, 'Guanciale in piuma con fodera bianca'),
    ('guanciale-memory-flakes', 'guanciale-memory-flakes', 'hero', True, True, 'Guanciale Memory Flakes con fodera trapuntata'),
    ('guanciale-memory-classic', 'guanciale-memory-classic', 'hero', True, True, 'Guanciale Memory Classic rettangolare con fodera trapuntata'),
    ('guanciale-memory-cervical', 'guanciale-memory-cervical', 'hero', True, True, 'Guanciale cervicale in Memory con profilo a onda'),
]
for i, (key, name, slot, cover, published, alt) in enumerate(GEN):
    media.append(dict(id=uid('media', 'foto', name), product_id=pid(key), slot=slot, alt=alt, caption='', illustrative=True,
                      fit='cover', is_cover=cover, published=published, sort=10 + i, focal_x=50, focal_y=50, **foto(name)))

# ------------------------------------------------------------------ redirect e impostazioni
# Indirizzi vecchi -> nuovi. Si tengono tutti: un link già pubblicato deve continuare a funzionare.
redirects = [
    dict(old_slug='pocket-2400-elite', new_slug='pocket-3000-elite'),
    dict(old_slug='pocket-2600-elite', new_slug='pocket-3000-elite'),
    dict(old_slug='essential-foam', new_slug='eco'),
    dict(old_slug='memory-foam-3-strati', new_slug='memory-trio'),
]
settings = dict(whatsapp_number='+39 366 121 8346', public_phone='+39 366 121 8346', contact_email='fdimaterassi@gmail.com',
                payment_methods=['contrassegno', 'bonifico'], shipping_note='gratuita in tutta Italia, isole comprese', show_claims=True,
                payments=dict(stripe=False, paypal=False, klarna=False))

# ------------------------------------------------------------------ controlli
pub_cats = {c['id'] for c in categories if c['status'] == 'published'}
pub_prods = {p['id']: p for p in products if p['status'] == 'published' and p['category_id'] in pub_cats}
buyable = [v for v in variants if v['price_cents'] and v['product_id'] in pub_prods]
by_kind = {}
kind_of = {c['id']: c['kind'] for c in categories}
for v in buyable:
    k = kind_of[pub_prods[v['product_id']]['category_id']]
    by_kind[k] = by_kind.get(k, 0) + 1
assert by_kind.get('rete') == 26 and by_kind.get('topper') == 13, by_kind
assert len(buyable) == sum(by_kind.values())
# un prodotto in bozza non ha prezzi (regola "senza prezzo non si pubblica");
# un prodotto archiviato può conservarli: è stato tolto dal catalogo, non svenduto
draft_ids = {p['id'] for p in products if p['status'] == 'draft'}
assert all(v['price_cents'] is None for v in variants if v['product_id'] in draft_ids)
assert not [p for p in products if p['status'] == 'archived' and p['id'] in pub_prods]
assert len({v['sku'] for v in variants}) == len(variants), 'SKU duplicati'
assert len({v['id'] for v in variants}) == len(variants), 'ID duplicati'
covers = {}
for m in media:
    if m['is_cover']:
        covers[m['product_id']] = covers.get(m['product_id'], 0) + 1
assert all(n == 1 for n in covers.values()), 'più copertine per prodotto'

seed = dict(version='seed-2026-11-16c', catalog_version=CATALOG_VERSION, authoritative=True,
            categories=categories, products=products, variants=variants, media=media, redirects=redirects, settings=settings)
# Catalogo per il sito pubblico: niente bozze, niente archiviati, niente note interne.
# Sul sito statico il JavaScript è leggibile da chiunque: ciò che non è pubblicato non ci va.
pub_cat_ids = {c['id'] for c in categories if c['status'] == 'published'}
pub_ids = set(pub_prods)
public = dict(
    seed,
    categories=[{k: v for k, v in c.items()} for c in categories if c['status'] == 'published'],
    products=[{k: v for k, v in p.items() if k != 'internal_notes'} for p in products if p['id'] in pub_ids],
    variants=[v for v in variants if v['product_id'] in pub_ids],
    media=[m for m in media if m['published'] and m['product_id'] in pub_ids],
)
with open(os.path.join(ROOT, 'preview/js/seed.public.js'), 'w', encoding='utf-8') as f:
    f.write('// Catalogo del sito pubblico, generato da scripts/build_seed.py: solo prodotti pubblicati,\n')
    f.write('// senza bozze, archiviati e note interne. Non modificare a mano.\n')
    f.write('export const SEED = ' + json.dumps(public, ensure_ascii=False, indent=1) + ';\n')

with open(os.path.join(ROOT, 'preview/js/seed.js'), 'w', encoding='utf-8') as f:
    f.write('// Generato da scripts/build_seed.py dal listino confermato del 15/11/2026. Non modificare a mano.\n')
    f.write('export const SEED = ' + json.dumps(seed, ensure_ascii=False, indent=1) + ';\n')

# ------------------------------------------------------------------ SQL
def q(v):
    if v is None: return 'null'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, (list, dict)): return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + str(v).replace("'", "''") + "'"

PCOLS = ['id', 'slug', 'category_id', 'name', 'technical_name', 'short', 'description', 'composition', 'highlights', 'claims',
         'removable_cover', 'reversible', 'summer_winter', 'hybrid', 'firmness_display', 'line_code', 'status', 'sort', 'lead_time', 'match']
VCOLS = ['id', 'product_id', 'sku', 'size', 'height_cm', 'price_cents', 'availability', 'active', 'sort']
MCOLS = ['id', 'product_id', 'slot', 'storage_path', 'alt', 'caption', 'illustrative', 'is_cover', 'published', 'sort', 'focal_x', 'focal_y', 'width', 'height', 'hotspots', 'fit', 'bg']
def mrow(m):
    d = dict(m, storage_path='seed/' + m['src'].replace('img/', ''), hotspots=m.get('hotspots'), fit=m.get('fit', 'contain'))
    return d
def ins(table, cols, row, conflict):
    vals = ', '.join(q(row.get(c)) for c in cols)
    return f"insert into public.{table} ({', '.join(cols)}) values ({vals}) {conflict};"
def upd(cols, key='id'):
    return 'on conflict (' + key + ') do update set ' + ', '.join(f'{c} = excluded.{c}' for c in cols if c != key)

seed_sql = ['-- Seed idempotente generato da scripts/build_seed.py (installazione nuova). Non sovrascrive modifiche admin.', 'begin;']
for c in categories:
    seed_sql.append(ins('categories', ['id', 'slug', 'kind', 'name', 'description', 'sort', 'status'], c, 'on conflict (id) do nothing'))
for p in products:
    seed_sql.append(ins('products', PCOLS, p, 'on conflict (id) do nothing'))
    if p['internal_notes']:
        seed_sql.append(f"insert into public.product_private (product_id, internal_notes) values ({q(p['id'])}, {q(p['internal_notes'])}) on conflict (product_id) do nothing;")
for v in variants:
    seed_sql.append(ins('variants', VCOLS, v, 'on conflict (id) do nothing'))
for m in media:
    seed_sql.append(ins('media', MCOLS, mrow(m), 'on conflict (id) do nothing'))
for r in redirects:
    seed_sql.append(f"insert into public.slug_redirects (old_slug, new_slug) values ({q(r['old_slug'])}, {q(r['new_slug'])}) on conflict (old_slug) do nothing;")
for k, v in settings.items():
    pub = 'true' if k in ('shipping_note', 'show_claims', 'whatsapp_number', 'public_phone', 'contact_email', 'payment_methods') else 'false'
    seed_sql.append(f"insert into public.settings (key, value, is_public) values ({q(k)}, {q(v if isinstance(v, (dict, list)) else json.dumps(v))}{'' if isinstance(v, (dict, list)) else '::jsonb'}, {pub}) on conflict (key) do nothing;")
seed_sql.append('commit;')
open(os.path.join(ROOT, 'supabase/seed.sql'), 'w', encoding='utf-8').write('\n'.join(seed_sql) + '\n')

upd_sql = [
    f'-- Catalogo corrente ({CATALOG_VERSION}) per un database già popolato.',
    '-- Generato da scripts/build_seed.py. Upsert per ID: nessun duplicato, storico richieste intatto.',
    '-- Eseguire dopo le migrazioni, una volta. Rieseguibile.',
    'begin;',
    '-- una sola copertina per prodotto: si azzerano prima quelle dei prodotti toccati',
    'update public.media set is_cover = false where product_id in (' + ', '.join(sorted({q(m['product_id']) for m in media})) + ');',
]
for c in categories:
    upd_sql.append(ins('categories', ['id', 'slug', 'kind', 'name', 'description', 'sort', 'status'], c, upd(['id', 'slug', 'kind', 'name', 'description', 'sort', 'status'])))
for p in products:
    upd_sql.append(ins('products', PCOLS, p, upd(PCOLS)))
for v in variants:
    upd_sql.append(ins('variants', VCOLS, v, upd(VCOLS)))
for m in media:
    upd_sql.append(ins('media', MCOLS, mrow(m), upd(MCOLS)))
for r in redirects:
    upd_sql.append(f"insert into public.slug_redirects (old_slug, new_slug) values ({q(r['old_slug'])}, {q(r['new_slug'])}) on conflict (old_slug) do update set new_slug = excluded.new_slug;")
upd_sql.append('-- contatti e pagamenti (15/11/2026): si scrivono solo dove l\'admin non ha già un valore')
for k, v in settings.items():
    pub = 'true' if k in ('shipping_note', 'show_claims', 'whatsapp_number', 'public_phone', 'contact_email', 'payment_methods') else 'false'
    val = q(v) if isinstance(v, (dict, list)) else q(json.dumps(v)) + '::jsonb'
    upd_sql.append(f"insert into public.settings (key, value, is_public) values ({q(k)}, {val}, {pub}) on conflict (key) do update set value = excluded.value, is_public = excluded.is_public where public.settings.value in ('\"\"'::jsonb, 'null'::jsonb);")
upd_sql.append('commit;')
os.makedirs(os.path.join(ROOT, 'supabase/catalog'), exist_ok=True)
open(os.path.join(ROOT, 'supabase/catalog/catalogo_corrente.sql'), 'w', encoding='utf-8').write('\n'.join(upd_sql) + '\n')

print(f'{len(categories)} categorie, {len(products)} prodotti, {len(variants)} varianti, {len(media)} media')
print('acquistabili:', len(buyable), by_kind)
