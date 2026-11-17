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
CATALOG_VERSION = 'catalogo-2026-11-17a'

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
        notes='H30 indicata dall\'azienda la sera del 16/11/2026. Un solo valore corretto su autorizzazione: '
              'il 160x190 in H30 era scritto 329 euro, unico prezzo dei materassi non multiplo di 10, tra un 290 '
              'e un 340: portato a 330. Da ricontrollare al prossimo listino.',
        override={30: {'80x190': 150, '80x200': 160, '90x190': 180, '90x200': 190, '120x190': 250, '120x200': 260,
                       '140x190': 280, '140x200': 290, '160x190': 330, '160x200': 340, '165x190': 340,
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
        short='La costruzione del Memory Duo, con il rivestimento fisso.',
        description='Stessa costruzione del Vesuvio Memory Duo: uno strato di comfort in Memory Foam su una base portante '
                    'in poliuretano ad alta densità. Qui il rivestimento è fisso, non sfoderabile, ed è diverso da quello '
                    'del Memory Duo: lo vedi nelle foto.',
        composition=old['memory-duo']['composition_public'],
        highlights=['Memory Foam 2 strati', 'Rivestimento fisso'],
        removable_cover=False,
        notes='Aggiunto il 16/11/2026 su indicazione dell\'azienda. Foto consegnate la sera del 16/11/2026: il tessuto '
              'porta la scritta "Bamboo", che la scheda non riprende perche\' non e\' una caratteristica verificata. '
              'DA CONFERMARE: che sia il tessuto di questo modello. Prezzi: Memory Duo sfoderabile meno 20 euro '
              'per ogni misura, confermati dall\'azienda la sera del 16/11/2026 rimandando indietro il listino. Da confermare: se è reversibile estate/inverno come lo '
              'sfoderabile e quali claim valgono per questo tessuto.',
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
                       '140x190': 440, '140x200': 450, '160x190': 520, '160x200': 530, '165x190': 530,
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
              'Un solo valore corretto su autorizzazione: in H30 il 160x190 era scritto 540 euro, '
              'piu del 160x200 e del 165x190 (530), cioe il prezzo scendeva al crescere della misura. Portato a 520, '
              'cioe H25 (500) piu 20 euro, lo scarto H25->H30 di 9 misure su 13 di questo modello: ristabilisce '
              'anche l\'ordine 520 < 530 = 530, come in H25 (500 < 510 = 510). Da ricontrollare al prossimo listino. DA VERIFICARE PRIMA DEL LANCIO: il numero di molle pubblicato '
              'e la composizione di dettaglio. Foto consegnate la sera del 16/11/2026: il tessuto porta la '
              'scritta "Antibatterico", che la scheda non riprende perche\' non e\' una caratteristica verificata. '
              'DA CONFERMARE: che sia il tessuto di questo modello.',
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
              'Foto consegnate la sera del 16/11/2026: il tessuto porta la scritta "Grafeno", ripetuta sul piano. '
              'L\'immagine era marcata "non associare ad alcun prodotto" nel MEDIA_MANIFEST del 15/11, con riserva '
              '"fino a istruzioni successive": l\'azienda le ha assegnate a questo modello la sera del 16/11. '
              'La scheda non riprende la scritta, perche\' il grafene non e\' una caratteristica verificata. '
              'DA CONFERMARE: che sia il tessuto di questo modello.',
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
             firmness_display=None, line_code='', status='published', sort=0, lead_time=None, match=None, internal_notes='',
             bundle_family=None)
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
                    match=spec.get('match'), internal_notes=spec.get('notes', ''),
                    # famiglia per le offerte abbinate (docs/OFFERTE.md): molle -> pocket, schiume -> foam
                    bundle_family=(('pocket' if spec['match']['tech'] == 'molle' else 'foam') if spec.get('match') else None))
    add_variants(p, spec['key'], spec['line'], rows, 'materasso')

