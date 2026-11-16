"""Aggiunge al catalogo foto prodotto consegnate fuori dal MEDIA_MANIFEST.csv.

Uso: python3 -I scripts/add_product_images.py input-vesuvio/foto-2026-11-16 preview/img/prodotti

Legge i file <cartella-prodotto>_<ruolo>.png, li lavora con la stessa pipeline delle foto
ufficiali (ritaglio del bianco, centratura su tela 4:3, bianco reso trasparente per hero ed
esploso) e li unisce a manifest.json senza toccare le righe già presenti.
"""
import sys, os, json, importlib.util
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('bpi', os.path.join(HERE, 'build_product_images.py'))
mod = importlib.util.module_from_spec(spec)
# build_product_images.py al caricamento esegue anche la conversione: ne prendiamo solo le funzioni
src_code = open(os.path.join(HERE, 'build_product_images.py'), encoding='utf-8').read()
head = src_code.split('src, out = sys.argv', 1)[0]
exec(compile(head, 'build_product_images.py', 'exec'), mod.__dict__)

SRC, OUT = sys.argv[1], sys.argv[2]
FOLDER = {'memory-trio': 'vesuvio-memory-trio', 'memory-duo-classic': 'vesuvio-memory-duo-classic',
          'pocket-1600': 'vesuvio-pocket-1600', 'topper-memory-cloud-5': 'vesuvio-topper-memory-cloud-5'}

manifest = json.load(open(os.path.join(OUT, 'manifest.json'), encoding='utf-8'))
added = 0
for f in sorted(os.listdir(SRC)):
    if not f.endswith('.png'):
        continue
    key, ruolo = f[:-4].rsplit('_', 1)
    prodotto = FOLDER[key]
    im = Image.open(os.path.join(SRC, f)).convert('RGB')
    if ruolo in ('hero', 'exploded'):
        im = mod.white_to_alpha(*mod.center_on_white(im))
    folder = os.path.join(OUT, prodotto)
    os.makedirs(folder, exist_ok=True)
    files = []
    for w in (1200, 720):
        r = im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        name = f'{ruolo}-{r.width}.webp'
        r.save(os.path.join(folder, name), 'WEBP', quality=80 if w > 900 else 76, method=6, alpha_quality=80)
        files.append((name, r.width, r.height))
    manifest = [m for m in manifest if not (m['prodotto'] == prodotto and m['ruolo'] == ruolo)]
    manifest.append(dict(prodotto=prodotto, ruolo=ruolo, files=files))
    added += 1
order = {'hero': 0, 'exploded': 1, 'detail': 2, 'fabric': 3}
manifest.sort(key=lambda m: (m['prodotto'], order.get(m['ruolo'], 9)))
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
print(added, 'immagini aggiunte,', len(manifest), 'in manifest')
