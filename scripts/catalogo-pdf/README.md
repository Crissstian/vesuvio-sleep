# Catalogo PDF

Genera `Vesuvio_Sleep_Catalogo_2026.pdf` (A4, 13 pagine) dai dati del sito.

    mkdir -p /home/claude/catalogo && cp scripts/catalogo-pdf/* /home/claude/catalogo/
    cd /home/claude/catalogo
    node extract.mjs      # prodotti pubblicati, misure e prezzi da preview/js/seed.js
    python3 build.py      # catalogo.html (foto compresse in assets/)
    node render.mjs       # PDF con Chromium + controllo sbordi

Prezzi e prodotti arrivano dal listino del sito: dopo un cambio prezzi basta rigenerare.
