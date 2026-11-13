"""Genera il catalogo iniziale dal dataset ufficiale.

Uso: python3 -I scripts/build_seed.py input-vesuvio/dati/Vesuvio_Sleep_Site_Data_v1.0.json
Output: preview/js/seed.js e supabase/seed.sql (idempotente, ON CONFLICT DO NOTHING).

Regole: i prezzi vengono SOLO dal dataset; i campi null restano null (variante non
acquistabile); i prodotti PENDING entrano come bozza. I testi descrittivi
riformulano composition_public e il Master Spec, senza aggiungere dati tecnici.
"""
import json, sys, uuid, os

NS = uuid.UUID('6f1d1b8e-6b2a-4d3e-9a51-0e3444206786')
def uid(*parts):
    return str(uuid.uuid5(NS, '/'.join(map(str, parts))))

data = json.load(open(sys.argv[1], encoding='utf-8'))
SIZES = data['standard_sizes']
LEAD = 'Produzione in circa 2 giorni prima della spedizione'

categories = [
    dict(slug='materassi', kind='materasso', name='Materassi', sort=1, status='published',
         description='Poliuretano, Memory Foam e molle insacchettate, prodotti nella nostra fabbrica di Casoria.'),
    dict(slug='reti', kind='rete', name='Reti', sort=2, status='published',
         description='Reti a doghe in acciaio e legno, con piedi inclusi.'),
    dict(slug='guanciali', kind='guanciale', name='Guanciali', sort=3, status='published',
         description='Guanciali in piuma e in Memory.'),
    dict(slug='topper', kind='topper', name='Topper', sort=4, status='published',
         description='Topper in Memory Foam da 5 cm.'),
    dict(slug='letti-a-castello', kind='letto', name='Letti a castello', sort=5, status='draft',
         description='Letti a castello in acciaio.'),
]
for c in categories:
    c['id'] = uid('cat', c['slug'])
cat = {c['kind']: c['id'] for c in categories}

COPY = {
    'essential-foam': dict(
        line='ESS',
        short='Poliuretano espanso ad alta densità: sostegno uniforme e stabile, in tre altezze.',
        description="L'anima monoblocco in poliuretano ad alta densità e alta portanza dà un sostegno uniforme, stabile e duraturo. "
                    "È il modello più essenziale della gamma, disponibile in H20, H25 e H30. Il rivestimento non è sfoderabile.",
        highlights=['Anima monoblocco ad alta densità', 'Tre altezze: H20, H25, H30', 'Sostegno uniforme'],
        match=dict(tech='foam', welcome=0, ventilation=False, independent_springs=False)),
    'memory-duo': dict(
        line='MD',
        short='Memory Foam premium su base in poliuretano ad alta densità. Sfoderabile e reversibile.',
        description="Uno strato di comfort in Memory Foam premium ad alta densità poggia su una base portante in poliuretano ad alta densità. "
                    "È più accogliente dell'Essential ed è reversibile: un lato invernale in Memory e un lato più fresco per l'estate. Il rivestimento è sfoderabile.",
        highlights=['Memory Foam premium', 'Lato invernale e lato estivo', 'Sfoderabile'],
        match=dict(tech='memory', welcome=2, ventilation=False, independent_springs=False)),
    'memory-air-3d': dict(
        line='MA3D',
        short='Memory Foam e poliuretano ad alta densità con fascia perimetrale 3D traspirante.',
        description="Memory Foam premium e poliuretano ad alta densità, con una fascia perimetrale 3D traspirante che favorisce la ventilazione laterale. "
                    "Reversibile con lato invernale e lato estivo, rivestimento sfoderabile.",
        highlights=['Fascia perimetrale 3D traspirante', 'Lato invernale e lato estivo', 'Sfoderabile'],
        match=dict(tech='memory', welcome=1.5, ventilation=True, independent_springs=False)),
    'pocket-2400-elite': dict(
        line='P2400',
        short='Molle indipendenti insacchettate e Memory Foam: il nostro Hybrid più sostenuto.',
        description="Molle indipendenti insacchettate, uno strato di comfort in Memory Foam ed elementi in poliuretano ad alta densità per stabilizzazione e supporto. "
                    "Le 2400 molle sono riferite alla misura 160×190; sulle altre misure il molleggio è proporzionato alla superficie. "
                    "Pensato per chi cerca più sostegno e per chi dorme in due. Rivestimento sfoderabile.",
        highlights=['Molle indipendenti insacchettate', 'Strato di comfort in Memory', 'Sfoderabile'],
        hybrid=True,
        match=dict(tech='molle', welcome=1, ventilation=False, independent_springs=True)),
}