for r in BASES_X:
    spec = BASES.get(r['name'])
    if not spec:
        print('non pubblicata (nessun prezzo / non presente sul sito):', r['name'])
        continue
    p = add_product(spec['key'], category_id=cat['rete'], name=r['name'], technical_name=r['tipologia'],
                    short=spec['short'], description=spec['description'], composition=spec['short'],
                    highlights=['Portata alta', 'Piedi inclusi', 'Telaio in acciaio', 'Doghe in legno'], line_code=spec['line'], sort=spec['sort'],
                    internal_notes='Portata "alta" indicata dal titolare il 17/11/2026; il valore in kg non e\' verificato: non pubblicarlo.')
    add_variants(p, spec['key'], spec['line'], [r], 'rete')

for r in TOPPER_X:
    p = add_product('topper-memory-cloud-5', category_id=cat['topper'], name=r['name'], technical_name='Topper Memory Foam H5',
                    short='Topper in Memory Foam alto 5 cm, sfoderabile.',
                    description='Topper in Memory Foam alto 5 cm con rivestimento sfoderabile, nelle stesse misure dei nostri materassi.',
                    composition='Memory Foam, altezza 5 cm.', highlights=['Altezza 5 cm', 'Sfoderabile'], removable_cover=True,
                    line_code='MC5', sort=20, lead_time=LEAD,
                    internal_notes='Altezza 5 cm confermata (il valore 80 del file originario era un errore). SKU VS-TOP-MC5-… proposto. '
                                   'Foto consegnate la sera del 16/11/2026: il tessuto porta la scritta "Aloe Vera", che la scheda non '
                                   'riprende perche\' non e\' una caratteristica verificata. Nessuna delle due e\' un primo piano del tessuto: '
                                   'la seconda mostra la cerniera sul bordo ed e\' usata nello spazio "dettaglio". DA CONFERMARE il tessuto.')
    add_variants(p, 'topper', 'MC5', [r], 'topper')

# Guanciali (17/11/2026): pubblicati con un prezzo PROVVISORIO, scelto dal titolare come
# "prezzo medio dei concorrenti meno 10 %", arrotondato all'euro. Riferimenti consultati il
# 17/11/2026 (prezzi al pezzo): Baldiflex saponetta memory 34,70; Muun memory 40x70 34,99;
# Diotti MemoDream 47 e ErgoMemo cervicale 48; Marcapiuma memory firm 51,99; Memocervical
# 29,98; Muun cervicale Luna 25,99; Falconieri piuma d'oca 50x80 49,99; Magniflex piumino 60.
# Per i fiocchi di memory si trovano solo prodotti da grande distribuzione (11-20 EUR), non
# confrontabili: prezzo messo poco sotto il Memory Classic. Altezza 12 cm confermata dal titolare.
PILLOWS = [
    ('piuma', 'Vesuvio Piuma', 'PIUMA', 'Piuma', 4500,
     'Guanciale imbottito in piuma, morbido e leggero.', 'Il guanciale tradizionale: imbottitura in piuma, soffice e leggero. Alto 12 cm.'),
    ('memory-flakes', 'Vesuvio Memory Flakes', 'MFLAKES', 'Fiocchi di Memory Foam', 3300,
     'Fiocchi di Memory Foam che si modellano sotto la testa.', 'Imbottito con fiocchi di Memory Foam: si lascia modellare e si adatta alla posizione della testa. Alto 12 cm.'),
    ('memory-classic', 'Vesuvio Memory Classic', 'MCLASSIC', 'Memory Foam', 3700,
     'Memory Foam a forma rettangolare, sostegno uniforme.', 'Guanciale in Memory Foam a forma rettangolare: accoglie la testa e la sostiene in modo uniforme. Alto 12 cm.'),
    ('memory-cervical', 'Vesuvio Memory Cervical', 'MCERV', 'Memory Foam', 3400,
     'Memory Foam con profilo a onda per il collo.', 'Guanciale in Memory Foam con profilo a onda, che segue la curva del collo. Alto 12 cm.'),
]
for i, (k, name, line, mat, cents, short, desc) in enumerate(PILLOWS):
    slug = 'guanciale-' + k
    p = add_product(slug, category_id=cat['guanciale'], name=name, technical_name=f'Guanciale in {mat.lower()}',
                    short=short, description=desc, composition=mat + '.',
                    highlights=['Alto 12 cm', mat], line_code=line, sort=30 + i, status='published',
                    internal_notes='Prezzo PROVVISORIO dal 17/11/2026: media dei concorrenti meno 10 %, da confermare o '
                                   'correggere da Admin. Misure (larghezza x lunghezza) da confermare. Foto generata con AI.')
    variants.append(dict(id=uid('var', slug), product_id=p['id'], sku=f'VS-GUA-{line}', size=None, height_cm=12,
                         price_cents=cents, availability='made_to_order', active=True, sort=0))
