"""Genera gli asset pubblici della preview a partire da input-vesuvio/asset.
Solo gli asset approvati per l'uso pubblico (vedi MAPPA_ASSET.md)."""
import sys, os
from PIL import Image
SRC = sys.argv[1]; OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)
def save(im, name, w=None, q=80):
    if w and im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    p = os.path.join(OUT, name)
    if name.endswith('.webp'): im.save(p, 'WEBP', quality=q, method=6)
    else: im.save(p, optimize=True)
    print(name, im.size, os.path.getsize(p)//1024, 'KB')
logo = Image.open(f'{SRC}/brand/logo-vesuvio-sleep-trasparente.png').convert('RGBA')
bb = logo.split()[3].getbbox()
lc = logo.crop((bb[0]-8, bb[1]-8, bb[2]+8, bb[3]+8))
save(lc, 'logo.webp', 240, 90); save(lc, 'logo.png', 240)
sym = logo.crop((290, 192, 735, 490))
sq = Image.new('RGBA', (sym.width, sym.width), (0,0,0,0)); sq.paste(sym, (0, (sym.width-sym.height)//2))
save(sq, 'favicon.png', 64); save(sq.copy(), 'apple-touch-icon.png', 180)
web = f'{SRC}/web'
h = Image.open(f'{web}/hero-mediterranea.webp')
save(h, 'hero-1672.webp', 1672, 78); save(h, 'hero-960.webp', 960, 76)
for n in ['pocket-2400-cutaway', 'pocket-2400-esploso']:
    im = Image.open(f'{web}/{n}.webp')
    save(im, f'{n}-1200.webp', 1200, 80); save(im, f'{n}-720.webp', 720, 78)
lv = Image.open(f'{web}/lavorazione-illustrativa.webp')
save(lv, 'lavorazione-1600.webp', 1600, 76); save(lv, 'lavorazione-900.webp', 900, 74)