products, variants, media = [], [], []

def add_product(pid_key, **kw):
    p = dict(id=uid('prod', pid_key), slug=pid_key, technical_name='', short='', description='', composition='',
             highlights=[], claims=[], removable_cover=None, reversible=None, summer_winter=None, hybrid=False,
             firmness_display=None, line_code='', status='published', sort=0, lead_time=None, match=None,
             internal_notes='')
    p.update(kw)
    products.append(p)
    return p

for i, src in enumerate(data['products']):
    pid = src['id']
    if src.get('status') == 'pending' or pid.startswith('topper'):
        continue
    cp = COPY[pid]
    notes = []
    if src.get('firmness_status') == 'provisional_research':
        notes.append('Rigidità indicativa da verificare sul prodotto reale.')
    if src.get('provisional_layer_note'):
        notes.append(src['provisional_layer_note'])
    notes.append('VERIFY: claim antiacaro / ipoallergenico / Free Humidity da confrontare con etichetta.')
    p = add_product(pid, category_id=cat['materasso'], name=src['name'], technical_name=src['technical_name'],
                    short=cp['short'], description=cp['description'], composition=src['composition_public'],
                    highlights=cp['highlights'], claims=src.get('claims', []),
                    removable_cover=src.get('removable_cover'), reversible=src.get('reversible', False),
                    summer_winter=src.get('summer_winter', False), hybrid=cp.get('hybrid', False),
                    firmness_display=src.get('firmness_display'), line_code=cp['line'], sort=i + 1,
                    lead_time=LEAD, match=cp['match'], internal_notes=' '.join(notes))
    prices = data['mattress_prices_eur'][pid]
    active_h = src.get('active_heights_cm')
    for h in src['heights_cm']:
        for j, size in enumerate(SIZES):
            eur = prices.get(str(h), {}).get(size)
            purch = eur is not None and (active_h is None or h in active_h)
            variants.append(dict(id=uid('var', pid, h, size), product_id=p['id'],
                                 sku=f"VS-{cp['line']}-H{h}-{size.replace('x', '')}", size=size, height_cm=h,
                                 price_cents=eur * 100 if purch else None,
                                 availability='made_to_order' if purch else 'unavailable',
                                 active=True, sort=h * 100 + j))

for c in data.get('price_conflicts', []):
    for p in products:
        if p['slug'] == c['product']:
            p['internal_notes'] += (f" CONFLICT prezzo H{c['height_cm']} {c['size']}: listino recente €{c['latest_list_price_eur']}"
                                    f" vs indicazione precedente €{c['previous_chat_price_eur']}. Usato €{c['latest_list_price_eur']}, da confermare.")

BASES = {
    'rete-flex': ('FLEX', "Telaio in acciaio ad alta resistenza e doghe in legno, pensato per distribuire il carico in modo uniforme. Piedi inclusi.",
                  'Acciaio e doghe in legno, piedi inclusi.'),
    'rete-strong': ('STRONG', "Struttura rinforzata in acciaio e piano a doghe in legno ad alta stabilità, per chi cerca un supporto più robusto. Piedi inclusi.",
                    'Acciaio rinforzato e doghe in legno, piedi inclusi.'),
}
for i, b in enumerate(data['bases']):
    line, desc, short = BASES[b['id']]
    p = add_product(b['id'], category_id=cat['rete'], name=b['name'], technical_name=b['technical_name'],
                    short=short, description=desc, composition=b['material'].capitalize() + '.',
                    highlights=['Piedi inclusi', 'Telaio in acciaio', 'Doghe in legno'], line_code=line, sort=10 + i,
                    internal_notes='Portata massima non verificata: non pubblicare un valore.')
    for j, size in enumerate(SIZES):
        eur = b['prices_eur'].get(size)
        variants.append(dict(id=uid('var', b['id'], size), product_id=p['id'], sku=f'VS-RETE-{line}-{size.replace("x", "")}',
                             size=size, height_cm=None, price_cents=eur * 100 if eur else None,
                             availability='made_to_order' if eur else 'unavailable', active=True, sort=j))