add_product('castello-steel', category_id=cat['letto'], name='Vesuvio Castello Steel', technical_name='Letto a castello in acciaio',
            line_code='CAST', status='draft', sort=50, internal_notes='Sospeso: misure e prezzi non presenti nel listino.')

pid = lambda key: uid('prod', key)

# ------------------------------------------------------------------ media
# 1) immagini approvate del 15/11/2026 (MEDIA_MANIFEST.csv)
IMG = json.load(open(os.path.join(ROOT, 'preview/img/prodotti/manifest.json')))
FOLDER_KEY = {'vesuvio-eco': 'essential-foam', 'vesuvio-memory-duo': 'memory-duo', 'vesuvio-pocket-3000-elite': 'pocket-2400-elite',
              'vesuvio-memory-trio': 'memory-foam-3-strati', 'vesuvio-memory-duo-classic': 'memory-duo-classic',
              'vesuvio-pocket-1600': 'pocket-1600', 'vesuvio-topper-memory-cloud-5': 'topper-memory-cloud-5'}
# Le cartelle sono state rinominate con i prodotti il 16/11/2026, ma l'ID della foto si
# continua a calcolare dal nome originale: altrimenti il database vedrebbe foto nuove.
ID_FOLDER = {'vesuvio-eco': 'vesuvio-essential-foam', 'vesuvio-pocket-3000-elite': 'vesuvio-pocket-2600-elite'}
SLOT = {'hero': 'hero', 'exploded': 'exploded', 'detail': 'fabric', 'fabric': 'fabric'}
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
    # Foto consegnate dall'azienda il 16/11/2026. Il testo alternativo descrive la forma e i
    # materiali visibili: la scritta sul tessuto non viene ripetuta, perché sarebbe una
    # caratteristica dichiarata e la scheda non ne pubblica nessuna.
    ('memory-foam-3-strati', 'hero'): 'Vesuvio Memory Trio in prospettiva, con il piano trapuntato bianco e la fascia perimetrale chiara',
    ('memory-foam-3-strati', 'exploded'): 'Vista esplosa del Vesuvio Memory Trio: rivestimento e i tre strati di Memory Foam sopra la base',
    ('memory-foam-3-strati', 'detail'): 'Dettaglio ravvicinato della trapuntatura e del bordo del Vesuvio Memory Trio',
    ('memory-duo-classic', 'hero'): 'Vesuvio Memory Duo Classic in prospettiva, piano trapuntato chiaro e fascia laterale marrone con maniglie',
    ('memory-duo-classic', 'exploded'): 'Vista esplosa del Vesuvio Memory Duo Classic: rivestimento, strato di Memory Foam e base portante',
    ('memory-duo-classic', 'detail'): 'Dettaglio del bordo, della maniglia e della trapuntatura del Vesuvio Memory Duo Classic',
    ('pocket-1600', 'hero'): 'Vesuvio Pocket 1600 in prospettiva, piano trapuntato chiaro e fascia laterale marrone con maniglie',
    ('pocket-1600', 'exploded'): 'Vista esplosa del Vesuvio Pocket 1600: rivestimento, due strati in schiuma, le molle insacchettate e la base',
    ('pocket-1600', 'detail'): 'Dettaglio dell\'angolo, della maniglia e della trapuntatura del Vesuvio Pocket 1600',
    ('topper-memory-cloud-5', 'hero'): 'Vesuvio Topper Memory Cloud 5 in prospettiva, piano trapuntato bianco con cerniera perimetrale',
    ('topper-memory-cloud-5', 'fabric'): 'Il rivestimento sfoderabile del Topper Memory Cloud 5 con la cerniera che corre lungo il bordo',
}
ORDER = {'hero': 1, 'exploded': 2, 'detail': 3, 'fabric': 3}
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

