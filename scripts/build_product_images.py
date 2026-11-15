"""Converte le immagini prodotto approvate (MEDIA_MANIFEST.csv) in WebP responsive.
Uso: python3 -I scripts/build_product_images.py input-vesuvio/catalogo-2026-11-15 preview/img/prodotti
Le righe NON_ASSEGNATO / NON_PUBBLICARE (es. Grafeno) vengono saltate."""
import sys, os, csv, json
from PIL import Image, ImageChops
import numpy as np

ASPECT = 4 / 3   # stesso formato per card e galleria: il prodotto resta al centro in entrambe


def center_on_white(im):
    """Foto su fondo bianco: ritaglia il bianco in eccesso e rimette il prodotto
    esattamente al centro di una tela 4:3, con margini uguali. Il contenuto della
    foto non cambia; ombre e riflessi restano interi."""
    diff = ImageChops.difference(im, Image.new('RGB', im.size, (255, 255, 255))).convert('L')
    outer = diff.point(lambda v: 255 if v > 6 else 0).getbbox()      # tutto, ombra compresa
    obj = diff.point(lambda v: 255 if v > 40 else 0).getbbox()       # il materasso
    if not outer or not obj:
        return im, None
    cx, cy = (obj[0] + obj[2]) / 2, (obj[1] + obj[3]) / 2
    hw = max(cx - outer[0], outer[2] - cx) * 1.07
    hh = max(cy - outer[1], outer[3] - cy) * 1.10
    W = max(2 * hw, 2 * hh * ASPECT)
    H = W / ASPECT
    W, H = round(W), round(H)
    canvas = Image.new('RGB', (W, H), (255, 255, 255))
    crop = im.crop(outer)
    ox, oy = round(W / 2 - (cx - outer[0])), round(H / 2 - (cy - outer[1]))
    canvas.paste(crop, (ox, oy))
    sh = lambda b: (b[0] - outer[0] + ox, b[1] - outer[1] + oy, b[2] - outer[0] + ox, b[3] - outer[1] + oy)
    return canvas, (sh(obj), sh(outer))


def white_to_alpha(im, boxes=None):
    """Il bianco diventa trasparente, le ombre semitrasparenti: sopra un fondo bianco
    l'immagine resta identica, sopra il fondo del sito si fonde senza riquadri
    (anche mentre è animata, cosa che mix-blend-mode non garantisce)."""
    c = np.asarray(im, dtype=np.float32)
    a = (255.0 - c.min(axis=2)) / 255.0
    a = np.clip((a - 0.012) / 0.988, 0, 1)            # il bianco quasi puro diventa del tutto trasparente
    if boxes:
        # il fondale grigio chiaro di alcune foto sfuma a zero prima del bordo del ritaglio:
        # niente riquadri visibili sul fondo del sito
        (ol, ot, orr, ob), (ul, ut, ur, ub) = boxes
        H, W = a.shape
        xs, ys = np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32)
        dx = np.maximum(np.maximum(ol - xs, 0) / max(1, ol - ul), np.maximum(xs - orr, 0) / max(1, ur - orr))
        dy = np.maximum(np.maximum(ot - ys, 0) / max(1, ot - ut), np.maximum(ys - ob, 0) / max(1, ub - ob))
        fade = np.clip(1 - np.maximum(dx[None, :], dy[:, None]), 0, 1) ** 1.4
        a = a * fade
    safe = np.maximum(a, 1e-4)[..., None]
    f = np.clip((c - (1 - a[..., None]) * 255.0) / safe, 0, 255)
    out = np.dstack([f, a * 255.0]).round().astype(np.uint8)
    return Image.fromarray(out, 'RGBA')
src, out = sys.argv[1], sys.argv[2]
manifest = list(csv.DictReader(open(os.path.join(src, '03_DOCUMENTAZIONE/MEDIA_MANIFEST.csv'), encoding='utf-8-sig'), delimiter=';'))
done = []
for row in manifest:
    if row['stato'] != 'APPROVATA_PER_ASSOCIAZIONE' or row['prodotto'] == 'NON_ASSEGNATO':
        print('saltata:', row['percorso_zip'], row['stato'])
        continue
    im = Image.open(os.path.join(src, row['percorso_zip'])).convert('RGB')
    if row['ruolo'] in ('hero', 'exploded'):
        im = white_to_alpha(*center_on_white(im))
    folder = os.path.join(out, row['prodotto'])
    os.makedirs(folder, exist_ok=True)
    widths = [1200, 720]
    files = []
    for w in widths:
        r = im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        name = f"{row['ruolo']}-{r.width}.webp"
        r.save(os.path.join(folder, name), 'WEBP', quality=80 if w > 900 else 76, method=6, alpha_quality=80)
        files.append((name, r.width, r.height))
    done.append(dict(prodotto=row['prodotto'], ruolo=row['ruolo'], files=files))
json.dump(done, open(os.path.join(out, 'manifest.json'), 'w'), indent=1)
print(len(done), 'immagini convertite')