PILLOWS = {
    'piuma': ('PIUMA', 'Guanciale in piuma, alto 12 cm.', 'Piuma'),
    'memory-flakes': ('MFLAKES', 'Guanciale con imbottitura in fiocchi di Memory, alto 12 cm.', 'Fiocchi di Memory'),
    'memory-classic': ('MCLASSIC', 'Guanciale classico in Memory, alto 15 cm.', 'Memory'),
    'memory-cervical': ('MCERV', 'Guanciale cervicale in Memory Foam, alto 12 cm.', 'Memory Foam'),
}
for i, g in enumerate(data['pillows']):
    line, short, mat = PILLOWS[g['id']]
    slug = 'guanciale-' + g['id']
    p = add_product(slug, category_id=cat['guanciale'], name=g['name'], technical_name=f"Guanciale {mat.lower()}",
                    short=short, description=short,
                    composition=mat + '.', highlights=[f"Altezza {g['height_cm']} cm", mat], line_code=line, sort=20 + i,
                    internal_notes='Misure del guanciale PENDING: non pubblicarle finché non fornite.')
    variants.append(dict(id=uid('var', slug), product_id=p['id'], sku=f'VS-GUA-{line}', size=None, height_cm=g['height_cm'],
                         price_cents=g['price_eur'] * 100 if g.get('price_eur') else None,
                         availability='made_to_order', active=True, sort=0))

# Topper: prezzo PENDING -> bozza con varianti non valorizzate
tp = add_product('topper-memory-cloud-5', category_id=cat['topper'], name='Vesuvio Topper Memory Cloud 5',
                 technical_name='Topper Memory H5', short='Topper in Memory Foam alto 5 cm, sfoderabile.',
                 description='Topper in Memory Foam alto 5 cm con rivestimento sfoderabile, in tutte le misure standard.',
                 composition='Memory Foam.', highlights=['Altezza 5 cm', 'Sfoderabile'], removable_cover=True,
                 line_code='MC5', status='draft', sort=30, internal_notes='Prezzi PENDING. SKU topper proposto (VS-TOP-…), da confermare.')
for j, size in enumerate(SIZES):
    variants.append(dict(id=uid('var', 'topper', size), product_id=tp['id'], sku=f'VS-TOP-MC5-{size.replace("x", "")}', size=size,
                         height_cm=5, price_cents=None, availability='unavailable', active=True, sort=j))

for slug, name, line in [('pocket-1600', 'Vesuvio Pocket 1600', 'P1600'), ('bonnell-classic', 'Vesuvio Bonnell Classic', 'BON')]:
    add_product(slug, category_id=cat['materasso'], name=name, technical_name='Molle', line_code=line, status='draft', sort=40,
                internal_notes='PENDING foto, prezzi e specifiche.')
add_product('castello-steel', category_id=cat['letto'], name='Vesuvio Castello Steel', technical_name='Letto a castello in acciaio',
            line_code='CAST', status='draft', sort=50, internal_notes='PENDING misure e prezzi (con e senza materassi H20).')

pocket = next(p for p in products if p['slug'] == 'pocket-2400-elite')
media += [
    dict(id=uid('media', 'pocket', 'cutaway'), product_id=pocket['id'], slot='hero', src='img/pocket-2400-cutaway-1200.webp',
         srcset='img/pocket-2400-cutaway-720.webp 720w, img/pocket-2400-cutaway-1200.webp 1200w', width=1200, height=800,
         alt='Render del Vesuvio Pocket 2400 Elite con un angolo aperto che mostra lo strato in Memory e le molle insacchettate',
         caption='Render illustrativo', illustrative=True, is_cover=True, published=True, sort=1, focal_x=50, focal_y=50),
    dict(id=uid('media', 'pocket', 'exploded'), product_id=pocket['id'], slot='exploded', src='img/pocket-2400-esploso-1200.webp',
         srcset='img/pocket-2400-esploso-720.webp 720w, img/pocket-2400-esploso-1200.webp 1200w', width=1200, height=800,
         alt='Vista esplosa illustrativa del Vesuvio Pocket 2400 Elite: rivestimento, Memory Foam, poliuretano, molle insacchettate e base',
         caption='Vista illustrativa a strati, non in scala', illustrative=True, is_cover=False, published=True, sort=2, focal_x=50, focal_y=50,
         hotspots=[
             dict(x=50, y=15, title='Rivestimento sfoderabile', text='Si apre con la cerniera. Lavaggio secondo le indicazioni in etichetta.'),
             dict(x=56, y=34, title='Memory Foam', text='Lo strato di comfort, a contatto con il rivestimento.'),
             dict(x=56, y=48, title='Poliuretano ad alta densità', text='Elementi di supporto e stabilizzazione.'),
             dict(x=40, y=66, title='Molle indipendenti insacchettate', text='2400 molle nella misura 160×190; sulle altre misure il molleggio è proporzionato alla superficie.'),
             dict(x=52, y=86, title='Base di stabilizzazione', text='Elementi in poliuretano ad alta densità che contengono il molleggio.'),
         ]),
]

