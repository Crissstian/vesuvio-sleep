"""Converte le foto generate (input-vesuvio/asset/foto-generate) in WebP responsive.
Uso: python3 -I scripts/build_photos.py input-vesuvio/asset/foto-generate preview/img/foto"""
import sys, os, glob
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
for f in sorted(glob.glob(os.path.join(src, '*.jpg'))):
    name = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f).convert('RGB')
    widths = [1600, 900] if im.width >= im.height else [900, 600]
    for w in widths:
        r = im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        p = os.path.join(out, f'{name}-{w}.webp')
        r.save(p, 'WEBP', quality=78 if w > 900 else 74, method=6)
    print(name, im.size)
