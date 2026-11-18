"""Catalogo Vesuvio Sleep in PDF: genera catalogo.html dai dati del sito (data.json),
poi render.mjs lo stampa con Chromium. Prezzi e misure arrivano dal listino del sito."""
import json, html, datetime
from assets import asset

SITE = '/home/claude/vesuvio-sleep-concept/preview/img'
HERE = '/home/claude/catalogo'
data = json.load(open(f'{HERE}/data.json'))
by = {p['slug']: p for c in data for p in c['items']}
cat = {c['slug']: c for c in data}

E = html.escape
IVORY, PAPER, WHITE = '#f7f1e8', '#fffcf7', '#ffffff'
def img(path, width=1000, bg=IVORY, shadow=0.22):
    return asset(path, width=width, bg=bg, shadow=shadow)
def eur(x):
    s = f'{x:,.0f}'.replace(',', '.')
    return f'{s}&nbsp;€'

SIZES = ['80x190', '80x200', '90x190', '90x200', '120x190', '120x200', '140x190', '140x200',
         '160x190', '160x200', '165x190', '170x200', '180x200']
SIZE_NAMES = {
    '80x190': 'Singolo', '80x200': 'Singolo lungo', '90x190': 'Singolo largo', '90x200': 'Singolo largo, lungo',
    '120x190': 'Piazza e mezza', '120x200': 'Piazza e mezza, lungo', '140x190': 'Francese', '140x200': 'Francese lungo',
    '160x190': 'Matrimoniale', '160x200': 'Matrimoniale lungo', '165x190': 'Matrimoniale', '170x200': 'Matrimoniale grande',
    '180x200': 'King Size',
}
GROUP_END = {'90x200', '120x200', '140x200'}  # righe dopo cui cambia famiglia di misura
def sz(s):
    w, l = s.split('x')
    return f'{w}&thinsp;×&thinsp;{l}'

LAYERS = {
    'eco': [('Rivestimento', 'Antiacaro e ipoallergenico, non sfoderabile'),
            ('Anima monoblocco', 'Poliuretano ad alta densità e alta portanza')],
    'memory-duo': [('Rivestimento sfoderabile', 'Lato invernale e lato estivo'),
                   ('Memory Foam premium', "Lo strato di comfort, ad alta densità"),
                   ('Base portante', 'Poliuretano ad alta densità')],
    'memory-duo-classic': [('Rivestimento fisso', 'Non sfoderabile'),
                           ('Memory Foam premium', "Lo strato di comfort, ad alta densità"),
                           ('Base portante', 'Poliuretano ad alta densità')],
    'memory-trio': [('Rivestimento', 'Trapuntato, con fascia laterale chiara'),
                    ('Memory Foam', 'Primo dei tre strati, quello su cui ti sdrai'),
                    ('Memory Foam', 'Secondo strato'),
                    ('Memory Foam', 'Terzo strato: 27 cm in tutto')],
    'pocket-1600': [('Rivestimento', 'Trapuntato, con fascia laterale imbottita'),
                    ('Memory Foam', 'Lo strato di comfort'),
                    ('Poliuretano ad alta densità', 'Supporto e stabilizzazione'),
                    ('Molle insacchettate', '1600 molle indipendenti'),
                    ('Base di stabilizzazione', 'Contiene il molleggio')],
    'pocket-3000-elite': [('Rivestimento sfoderabile', 'Si apre con la cerniera'),
                          ('Memory Foam', 'Lo strato di comfort'),
                          ('Poliuretano ad alta densità', 'Supporto e stabilizzazione'),
                          ('Molle insacchettate', '3000 molle indipendenti'),
                          ('Base di stabilizzazione', 'Contiene il molleggio')],
}
MATTRESSES = ['eco', 'memory-duo-classic', 'memory-duo', 'memory-trio', 'pocket-1600', 'pocket-3000-elite']
TECH = {'eco': 'Poliuretano', 'memory-duo-classic': 'Memory, 2 strati', 'memory-duo': 'Memory, 2 strati',
        'memory-trio': 'Memory, 3 strati', 'pocket-1600': 'Molle + Memory', 'pocket-3000-elite': 'Molle + Memory'}