# ------------------------------------------------------------------ offerte abbinate (17/11/2026)
# Regole di calcolo: i numeri stanno in params e si cambiano da Admin › Offerte. Percentuali
# scelte prudenti in assenza dei margini (docs/OFFERTE.md, §1): DA CONFERMARE con l'azienda.
offers = [
    dict(id=uid('offer', 'letto-completo'), code='letto-completo', label='Vantaggio letto completo', sort=1, status='active',
         description='Materasso e rete della stessa misura nello stesso ordine.',
         params=dict(pct=dict(foam=5, pocket=8), round_eur=5), starts_at=None, ends_at=None),
    dict(id=uid('offer', 'letti-multipli'), code='letti-multipli', label='Vantaggio più letti', sort=2, status='active',
         description='Tre o più letti completi nello stesso ordine: camere, case vacanza, strutture.',
         params=dict(tiers=[dict(min_sets=3, pct=10), dict(min_sets=5, pct=12)], quote_from_sets=10), starts_at=None, ends_at=None),
    # 17/11/2026: i guanciali contano più della rete (si comprano spesso, e in coppia): valgono con
    # qualunque materasso, anche senza rete. Consigliati per primi: Memory Flakes e Memory Classic.
    dict(id=uid('offer', 'accessori'), code='accessori', label='Vantaggio accessori', sort=3, status='active',
         description='Guanciali insieme a un materasso; topper della stessa misura di un letto completo.',
         params=dict(pct=dict(topper=10, guanciale=15), guanciali_per_materasso=2, round_eur=1,
                     consigliati=['guanciale-memory-flakes', 'guanciale-memory-classic']), starts_at=None, ends_at=None),
    dict(id=uid('offer', 'per-due'), code='per-due', label='Vantaggio per due', sort=4, status='active',
         description='Due materassi uguali nello stesso ordine, anche senza rete.',
         params=dict(pct=dict(foam=5, pocket=8), round_eur=5), starts_at=None, ends_at=None),
    dict(id=uid('offer', 'coppia-guanciali'), code='coppia-guanciali', label='Vantaggio coppia di guanciali', sort=5, status='active',
         description='Due guanciali uguali nello stesso ordine, anche senza materasso.',
         params=dict(pct=10, round_eur=1), starts_at=None, ends_at=None),
    dict(id=uid('offer', 'tetto'), code='tetto', label='Tetto di sicurezza', sort=5, status='active',
         description='Lo sconto complessivo di un carrello non supera questa percentuale.',
         params=dict(pct=15), starts_at=None, ends_at=None),
]
# Vetrine: offerte con un nome, mostrate come schede speciali. Prezzo sempre calcolato dalle regole.
BUNDLES = [
    # Vetrine con i guanciali: in testa, perché sono l'abbinamento che si vende di più.
    # Restano nascoste finché i guanciali non hanno un prezzo (la vetrina richiede tutti i
    # pezzi obbligatori in vendita): appaiono da sole quando l'azienda li pubblica.
    dict(slug='notte-memory', name='Notte Memory', theme='elite', sort=1, default_size='160x190', sizes=None,
         badge='Materasso e due guanciali',
         tagline='Il Memory Duo con due guanciali Memory Classic: tutto quello che serve per dormire, insieme.',
         description='Il Memory Duo con due guanciali Memory Classic. Se cambi anche la rete, aggiungi la Rete Flex della stessa misura.',
         items=[('memory-duo', 25, False, 1), ('guanciale-memory-classic', None, False, 2), ('rete-flex', None, True, 1)]),
    dict(slug='notte-flakes', name='Notte Flakes', theme='classic', sort=2, default_size='160x190', sizes=None,
         badge='Materasso e due guanciali',
         tagline='Il Memory Trio con due guanciali Memory Flakes, che si modellano sotto la testa.',
         description='Il Memory Trio con due guanciali Memory Flakes. Se cambi anche la rete, aggiungi la Rete Flex della stessa misura.',
         items=[('memory-trio', 27, False, 1), ('guanciale-memory-flakes', None, False, 2), ('rete-flex', None, True, 1)]),
    dict(slug='letto-elite', name='Letto Elite', theme='elite', sort=3, default_size='160x190', sizes=None,
         badge='Il più completo',
         tagline='Il nostro materasso a molle più ricco, sulla rete rinforzata della stessa misura.',
         description='Il Pocket 3000 Elite con la Rete Strong, nella stessa misura. Scegli la misura e l\'altezza; '
                     'se vuoi, aggiungi il topper. Il vantaggio del letto completo è già nel prezzo.',
         items=[('pocket-3000-elite', 25, False, 1), ('rete-strong', None, False, 1), ('topper-memory-cloud-5', None, True, 1)]),
    dict(slug='letto-pocket', name='Letto Pocket', theme='classic', sort=4, default_size='160x190', sizes=None,
         badge='Molle insacchettate',
         tagline='Le molle indipendenti insacchettate, con la rete a doghe della stessa misura.',
         description='Il Pocket 1600 con la Rete Flex, nella stessa misura. È il modo più diretto per passare a un materasso a molle.',
         items=[('pocket-1600', 25, False, 1), ('rete-flex', None, False, 1), ('topper-memory-cloud-5', None, True, 1)]),
    dict(slug='letto-trio', name='Letto Trio', theme='classic', sort=5, default_size='160x190', sizes=None,
         badge='27 cm di Memory Foam',
         tagline='Tre strati di Memory Foam, 27 cm, sulla rete a doghe della stessa misura.',
         description='Il Memory Trio con la Rete Flex, nella stessa misura. Il più alto della gamma in schiuma.',
         items=[('memory-trio', 27, False, 1), ('rete-flex', None, False, 1), ('topper-memory-cloud-5', None, True, 1)]),
    dict(slug='letto-memory', name='Letto Memory', theme='classic', sort=6, default_size='160x190', sizes=None,
         badge='Sfoderabile',
         tagline='Memory Foam con rivestimento sfoderabile, sulla rete a doghe della stessa misura.',
         description='Il Memory Duo con la Rete Flex, nella stessa misura. Si aggiunge il topper se si vuole un piano ancora più accogliente.',
         items=[('memory-duo', 25, False, 1), ('rete-flex', None, False, 1), ('topper-memory-cloud-5', None, True, 1)]),
    dict(slug='singolo-completo', name='Singolo completo', theme='start', sort=7, default_size='80x190',
         sizes=['80x190', '80x200', '90x190', '90x200'],
         badge='Letto singolo',
         tagline='Materasso e rete per un letto singolo: cameretta, ospiti, seconda casa.',
         description='Il Vesuvio Eco alto 20 cm con la Rete Flex, nelle misure da una piazza. Si può scegliere anche un\'altra altezza.',
         items=[('eco', 20, False, 1), ('rete-flex', None, False, 1)]),
]
bundles, bundle_items = [], []
by_slug = {p['slug']: p['id'] for p in products}
for b in BUNDLES:
    bid = uid('bundle', b['slug'])
    bundles.append(dict(id=bid, slug=b['slug'], name=b['name'], tagline=b['tagline'], description=b['description'], badge=b['badge'],
                        theme=b['theme'], sizes=b['sizes'], default_size=b['default_size'], status='published', sort=b['sort']))
    for k, (key, h, optional, qty) in enumerate(b['items']):
        bundle_items.append(dict(id=uid('bitem', b['slug'], key), bundle_id=bid, product_id=by_slug[key], height_cm=h, qty=qty,
                                 optional=optional, sort=k + 1))