# Foto generate (render illustrativi) consegnate il 13/11/2026: input-vesuvio/asset/foto-generate
from PIL import Image as _Img
_FOTO = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(sys.argv[0]))), 'preview/img/foto')
def foto(name):
    big = _Img.open(os.path.join(_FOTO, f'{name}-1600.webp')) if os.path.exists(os.path.join(_FOTO, f'{name}-1600.webp')) else None
    small_name = f'{name}-900.webp' if big else f'{name}-600.webp'
    big_name = f'{name}-1600.webp' if big else f'{name}-900.webp'
    b = _Img.open(os.path.join(_FOTO, big_name)); sm = _Img.open(os.path.join(_FOTO, small_name))
    return dict(src=f'img/foto/{big_name}', srcset=f'img/foto/{small_name} {sm.width}w, img/foto/{big_name} {b.width}w', width=b.width, height=b.height)
def pid(slug):
    return next(p['id'] for p in products if p['slug'] == slug)
NEW_MEDIA = [
    ('memory-air-3d', 'memory-air-3d-34', 'hero', True, 'Vesuvio Memory Air 3D in prospettiva, con la fascia perimetrale 3D traspirante sul lato'),
    ('memory-air-3d', 'memory-air-3d-sezione', 'exploded', False, 'Vesuvio Memory Air 3D con un angolo aperto: Memory Foam azzurro sopra la base in poliuretano'),
    ('memory-air-3d', 'memory-air-3d-tessuto', 'fabric', False, 'Dettaglio della fascia 3D a rete traspirante e del bordino blu'),
    ('pocket-2400-elite', 'pocket-2400-elite-tessuto', 'fabric', False, 'Dettaglio del rivestimento trapuntato con bordino blu e cerniera laterale'),
    ('rete-flex', 'rete-flex-34', 'hero', True, 'Rete Vesuvio Flex con telaio in acciaio scuro, doghe in legno chiaro e piedi'),
    ('rete-flex', 'rete-flex-dettaglio', 'extra', False, "Dettaglio dell'angolo della rete Flex: doghe fissate al telaio e piede"),
    ('rete-strong', 'rete-strong-34', 'hero', True, 'Rete Vesuvio Strong con telaio rinforzato in acciaio e doghe in legno'),
    ('rete-strong', 'rete-strong-dettaglio', 'extra', False, 'Dettaglio del telaio rinforzato della rete Strong'),
    ('guanciale-piuma', 'guanciale-piuma', 'hero', True, 'Guanciale in piuma con fodera bianca'),
    ('guanciale-memory-flakes', 'guanciale-memory-flakes', 'hero', True, 'Guanciale Memory Flakes con fodera trapuntata e bordino blu'),
    ('guanciale-memory-classic', 'guanciale-memory-classic', 'hero', True, 'Guanciale Memory Classic rettangolare con fodera trapuntata'),
    ('guanciale-memory-cervical', 'guanciale-memory-cervical', 'hero', True, 'Guanciale cervicale in Memory con profilo a onda'),
]
for i, (slug, name, slot, cover, alt) in enumerate(NEW_MEDIA):
    media.append(dict(id=uid('media', 'foto', name), product_id=pid(slug), slot=slot, alt=alt, caption='Render illustrativo',
                      illustrative=True, fit='cover', is_cover=cover, published=True, sort=10 + i, focal_x=50, focal_y=50, **foto(name)))

