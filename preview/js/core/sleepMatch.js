const W = { lt60: 0, '60-85': 1, '85-110': 2, gt110: 3 };
/**
 * Restituisce UN solo materasso reale e acquistabile. Nessun budget, nessuna diagnosi.
 * Le motivazioni citano solo caratteristiche documentate del prodotto.
 */
export function sleepMatch(idx, a) {
    const candidates = idx.publicProducts('materasso').filter((p) => p.match);
    if (!candidates.length)
        return null;
    const sleepers = [a.me, ...(a.sleepers === 'couple' && a.partner ? [a.partner] : [])];
    const maxW = Math.max(...sleepers.map((s) => W[s.weight]));
    const feels = sleepers.map((s) => s.feel);
    const wantsWelcome = feels.includes('accogliente') && !feels.includes('sostenuto');
    const wantsSupport = feels.includes('sostenuto') && !feels.includes('accogliente');
    const mixedFeel = feels.includes('accogliente') && feels.includes('sostenuto');
    let best = null;
    for (const p of candidates) {
        const t = p.match;
        let s = 0;
        const r = [];
        const add = (pts, reason) => {
            s += pts;
            if (reason && pts > 0)
                r.push([pts, reason]);
        };
        if (t.independent_springs) {
            if (maxW >= 2)
                add(3, 'Le molle indipendenti insacchettate offrono un sostegno pensato anche per corporature più robuste.');
            if (a.sleepers === 'couple' && a.partnerMotion === 'importante')
                add(4, 'Le molle insacchettate lavorano in modo indipendente: aiuta a percepire meno i movimenti di chi dorme accanto.');
            else if (a.sleepers === 'couple')
                add(1);
            if (wantsSupport)
                add(2, 'Ha una risposta sostenuta, come preferisci.');
            if (mixedFeel)
                add(1);
        }
        if (t.tech === 'memory') {
            if (wantsWelcome)
                add(3, 'Lo strato in Memory Foam rende il piano più accogliente, come preferisci.');
            if (a.position === 'fianco' || a.focus === 'spalle')
                add(2, 'Chi dorme sul fianco di solito apprezza un piano accogliente in corrispondenza delle spalle.');
        }
        if (t.ventilation) {
            if (a.heat === 'spesso')
                add(4, 'La fascia perimetrale 3D traspirante favorisce il ricambio d\'aria lungo i lati.');
            if (a.heat === 'a-volte')
                add(2, 'La fascia perimetrale 3D traspirante aiuta il ricambio d\'aria.');
        }
        if (p.summer_winter && a.heat !== 'raramente')
            add(1, 'È reversibile, con un lato invernale e uno estivo.');
        if (t.tech === 'foam') {
            if (!wantsWelcome && maxW <= 1)
                add(2, 'L\'anima monoblocco in poliuretano ad alta densità dà un sostegno uniforme.');
            if (a.focus === 'schiena' && maxW <= 1)
                add(1);
            if (a.position === 'pancia')
                add(1);
        }
        if (a.position === 'pancia' && t.welcome <= 1)
            add(1);
        if (a.focus === 'schiena' && t.welcome <= 1 && maxW >= 2)
            add(1);
        if (a.tech !== 'non-so' && a.tech === t.tech)
            add(2, 'Corrisponde alla tecnologia che preferisci.');
        if (a.removable) {
            if (p.removable_cover)
                add(1, 'Ha il rivestimento sfoderabile.');
            else
                add(-6);
        }
        // a parità di punteggio vince l'ordine di catalogo (candidates è già ordinato)
        if (!best || s > best.s)
            best = { p, s, r };
    }
    if (!best)
        return null;
    const reasons = best.r.sort((x, y) => y[0] - x[0]).map((x) => x[1]);
    const uniq = [...new Set(reasons)].slice(0, 3);
    if (uniq.length < 2 && best.p.composition)
        uniq.push(best.p.composition);
    const heights = idx.purchasableHeights(best.p);
    let height = null;
    let heightReason = null;
    if (heights.length) {
        const max = heights[heights.length - 1];
        if ((maxW >= 2 || a.sleepers === 'couple') && heights.length > 1) {
            height = max;
            heightReason = `Ti proponiamo H${max}, la più alta disponibile per questo modello: è la scelta che suggeriamo per ${a.sleepers === 'couple' ? 'chi dorme in due' : 'corporature più robuste'}.`;
        }
        else {
            height = heights.includes(25) ? 25 : heights[0];
            heightReason = heights.length > 1 ? `H${height} è un buon punto di partenza; nella scheda puoi scegliere le altre altezze.` : null;
        }
        if (heights.length === 1) {
            heightReason = `Online è disponibile in H${height}; per altre altezze puoi chiedere un preventivo.`;
        }
    }
    return { product: best.p, height, reasons: uniq.slice(0, 3), heightReason };
}
