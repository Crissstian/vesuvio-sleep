// Scrive la hero (illustrazione di Napoli) direttamente in preview/index.html,
// così l'apertura si vede anche prima che parta JavaScript.
import { readFileSync, writeFileSync } from 'node:fs';
import { heroHtml } from '../preview/js/hero.js';
const file = new URL('../preview/index.html', import.meta.url);
const html = readFileSync(file, 'utf8');
const a = html.indexOf('<main id="app" tabindex="-1">') + '<main id="app" tabindex="-1">'.length;
const b = html.indexOf('</main>');
writeFileSync(file, html.slice(0, a) + '\n' + heroHtml() + '\n  ' + html.slice(b));
console.log('hero statica aggiornata');
