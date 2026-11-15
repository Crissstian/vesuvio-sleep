"""Converte le immagini prodotto approvate (MEDIA_MANIFEST.csv) in WebP responsive.
Uso: python3 -I scripts/build_product_images.py input-vesuvio/catalogo-2026-11-15 preview/img/prodotti
Le righe NON_ASSEGNATO / NON_PUBBLICARE (es. Grafeno) vengono saltate."""
import sys, os, csv, json
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
manifest = list(csv.DictReader(open(os.path.join(src, '03_DOCUMENTAZIONE/MEDIA_MANIFEST.csv'), encoding='utf-8-sig'), delimiter=';'))
done = []
for row in manifest:
    if row['stato'] != 'APPROVATA_PER_ASSOCIAZIONE' or row['prodotto'] == 'NON_ASSEGNATO':
        print('saltata:', row['percorso_zip'], row['stato'])
        continue
    im = Image.open(os.path.join(src, row['percorso_zip'])).convert('RGB')
    folder = os.path.join(out, row['prodotto'])
    os.makedirs(folder, exist_ok=True)
    widths = [1536, 900] if im.width > im.height else [1200, 720]
    files = []
    for w in widths:
        r = im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        name = f"{row['ruolo']}-{r.width}.webp"
        r.save(os.path.join(folder, name), 'WEBP', quality=82 if w > 900 else 78, method=6)
        files.append((name, r.width, r.height))
    done.append(dict(prodotto=row['prodotto'], ruolo=row['ruolo'], files=files))
json.dump(done, open(os.path.join(out, 'manifest.json'), 'w'), indent=1)
print(len(done), 'immagini convertite')