settings['offers_enabled'] = True

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
# offerte: ogni pezzo delle vetrine è un prodotto pubblicato, ogni materasso ha una famiglia
all_ids = {p['id'] for p in products}
for it in bundle_items:
    assert it['product_id'] in all_ids, ('pezzo di offerta inesistente', it)
# una vetrina è visibile solo se tutti i pezzi obbligatori sono in vendita (stessa regola della RLS)
def bundle_visible(b):
    req = [i for i in bundle_items if i['bundle_id'] == b['id'] and not i['optional']]
    return b['status'] == 'published' and len(req) >= 2 and all(i['product_id'] in pub_prods for i in req)
fam = {p['slug']: p['bundle_family'] for p in pub_prods.values() if kind_of[p['category_id']] == 'materasso'}
assert all(fam.values()), ('materasso pubblicato senza famiglia per le offerte', fam)

seed = dict(version='seed-2026-11-17a', catalog_version=CATALOG_VERSION, authoritative=True,
            categories=categories, products=products, variants=variants, media=media, redirects=redirects, settings=settings,
            offers=offers, bundles=bundles, bundle_items=bundle_items)
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
    offers=[o for o in offers if o['status'] != 'draft'],
    bundles=[b for b in bundles if bundle_visible(b)],
    bundle_items=[i for i in bundle_items if i['bundle_id'] in {b['id'] for b in bundles if bundle_visible(b)} and i['product_id'] in pub_prods],
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
         'removable_cover', 'reversible', 'summer_winter', 'hybrid', 'firmness_display', 'line_code', 'status', 'sort', 'lead_time', 'match',
         'bundle_family']