SEAM = ('M14 112 C 70 108, 112 92, 150 68 C 166 57, 177 49, 189 49 C 199 49, 205 56, 213 61 '
        'C 221 43, 233 30, 249 30 C 265 30, 277 47, 291 64 C 322 96, 362 108, 386 112')
def seam(cls='', w=400):
    return (f'<svg class="seam {cls}" viewBox="0 0 400 124" aria-hidden="true">'
            f'<path class="seam__shadow" d="{SEAM}"/><path class="seam__line" d="{SEAM}"/></svg>')

def name_of(p):
    return p['name'].replace('Vesuvio ', '')

def heights(p):
    return sorted({v['h'] for v in p['variants'] if v['h']})

def price_table(p, cols=None, labels=None):
    """Righe = misure, colonne = altezze (o prodotti, per le reti)."""
    if cols is None:
        hs = heights(p)
        cols = [(f'H{h}', {v['size']: v['eur'] for v in p['variants'] if v['h'] == h}) for h in hs]
    head = ''.join(f'<th class="num">{E(c)}</th>' for c, _ in cols)
    rows = []
    for s in SIZES:
        cells = ''.join(f'<td class="num">{eur(m[s]) if s in m else "—"}</td>' for _, m in cols)
        cls = ' class="grp"' if s in GROUP_END else ''
        rows.append(f'<tr{cls}><td class="sz">{sz(s)}</td><td class="nm">{SIZE_NAMES[s]}</td>{cells}</tr>')
    return (f'<table class="prices"><thead><tr><th>Misura (cm)</th><th></th>{head}</tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table>')

def yesno(v):
    return 'Sì' if v is True else ('No' if v is False else '—')

def facts(p):
    hs = heights(p)
    out = [('Altezza', ' · '.join(f'{h} cm' for h in hs))]
    if p.get('firmness_display'):
        out.append(('Rigidità', p['firmness_display']))
    if p.get('removable_cover') is not None:
        out.append(('Rivestimento', 'Sfoderabile' if p['removable_cover'] else 'Fisso'))
    if p.get('reversible'):
        out.append(('Lati', 'Invernale ed estivo'))
    out.append(('Misure', '13, da 80×190 a 180×200'))
    return ''.join(f'<div><dt>{E(k)}</dt><dd>{E(v)}</dd></div>' for k, v in out)

def footer(n, label):
    return (f'<footer class="pf"><img src="file://{HERE}/marchio-blu.png" alt=""><span>{E(label)}</span>'
            f'<span class="pn">{n:02d}</span></footer>')

pages = []
pn = [0]
def page(body, cls='', label=None):
    pn[0] += 1
    f = footer(pn[0], label) if label else ''
    pages.append(f'<section class="page {cls}">{body}{f}</section>')

# ------------------------------------------------------------------ copertina
page(f'''
<div class="cover__photo" style="background-image:url('{img('hero-vesuvio-1536.webp', 1600)}')"></div>
{seam('seam--cover')}
<div class="cover__panel">
  <img class="cover__logo" src="file://{HERE}/logo-bianco.png" alt="Vesuvio Sleep">
  <div class="cover__text">
    <h1>Catalogo prodotti</h1>
    <p>Materassi, reti, topper e guanciali prodotti nella nostra fabbrica di Casoria, dal 1986.</p>
    <p class="cover__ed">Listino 2026 · prezzi di fabbrica, IVA inclusa</p>
  </div>
</div>''', 'cover')

