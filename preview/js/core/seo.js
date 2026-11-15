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
    telephone: '+39 366 121 8346',
    email: 'fdimaterassi@gmail.com',
    whatsapp: '+393661218346',
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
/** Spedizione gratuita in Italia e reso entro 14 giorni: le due informazioni che Google mostra nei risultati prodotto. */
function offerExtras(site) {
    return {
        seller: { '@type': 'Organization', name: BUSINESS.name },
        shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'EUR' },
            shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IT' },
        },
        hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            applicableCountry: 'IT',
            returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
            merchantReturnDays: 14,
            returnMethod: 'https://schema.org/ReturnByMail',
            returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
            merchantReturnLink: site ? `${site}/resi-e-recesso/` : undefined,
        },
    };
}
/** Dati strutturati prodotto: solo prezzi e stati reali, nessuna recensione inventata. */
export function productJsonLd(idx, p, opts = {}) {
    const vs = idx.purchasableVariants(p);
    if (!vs.length)
        return null;
    const low = idx.minPrice(p);
    const high = idx.maxPrice(p);
    const avail = AV[vs[0].availability] ?? 'https://schema.org/MadeToOrder';
    const extras = offerExtras(opts.site);
    const ld = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: [p.short, p.description].filter(Boolean).join(' '),
        brand: { '@type': 'Brand', name: BUSINESS.name },
        manufacturer: { '@type': 'Organization', name: BUSINESS.legalName },
        category: p.technical_name || undefined,
        sku: vs.length === 1 ? vs[0].sku : undefined,
        offers: vs.length === 1
            ? { '@type': 'Offer', priceCurrency: 'EUR', price: (low / 100).toFixed(2), availability: avail, url: opts.url, itemCondition: 'https://schema.org/NewCondition', ...extras }
            : {
                '@type': 'AggregateOffer',
                priceCurrency: 'EUR',
                lowPrice: (low / 100).toFixed(2),
                highPrice: (high / 100).toFixed(2),
                offerCount: vs.length,
                availability: avail,
                url: opts.url,
                offers: vs.map((v) => ({
                    '@type': 'Offer',
                    sku: v.sku,
                    name: [p.name, v.size ? v.size.replace('x', '×') : '', v.height_cm && vs.some((x) => x.height_cm !== v.height_cm) ? `H${v.height_cm}` : ''].filter(Boolean).join(' '),
                    priceCurrency: 'EUR',
                    price: (v.price_cents / 100).toFixed(2),
                    availability: AV[v.availability] ?? avail,
                    itemCondition: 'https://schema.org/NewCondition',
                    ...extras,
                })),
            },
    };
    if (opts.images?.length)
        ld.image = opts.images;
    if (opts.url)
        ld.url = opts.url;
    return JSON.parse(JSON.stringify(ld));
}
export function localBusinessJsonLd(url, opts = {}) {
    return JSON.parse(JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FurnitureStore',
        '@id': url ? `${url.replace(/\/$/, '')}/#azienda` : undefined,
        name: BUSINESS.name,
        legalName: BUSINESS.legalName,
        vatID: 'IT' + BUSINESS.vat,
        foundingDate: String(BUSINESS.since),
        url,
        image: opts.image,
        logo: opts.logo,
        telephone: BUSINESS.telephone,
        email: BUSINESS.email,
        paymentAccepted: 'Contrassegno, bonifico bancario',
        currenciesAccepted: 'EUR',
        areaServed: { '@type': 'Country', name: 'Italia' },
        address: {
            '@type': 'PostalAddress',
            streetAddress: BUSINESS.street,
            postalCode: BUSINESS.postalCode,
            addressLocality: BUSINESS.locality,
            addressRegion: BUSINESS.region,
            addressCountry: BUSINESS.country,
        },
        openingHoursSpecification: BUSINESS.hours.map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.days, opens: h.opens, closes: h.closes })),
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            telephone: BUSINESS.telephone,
            email: BUSINESS.email,
            availableLanguage: 'Italian',
        },
    }));
}
export function breadcrumbJsonLd(items) {
    return JSON.parse(JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
    }));
}
export function faqJsonLd(items) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((it) => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } })),
    };
}
export function websiteJsonLd(site) {
    return { '@context': 'https://schema.org', '@type': 'WebSite', name: BUSINESS.name, url: site + '/', inLanguage: 'it-IT' };
}
/** Sitemap con le sole pagine indicizzabili (anche immagini). Si pubblica solo sul dominio reale. */
export function buildSitemap(baseUrl, entries) {
    const base = baseUrl.replace(/\/$/, '');
    const x = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
        ...entries.map((e) => `  <url><loc>${x(base + e.path)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}${(e.images ?? [])
            .map((i) => `<image:image><image:loc>${x(i)}</image:loc></image:image>`)
            .join('')}</url>`),
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
