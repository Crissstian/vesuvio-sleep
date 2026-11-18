"""Prepara le foto per la stampa: JPEG compressi alla risoluzione che serve (~200 dpi).
Le foto scontornate vengono appoggiate sul colore di fondo, con l'ombra già disegnata."""
import os, hashlib
from PIL import Image, ImageFilter
SITE = '/home/claude/vesuvio-sleep-concept/preview/img'
OUT = '/home/claude/catalogo/assets'
os.makedirs(OUT, exist_ok=True)
def _hex(c): c = c.lstrip('#'); return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))
def asset(src, width=1000, bg=None, shadow=0.22, q=82):
    path = src if src.startswith('/') else f'{SITE}/{src}'
    key = hashlib.md5(f'{path}|{width}|{bg}|{shadow}|{q}'.encode()).hexdigest()[:10]
    out = f'{OUT}/{os.path.basename(path).split(".")[0]}-{key}.jpg'
    if os.path.exists(out): return 'file://' + out
    im = Image.open(path)
    has_alpha = im.mode in ('RGBA', 'LA') or 'transparency' in im.info
    if has_alpha:
        im = im.convert('RGBA'); bb = im.getchannel('A').getbbox(); im = im.crop(bb)
        pad = int(im.width * .07)
        W, H = im.width + 2 * pad, im.height + 2 * pad
        canvas = Image.new('RGB', (W, H), _hex(bg or '#ffffff'))
        if shadow:
            a = im.getchannel('A').point(lambda v: int(v * shadow))
            sh = Image.new('L', (W, H), 0)
            # ombra schiacciata e spostata in basso, come un oggetto appoggiato
            sh.paste(a.resize((im.width, int(im.height * .9))), (pad, pad + int(im.height * .16)))
            sh = sh.filter(ImageFilter.GaussianBlur(im.width * .025))
            canvas.paste(Image.new('RGB', (W, H), (14, 40, 52)), (0, 0), sh)
        canvas.paste(im, (pad, pad), im)
        im = canvas
    else:
        im = im.convert('RGB')
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(out, 'JPEG', quality=q, optimize=True, progressive=True)
    return 'file://' + out