# ------------------------------------------------------------------ la fabbrica
page(f'''
<div class="hero-photo" style="background-image:url('{img('foto/fabbrica-panoramica-1600.webp', 1600)}')"></div>
<div class="intro">
  <div class="intro__lead">
    <h2>Dalla fabbrica a casa tua, senza passaggi in mezzo</h2>
    <p>Produciamo materassi a Casoria dal 1986. Taglio, assemblaggio e cucitura avvengono nello stesso stabilimento dove c'è lo showroom: puoi provare i modelli e sceglierli con chi li fa.</p>
    <p>Vendiamo direttamente. Per questo i prezzi di questo catalogo sono prezzi di fabbrica, IVA inclusa, e la spedizione in Italia è gratuita.</p>
  </div>
  <dl class="numbers">
    <div><dt>1986</dt><dd>l'anno in cui abbiamo iniziato</dd></div>
    <div><dt>13</dt><dd>misure standard per ogni modello, più il fuori misura</dd></div>
    <div><dt>2 giorni</dt><dd>circa, per produrre il tuo materasso prima della spedizione</dd></div>
    <div><dt>0 €</dt><dd>di spedizione in tutta Italia, isole comprese</dd></div>
  </dl>
</div>
<div class="contents">
  <h3>In questo catalogo</h3>
  <ol>
    <li><span>La gamma dei materassi a colpo d'occhio</span><b>03</b></li>
    <li><span>Sei materassi, strato per strato</span><b>04</b></li>
    <li><span>Reti a doghe</span><b>10</b></li>
    <li><span>Topper e guanciali</span><b>11</b></li>
    <li><span>Le misure e come ordinare</span><b>12</b></li>
  </ol>
</div>''', 'p-intro', 'La fabbrica')

# ------------------------------------------------------------------ gamma
cards = ''.join(f'''<div class="gcard">
  <img src="{img(f'prodotti/vesuvio-{s}/hero-1200.webp', 700, PAPER, .18)}" alt="">
  <h4>{E(name_of(by[s]))}</h4><p>{E(by[s]['short'])}</p></div>''' for s in MATTRESSES)
rows = ''.join(f'''<tr><th>{E(name_of(by[s]))}</th><td>{TECH[s]}</td>
  <td>{' · '.join(str(h) for h in heights(by[s]))}&nbsp;cm</td>
  <td>{E(by[s].get('firmness_display') or '—')}</td>
  <td>{yesno(by[s].get('removable_cover'))}</td>
  <td class="num">da {eur(min(v['eur'] for v in by[s]['variants']))}</td></tr>''' for s in MATTRESSES)
page(f'''
<header class="ph"><h2>La gamma dei materassi</h2>
<p>Dal poliuretano essenziale alle molle insacchettate con Memory Foam. Tutti i modelli esistono nelle 13 misure standard e si producono anche fuori misura.</p></header>
<div class="grid6">{cards}</div>
<table class="compare"><thead><tr><th>Modello</th><th>Costruzione</th><th>Altezze</th><th>Rigidità</th><th>Sfoderabile</th><th class="num">Prezzo</th></tr></thead>
<tbody>{rows}</tbody></table>
<p class="fine">Rigidità: dove non è indicata, il modo migliore per sceglierla è provarlo in showroom. Prezzi riferiti alla misura più piccola e all'altezza più bassa.</p>''', 'p-range', 'La gamma')

# ------------------------------------------------------------------ materassi
for s in MATTRESSES:
    p = by[s]
    base = f'prodotti/vesuvio-{s}'
    claims = ''.join(f'<li>{E(c)}</li>' for c in p.get('claims') or [])
    layers = ''.join(f'<li><b>{E(a)}</b><span>{E(b)}</span></li>' for a, b in LAYERS[s])
    page(f'''
<header class="mh">
  <p class="mh__tech">{E(p['technical_name'])}</p>
  <h2>{E(name_of(p))}</h2>
  <p class="mh__short">{E(p['short'])}</p>
</header>
<div class="mtop">
  <div class="mtop__img"><img src="{img(base + '/hero-1200.webp')}" alt=""></div>
  <div class="mtop__side">
    <dl class="facts">{facts(p)}</dl>
    {f'<ul class="claims">{claims}</ul>' if claims else ''}
    <div class="detail"><img src="{img(base + '/detail-1200.webp', 800)}" alt=""></div>
  </div>
</div>
<p class="mdesc">{E(p['description'])}</p>
<div class="mbottom">
  <div class="layers">
    <h3>Strato per strato</h3>
    <img src="{img(base + '/exploded-1200.webp', 700, PAPER, 0)}" alt="">
    <ol>{layers}</ol>
  </div>
  <div class="ptable">
    <h3>Misure e prezzi</h3>
    {price_table(p)}
  </div>
</div>''', 'p-matt', f'Materassi · {name_of(p)}')

