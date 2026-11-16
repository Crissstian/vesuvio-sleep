"""Unisce i moduli ES della preview in un unico script classico (js/bundle.js).

Perché: il visualizzatore degli artifact esegue la pagina in un frame isolato,
dove i <script type="module"> caricati da file possono essere bloccati (CORS su
origine opaca). Uno script classico funziona sempre.

Supporta solo lo stile usato nel progetto: import { a, b } from './x.js',
export function/const/let/class, export * from './y.js', export { a },
import('./z.js') dinamico.
"""
import os, re, sys, json

ROOT = sys.argv[1] if len(sys.argv) > 1 else 'preview/js'
ENTRY = 'app.js'
# --seed <file>: usa un altro catalogo al posto di seed.js (il sito pubblico usa
# seed.public.js, senza bozze, archiviati e note interne).
SEED_SRC = None
if '--seed' in sys.argv:
    SEED_SRC = sys.argv[sys.argv.index('--seed') + 1]
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
mods, order = {}, []

def norm(base, rel):
    return os.path.normpath(os.path.join(os.path.dirname(base), rel)).replace('\\', '/')

def load(path):
    if path in mods:
        return
    file = SEED_SRC if (SEED_SRC and path == 'seed.js') else os.path.join(ROOT, path)
    src = open(file, encoding='utf-8').read()
    # il bundler riscrive solo gli import con le graffe: se ne sfugge uno di altra forma
    # finirebbe nel bundle così com'è e il browser lo rifiuterebbe. Meglio fermarsi qui.
    bad = [l for l in src.splitlines() if l.startswith('import ') and ' from ' in l and not l.lstrip().startswith('import {')]
    if bad:
        raise SystemExit(f"{path}: forma di import non supportata dal bundler: {bad[0]}")
    mods[path] = None
    deps = re.findall(r"""from\s+['"](\.[^'"]+)['"]""", src) + re.findall(r"""import\(\s*['"](\.[^'"]+)['"]\s*\)""", src)
    for d in deps:
        load(norm(path, d))
    exports, body = [], src
    def imp(m):
        names, rel = m.group(1), m.group(2)
        names = re.sub(r'\s+as\s+', ': ', names.strip())
        return f"const {{{names}}} = __req({json.dumps(norm(path, rel))});"
    body = re.sub(r"""import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?""", imp, body)
    body = re.sub(r"""import\(\s*['"]([^'"]+)['"]\s*\)""", lambda m: f"Promise.resolve(__req({json.dumps(norm(path, m.group(1)))}))", body)
    def star(m):
        return f"Object.assign(__exp, __req({json.dumps(norm(path, m.group(1)))}));"
    body = re.sub(r"""export\s*\*\s*from\s*['"]([^'"]+)['"];?""", star, body)
    def named(m):
        exports.extend(n.strip() for n in m.group(1).split(',') if n.strip())
        return ''
    body = re.sub(r"export\s*\{([^}]*)\};?", named, body)
    def decl(m):
        kw, name = m.group(1), m.group(2)
        exports.append(name)
        return f"{kw} {name}"
    body = re.sub(r"export\s+(async function\*?|function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)", decl, body)
    body = re.sub(r"^//# sourceMappingURL.*$", '', body, flags=re.M)
    tail = '\n'.join(f"__exp.{n} = {n};" for n in exports)
    mods[path] = f"__def({json.dumps(path)}, function (__exp) {{\n{body}\n{tail}\n}});"
    order.append(path)

load(ENTRY)
out = ["/* Generato da scripts/bundle.py: non modificare a mano. */", "(function () {", "'use strict';",
       "const __defs = {}, __cache = {};",
       "function __def(n, f) { __defs[n] = f; }",
       "function __req(n) { if (!__cache[n]) { __cache[n] = {}; __defs[n](__cache[n]); } return __cache[n]; }"]
out += [mods[p] for p in order]
out += [f"__req({json.dumps(ENTRY)});", "})();"]
open(OUT or os.path.join(ROOT, 'bundle.js'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print('bundle:', ', '.join(order))
