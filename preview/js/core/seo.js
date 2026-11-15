export const BUSINESS = {
    name: 'Vesuvio Sleep',
    legalName: "MATERASSI D'AUTORE A.V. S.R.L.S.",
    vat: '10456501211',
    street: 'Via Raffaele Salierno 38',
    postalCode: '80026',
    locality: 'Casoria',
    region: 'NA',
    country: 'IT',
    since: 1986,
    hours: [
        { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '18:00' },
        { days: ['Saturday'], opens: '10:00', closes: '14:00' },
    ],
};
const AV = {
    available: 'https://schema.org/InStock',
    in_production: 'https://schema.org/MadeToOrder',
    made_to_order: 'https://schema.org/MadeToOrder',
};
/** Dati strutturati prodotto: solo prezzi e stati reali, nessun rating. */
export function productJsonLd(idx, p, opts = {}) {
    const vs = idx.purchasableVariants(p);
    if (!vs.length)
        return null;
    const low = idx.minPrice(p);
    const high = idx.maxPrice(p);
    const avail = AV[vs[0].availability] ?? 'https://schema.org/MadeToOrder';
    const ld = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: p.short,
        brand: { '@type': 'Brand', name: BUSINESS.name },
        sku: vs.length === 1 ? vs[0].sku : undefined,
        offers: vs.length === 1
            ? { '@type': 'Offer', priceCurrency: 'EUR', price: (low / 100).toFixed(2), availability: avail, url: opts.url }
            : { '@type': 'AggregateOffer', priceCurrency: 'EUR', lowPrice: (low / 100).toFixed(2), highPrice: (high / 100).toFixed(2), offerCount: vs.length, availability: avail },
    };
    if (opts.images?.length)
        ld.image = opts.images;
    if (opts.url)
        ld.url = opts.url;
    return JSON.parse(JSON.stringify(ld));
}
export function localBusinessJsonLd(url) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FurnitureStore',
        name: BUSINESS.name,
        legalName: BUSINESS.legalName,
        vatID: BUSINESS.vat,
        foundingDate: String(BUSINESS.since),
        url,
        address: {
            '@type': 'PostalAddress',
            streetAddress: BUSINESS.street,
            postalCode: BUSINESS.postalCode,
            addressLocality: BUSINESS.locality,
            addressRegion: BUSINESS.region,
            addressCountry: BUSINESS.country,
        },
        openingHoursSpecification: BUSINESS.hours.map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.days, opens: h.opens, closes: h.closes })),
    };
}
export function breadcrumbJsonLd(items) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
    };
}
/** Sitemap con sole pagine pubblicabili; da servire solo sul dominio reale, mai in preview. */
export function buildSitemap(idx, baseUrl, staticPaths = ['/', '/sleep-match', '/confronto', '/guida-misure', '/fuori-misura', '/showroom']) {
    const base = baseUrl.replace(/\/$/, '');
    const urls = [
        ...staticPaths,
        ...idx.commercialCategories().map((c) => `/${c.slug}`),
        ...idx.publicProducts().map((p) => `/${idx.category(p).slug}/${p.slug}`),
    ];
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.map((u) => `  <url><loc>${base}${u}</loc></url>`),
        '</urlset>',
    ].join('\n');
}
/** Redirect degli slug cambiati (301 nell'app Next.js, cambio di hash nella preview). */
export function resolveRedirect(redirects, slug) {
    let cur = slug;
    for (let i = 0; i < 5; i++) {
        const r = redirects.find((x) => x.old_slug === cur);
        if (!r)
            break;
        cur = r.new_slug;
    }
    return cur === slug ? null : cur;
}