# ------------------------------------------------------------------ reti
fl, st = by['rete-flex'], by['rete-strong']
def reti_card(p, a, b):
    hl = ''.join(f'<li>{E(h)}</li>' for h in p['highlights'])
    return f'''<div class="rcard"><div class="rcard__img"><img src="{img('foto/' + a, 900)}" alt=""></div>
      <h3>{E(name_of(p))}</h3><p>{E(p['description'])}</p><ul class="tags">{hl}</ul></div>'''
cols = [('Flex', {v['size']: v['eur'] for v in fl['variants']}), ('Strong', {v['size']: v['eur'] for v in st['variants']})]
page(f'''
<header class="ph"><h2>Reti a doghe</h2>
<p>{E(cat['reti']['description'])} Ogni rete è nelle stesse 13 misure dei materassi.</p></header>
<div class="reti">{reti_card(fl, 'rete-flex-34-1600.webp', '')}{reti_card(st, 'rete-strong-34-1600.webp', '')}</div>
<div class="reti__bottom">
  <div class="reti__detail"><img src="{img('foto/rete-strong-dettaglio-1600.webp', 900)}" alt=""><p>Telaio in acciaio e doghe in legno: il dettaglio della Rete Strong.</p></div>
  <div class="ptable"><h3>Misure e prezzi</h3>{price_table(None, cols)}</div>
</div>''', 'p-reti', 'Reti')

# ------------------------------------------------------------------ topper e guanciali
tp = by['topper-memory-cloud-5']
tmap = {v['size']: v['eur'] for v in tp['variants']}
half = lambda ss: ''.join(f'<tr><td class="sz">{sz(s)}</td><td class="num">{eur(tmap[s])}</td></tr>' for s in ss)
pillows = ['guanciale-memory-flakes', 'guanciale-memory-classic', 'guanciale-memory-cervical', 'guanciale-piuma']
pcards = ''.join(f'''<div class="pcard"><div class="pcard__img"><img src="{img('foto/' + s + '-1600.webp', 800)}" alt=""></div>
  <div class="pcard__t"><h4>{E(name_of(by[s]))}</h4><b>{eur(by[s]['variants'][0]['eur'])}</b></div>
  <p>{E(by[s]['short'])}</p><p class="pcard__m">{E(by[s]['composition'].rstrip('.'))} · alto 12 cm</p></div>''' for s in pillows)
page(f'''
<header class="ph"><h2>Per completare il letto</h2></header>
<div class="topper">
  <div class="topper__img"><img src="{img('prodotti/vesuvio-topper-memory-cloud-5/hero-1200.webp')}" alt=""></div>
  <div class="topper__txt">
    <h3>{E(name_of(tp))}</h3>
    <p>{E(tp['description'])} Si appoggia sul materasso per renderlo più accogliente.</p>
    <div class="topper__tables"><table class="prices mini"><tbody>{half(SIZES[:7])}</tbody></table>
    <table class="prices mini"><tbody>{half(SIZES[7:])}</tbody></table></div>
  </div>
</div>
<h3 class="sub">Guanciali</h3>
<div class="pillows">{pcards}</div>''', 'p-extra', 'Topper e guanciali')

# ------------------------------------------------------------------ misure e ordini
size_rows = ''.join(f'<tr{" class=grp" if s in GROUP_END else ""}><td class="sz">{sz(s)}</td><td>{SIZE_NAMES[s]}</td></tr>' for s in SIZES)
def rect(s):
    w, l = (int(x) for x in s.split('x'))
    return f'<rect x="{(180 - w) / 2}" y="{200 - l}" width="{w}" height="{l}" rx="3"/>'