OCOLS = ['id', 'code', 'label', 'description', 'params', 'status', 'starts_at', 'ends_at', 'sort']
BCOLS = ['id', 'slug', 'name', 'tagline', 'description', 'badge', 'theme', 'sizes', 'default_size', 'status', 'sort']
ICOLS = ['id', 'bundle_id', 'product_id', 'height_cm', 'qty', 'optional', 'sort']
def ins_b(row, conflict):
    vals = []
    for c in BCOLS:
        v = row.get(c)
        if c == 'sizes':
            vals.append('null' if v is None else "array[" + ', '.join(q(x) for x in v) + "]::text[]")
        else:
            vals.append(q(v))
    return f"insert into public.bundles ({', '.join(BCOLS)}) values ({', '.join(vals)}) {conflict};"
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
for o in offers:
    seed_sql.append(ins('offers', OCOLS, o, 'on conflict (id) do nothing'))
for b in bundles:
    seed_sql.append(ins_b(b, 'on conflict (id) do nothing'))
for it in bundle_items:
    seed_sql.append(ins('bundle_items', ICOLS, it, 'on conflict (id) do nothing'))
for r in redirects:
    seed_sql.append(f"insert into public.slug_redirects (old_slug, new_slug) values ({q(r['old_slug'])}, {q(r['new_slug'])}) on conflict (old_slug) do nothing;")
for k, v in settings.items():
    pub = 'true' if k in ('shipping_note', 'show_claims', 'whatsapp_number', 'public_phone', 'contact_email', 'payment_methods', 'offers_enabled') else 'false'
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
upd_sql.append('-- offerte abbinate: le regole (percentuali) si scrivono solo se mancano, perché le decide l\'admin;')
upd_sql.append('-- le vetrine si aggiornano nei testi ma lo stato (pubblicata o no) resta quello scelto in Admin')
for o in offers:
    upd_sql.append(ins('offers', OCOLS, o, 'on conflict (id) do nothing'))
for b in bundles:
    upd_sql.append(ins_b(b, upd([c for c in BCOLS if c != 'status'])))
for it in bundle_items:
    upd_sql.append(ins('bundle_items', ICOLS, it, upd(ICOLS)))
for r in redirects:
    upd_sql.append(f"insert into public.slug_redirects (old_slug, new_slug) values ({q(r['old_slug'])}, {q(r['new_slug'])}) on conflict (old_slug) do update set new_slug = excluded.new_slug;")
upd_sql.append('-- contatti e pagamenti (15/11/2026): si scrivono solo dove l\'admin non ha già un valore')
for k, v in settings.items():
    pub = 'true' if k in ('shipping_note', 'show_claims', 'whatsapp_number', 'public_phone', 'contact_email', 'payment_methods', 'offers_enabled') else 'false'
    val = q(v) if isinstance(v, (dict, list)) else q(json.dumps(v)) + '::jsonb'
    upd_sql.append(f"insert into public.settings (key, value, is_public) values ({q(k)}, {val}, {pub}) on conflict (key) do update set value = excluded.value, is_public = excluded.is_public where public.settings.value in ('\"\"'::jsonb, 'null'::jsonb);")
upd_sql.append('commit;')
os.makedirs(os.path.join(ROOT, 'supabase/catalog'), exist_ok=True)
open(os.path.join(ROOT, 'supabase/catalog/catalogo_corrente.sql'), 'w', encoding='utf-8').write('\n'.join(upd_sql) + '\n')

print(f'{len(categories)} categorie, {len(products)} prodotti, {len(variants)} varianti, {len(media)} media')
print('acquistabili:', len(buyable), by_kind)
print(f'offerte: {len(offers)} regole, {len(bundles)} vetrine ({sum(1 for b in bundles if bundle_visible(b))} visibili), {len(bundle_items)} pezzi')