settings = dict(
    whatsapp_number='',
    shipping_note='gratuita in tutta Italia, isole comprese',
    show_claims=True,
    payments=dict(stripe=False, paypal=False, klarna=False),
)

seed = dict(version='seed-2026-11-13', categories=categories, products=products, variants=variants, media=media, settings=settings)

root = os.path.dirname(os.path.dirname(os.path.abspath(sys.argv[0])))
with open(os.path.join(root, 'preview/js/seed.js'), 'w', encoding='utf-8') as f:
    f.write('// Generato da scripts/build_seed.py a partire da Vesuvio_Sleep_Site_Data_v1.0.json. Non modificare a mano.\n')
    f.write('export const SEED = ' + json.dumps(seed, ensure_ascii=False, indent=1) + ';\n')

def q(v):
    if v is None: return 'null'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, (list, dict)): return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + str(v).replace("'", "''") + "'"

out = ['-- Seed idempotente generato da scripts/build_seed.py. Rieseguibile: non duplica e non sovrascrive modifiche admin.', 'begin;']
for c in categories:
    out.append(f"insert into public.categories (id, slug, kind, name, description, sort, status) values ({q(c['id'])}, {q(c['slug'])}, {q(c['kind'])}, {q(c['name'])}, {q(c['description'])}, {c['sort']}, {q(c['status'])}) on conflict (id) do nothing;")
for p in products:
    out.append("insert into public.products (id, slug, category_id, name, technical_name, short, description, composition, highlights, claims, removable_cover, reversible, summer_winter, hybrid, firmness_display, line_code, status, sort, lead_time, match) values ("
               + ', '.join(q(p[k]) for k in ['id', 'slug', 'category_id', 'name', 'technical_name', 'short', 'description', 'composition']) + ', '
               + f"{q(p['highlights'])}, {q(p['claims'])}, "
               + ', '.join(q(p[k]) for k in ['removable_cover', 'reversible', 'summer_winter', 'hybrid', 'firmness_display', 'line_code', 'status', 'sort', 'lead_time'])
               + f", {q(p['match'])}) on conflict (id) do nothing;")
    if p['internal_notes']:
        out.append(f"insert into public.product_private (product_id, internal_notes) values ({q(p['id'])}, {q(p['internal_notes'])}) on conflict (product_id) do nothing;")
for v in variants:
    out.append(f"insert into public.variants (id, product_id, sku, size, height_cm, price_cents, availability, active, sort) values ({q(v['id'])}, {q(v['product_id'])}, {q(v['sku'])}, {q(v['size'])}, {q(v['height_cm'])}, {q(v['price_cents'])}, {q(v['availability'])}, {q(v['active'])}, {v['sort']}) on conflict (id) do nothing;")
for m in media:
    out.append(f"insert into public.media (id, product_id, slot, storage_path, alt, caption, illustrative, is_cover, published, sort, focal_x, focal_y, width, height, hotspots, fit) values ({q(m['id'])}, {q(m['product_id'])}, {q(m['slot'])}, {q('seed/' + os.path.basename(m['src']))}, {q(m['alt'])}, {q(m['caption'])}, {q(m['illustrative'])}, {q(m['is_cover'])}, {q(m['published'])}, {m['sort']}, {m['focal_x']}, {m['focal_y']}, {m['width']}, {m['height']}, {q(m.get('hotspots'))}, {q(m.get('fit', 'contain'))}) on conflict (id) do nothing;")
for k, v in settings.items():
    pub = 'true' if k in ('shipping_note', 'show_claims', 'whatsapp_number') else 'false'
    out.append(f"insert into public.settings (key, value, is_public) values ({q(k)}, {q(v if isinstance(v, (dict, list)) else json.dumps(v))}{'' if isinstance(v, (dict, list)) else '::jsonb'}, {pub}) on conflict (key) do nothing;")
out.append('commit;')
with open(os.path.join(root, 'supabase/seed.sql'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(out) + '\n')
print(f'{len(categories)} categorie, {len(products)} prodotti, {len(variants)} varianti, {len(media)} media')
print('acquistabili:', sum(1 for v in variants if v['price_cents']))