svg_sizes = ''.join(rect(s) for s in ['80x190', '90x200', '120x190', '140x200', '160x190', '180x200'])
page(f'''
<header class="ph"><h2>Le misure e come ordinare</h2></header>
<div class="howto">
  <div class="sizes">
    <h3>Quale misura?</h3>
    <p>Il singolo è largo 80 o 90 cm, la piazza e mezza 120, il francese 140, il matrimoniale 160 o 165; il 170×200 e il King Size 180×200 danno più spazio a chi dorme in due. Se sei più alto di 1,80 m, scegli la lunghezza 200.</p>
    <div class="sizes__wrap">
      <table class="prices sizes__t"><tbody>{size_rows}</tbody></table>
      <svg class="sizes__svg" viewBox="-4 -4 188 208" aria-hidden="true">{svg_sizes}</svg>
    </div>
    <p class="note"><b>Fuori misura.</b> Ogni materasso si produce anche su misura, in larghezza, lunghezza e altezza: chiedici un preventivo.</p>
  </div>
  <div class="order">
    <h3>Come ordinare</h3>
    <ol class="steps">
      <li><b>Scegli</b><span>modello e misura, su vesuviosleep.it, da questo catalogo o in showroom.</span></li>
      <li><b>Scrivici su WhatsApp</b><span>al 366 121 8346: confermiamo disponibilità, data di consegna e totale.</span></li>
      <li><b>Paghi come preferisci</b><span>in contrassegno alla consegna oppure con bonifico.</span></li>
      <li><b>Lo produciamo</b><span>in circa 2 giorni e lo spediamo, gratis in tutta Italia, isole comprese.</span></li>
    </ol>
    <div class="services">
      <p><b>Letto completo.</b> Materasso, rete e guanciali insieme costano meno: le offerte del momento sono sul sito.</p>
    </div>
  </div>
</div>
<figure class="delivery"><div style="background-image:url('{img('foto/consegna-furgone-1600.webp', 1600)}')"></div>
<figcaption>Spedizione gratuita in tutta Italia, isole comprese. A Napoli portiamo il materasso fino al piano.</figcaption></figure>''', 'p-howto', 'Misure e ordini')

# ------------------------------------------------------------------ retro
page(f'''
<div class="back__photo" style="background-image:url('{img('foto/showroom-1600.webp', 1600)}')"></div>
<div class="back__body">
  <img class="back__logo" src="file://{HERE}/logo-bianco.png" alt="Vesuvio Sleep">
  <div class="back__cols">
    <div><h3>Showroom e fabbrica</h3><p>Via Raffaele Salierno 38<br>80026 Casoria (NA)</p>
      <p>Lunedì–venerdì 9:00–18:00<br>Sabato 10:00–14:00<br>Domenica chiuso</p></div>
    <div><h3>Contatti</h3><p>WhatsApp e telefono<br><b>366 121 8346</b></p><p>fdimaterassi@gmail.com<br>vesuviosleep.it</p></div>
  </div>
  {seam('seam--back')}
  <p class="back__legal">MATERASSI D'AUTORE A.V. S.R.L.S. · P.IVA 10456501211 · REA NA-1107535<br>
  Prezzi in euro, IVA inclusa, validi dal {datetime.date.today().strftime('%d/%m/%Y')} salvo variazioni; fanno fede quelli confermati per iscritto. Foto a scopo illustrativo.</p>
</div>''', 'back')

css = open(f'{HERE}/catalogo.css').read()
open(f'{HERE}/catalogo.html', 'w').write(f'''<!doctype html><html lang="it"><head><meta charset="utf-8">
<title>Vesuvio Sleep — Catalogo prodotti 2026</title><style>{css}</style></head><body>{''.join(pages)}</body></html>''')
print('pagine', pn[0] + 1 if False else len(pages))
