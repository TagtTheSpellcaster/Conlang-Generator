// Phonotactic models and vowel inventories (data only).
export const VOWELS = {
    standard: ['a', 'e', 'i', 'o', 'u'],
    minimal: ['a', 'i', 'u'],
    extended: ['a', 'e', 'i', 'o', 'u', 'y', 'ø', 'æ']
};

export const MODEL = {
    isolated: { name: 'Minimalist Isolating', c: ['p','t','k','m','n','h','l'], onset: ['p','t','k','m','n','h','l'], coda: ['m','n','k'], patterns: ['CV','CV','CV','V'], maxClusters: 1 },
    japanese: { name: 'Controlled Open Syllable', c: ['p','t','k','b','d','g','m','n','s','z','h','r','f','j','w'], onset: ['p','t','k','b','d','g','m','n','s','z','h','r','f','j','w'], coda: ['n','m'], patterns: ['CV','CV','CV','CV','CVN','V'], maxClusters: 1 },
    european: {
        name: 'Balanced European',
        c: ['p','t','k','b','d','g','f','v','s','z','ʃ','m','n','r','l','j','w'],
        onset: ['p','t','k','b','d','g','f','v','s','z','ʃ','m','n','r','l','j','w'],
        coda: ['p','t','k','b','d','g','f','v','s','z','m','n','r','l'],
        clusters: ['pr','pl','tr','dr','kr','gr','br','bl','fr','fl','vr','vl','sp','st','sk','sm','sn','sl','sw','spr','str','skr','kl','gl','tw','dw','kw','gw'],
        patterns: ['CV','CV','CVC','CV','CCV','CVC','V'], maxClusters: 3,
        maxVowelRatio: 0.60
    },
    english: {
        name: 'Dynamic Anglo-Saxon',
        c: ['p','t','k','b','d','g','f','θ','s','z','ʃ','m','n','ŋ','r','l','j','w','h'],
        onset: ['p','t','k','b','d','g','f','θ','s','z','ʃ','m','n','ŋ','r','l','j','w','h'],
        coda: ['p','t','k','b','d','g','f','θ','s','z','ʃ','m','n','ŋ','r','l'],
        clusters: ['pl','pr','bl','br','tr','dr','kr','gr','kl','gl','fr','fl','θr','sp','st','sk','sm','sn','sl','sw','tw','dw','kw','gw','spl','spr','str','skr','skw'],
        patterns: ['CV','CVC','CV','CCV','CVC','CCVC','CVCC'], maxClusters: 3
    },
    slavic: {
        name: 'Compact Slavic',
        c: ['p','t','k','b','d','g','f','v','s','z','ʃ','m','n','r','l','j'],
        onset: ['p','t','k','b','d','g','f','v','s','z','ʃ','m','n','r','l','j'],
        coda: ['p','t','k','b','d','g','f','v','s','z','ʃ','m','n','r','l'],
        clusters: ['pr','pl','tr','dr','kr','gr','br','bl','fr','vr','kl','gl','st','sk','sp','sm','sn','sl','sv','zd','zv','str','spr','skr','skl','spl','sbr','zdr'],
        patterns: ['CV','CVC','CCV','CV','CCVC','CVCC','V'], maxClusters: 3
    },
    semitic: { name: 'Root-and-Pattern Semitic', c: ['b','t','k','d','g','f','s','z','ʃ','ħ','ʕ','m','n','r','l'], onset: ['b','t','k','d','g','f','s','z','ʃ','ħ','ʕ','m','n','r','l'], coda: ['b','t','k','d','g','f','s','z','ʃ','ħ','ʕ','m','n','r','l'], patterns: ['CVC','CV','CVC','CVC'], maxClusters: 1 }
};

export const MODEL_OPTIONS = [
    ['isolated', '1 — Minimalist Isolating (Hawaiian-type)'],
    ['japanese', '2 — Controlled Open Syllable (Japanese-type)'],
    ['european', '3 — Balanced European (Italian/Finnish-type)'],
    ['english', '4 — Dynamic Anglo-Saxon (English-type)'],
    ['slavic', '5 — Compact Slavic (Croatian/Polish-type)'],
    ['semitic', '6 — Semitic Root-and-Pattern (Arabic-type)']
];

// Selectable consonant-cluster sets. Single-character symbols only (a cluster is split per character).
// A cluster is available only if every consonant in it belongs to the chosen consonant model.
export const CLUSTER_SETS = Object.freeze({
    onset: Object.freeze({
        liquids: ['pr', 'br', 'tr', 'dr', 'kr', 'gr', 'fr', 'pl', 'bl', 'kl', 'gl', 'fl'],
        sibilant_stop: ['sp', 'st', 'sk', 'spr', 'str', 'skr', 'spl'],
        nasal_stop: ['mb', 'nd', 'ng', 'mp', 'nt', 'nk', 'ŋg', 'ŋk'],
        harsh: ['zg', 'zd', 'zr', 'ʃk', 'ʃt', 'ʃp', 'kt', 'gd', 'tk', 'gz', 'kr', 'gr'],
        slavic: ['vz', 'zv', 'sv', 'zl', 'vl', 'vr', 'mn', 'rz', 'zdr', 'vzd'],
        greek: ['ps', 'pt', 'ks', 'kt', 'pn', 'mn', 'gn', 'bd']
    }),
    coda: Object.freeze({
        liquid_stop: ['rp', 'rt', 'rk', 'rb', 'rd', 'rg', 'lp', 'lt', 'lk', 'ld', 'lb', 'lg', 'rm', 'rn', 'lm', 'ln'],
        nasal_stop: ['mp', 'nt', 'nk', 'nd', 'mb', 'ng', 'ŋk', 'ŋg'],
        sibilant_stop: ['sp', 'st', 'sk', 'ps', 'ts', 'ks'],
        fricative_stop: ['ft', 'fs', 'pt', 'kt', 'ʃt', 'zd'],
        harsh: ['rkt', 'rst', 'lkt', 'kst', 'rʃ', 'kʃ', 'ʃt', 'ks']
    })
});

export const CLUSTER_LABELS = Object.freeze({
    liquids: 'liquids (pr, tl…)', sibilant_stop: 'sibilant + stop (st, sk…)', nasal_stop: 'nasal + stop (mb, nd…)',
    harsh: 'harsh (zg, kt…)', slavic: 'Slavic (vz, zdr…)', greek: 'Greek (ps, pt…)',
    liquid_stop: 'liquid + stop (rk, lt…)', fricative_stop: 'fricative + stop (ft, ʃt…)'
});

export const MAX_CLUSTER_OPTIONS = Object.freeze([2, 3]);

// Effective cluster list for one position: union of the chosen sets, restricted to the
// consonant inventory of the model and to the maximum cluster length.
export function resolveClusters(modelKey, position, keys, maxCluster = 3) {
    const inventory = new Set((MODEL[modelKey] ?? MODEL.european).c);
    const all = [...new Set(keys.flatMap(k => CLUSTER_SETS[position][k] ?? []))];
    return all.filter(cl => cl.length <= maxCluster && [...cl].every(ch => inventory.has(ch)));
}

// Phonetic classes, used by genre sound profiles to weight symbols (weight of a symbol = product of the weights of its classes).
export const CONSONANT_CLASSES = Object.freeze({
    p: ['stop', 'voiceless', 'labial'], t: ['stop', 'voiceless', 'dental'], k: ['stop', 'voiceless', 'velar', 'guttural', 'harsh'],
    b: ['stop', 'voiced', 'labial'], d: ['stop', 'voiced', 'dental'], g: ['stop', 'voiced', 'velar', 'guttural', 'harsh'],
    f: ['fricative', 'voiceless', 'labial'], v: ['fricative', 'voiced', 'labial', 'soft'], 'θ': ['fricative', 'voiceless', 'dental'],
    s: ['fricative', 'voiceless', 'sibilant', 'dental'], z: ['fricative', 'voiced', 'sibilant', 'dental', 'harsh'], 'ʃ': ['fricative', 'voiceless', 'sibilant', 'harsh'],
    'ħ': ['fricative', 'voiceless', 'guttural', 'harsh'], 'ʕ': ['fricative', 'voiced', 'guttural', 'harsh'], h: ['fricative', 'voiceless', 'guttural'],
    m: ['nasal', 'sonorant', 'voiced', 'labial', 'soft'], n: ['nasal', 'sonorant', 'voiced', 'dental', 'soft'], 'ŋ': ['nasal', 'sonorant', 'voiced', 'velar'],
    r: ['liquid', 'sonorant', 'voiced', 'dental', 'harsh'], l: ['liquid', 'sonorant', 'voiced', 'dental', 'soft'],
    j: ['glide', 'sonorant', 'voiced', 'soft'], w: ['glide', 'sonorant', 'voiced', 'labial', 'soft']
});
export const VOWEL_CLASSES = Object.freeze({
    a: ['open'], e: ['mid', 'front'], i: ['close', 'front'], o: ['mid', 'back', 'rounded'], u: ['close', 'back', 'rounded'],
    y: ['close', 'front', 'rounded'], 'ø': ['mid', 'front', 'rounded'], 'æ': ['open', 'front']
});
export const SOUND_CLASSES = Object.freeze([...new Set([...Object.values(CONSONANT_CLASSES), ...Object.values(VOWEL_CLASSES)].flat())]);

// ---------------------------------------------------------------------------------------------------------------------
// Expanded letters. A graphic and phonemic layer for languages that should look exotic (Khuzdul, Adûnaic, Quenya): groups of
// extra vowels and consonants that are added, a few at a time, to the base inventory. Every symbol is one precomposed code point,
// because words are handled symbol by symbol. `base` lists the plain letters a marked letter derives from: it is only available
// when the language has one of them.
const X = (symbols, bases = {}) => Object.freeze({ symbols, bases });
export const EXPANSIONS = Object.freeze({
    circumflex: Object.freeze({ label: 'Circumflex vowels (â î û — Khuzdul, Adûnaic)', vowels: X(['â', 'ê', 'î', 'ô', 'û'], { â: 'a', ê: 'e', î: 'i', ô: 'o', û: 'u' }), consonants: X([]) }),
    acute: Object.freeze({ label: 'Acute vowels (á é í ó ú — Quenya)', vowels: X(['á', 'é', 'í', 'ó', 'ú'], { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' }), consonants: X([]) }),
    grave: Object.freeze({ label: 'Grave vowels (à è ì ò ù)', vowels: X(['à', 'è', 'ì', 'ò', 'ù'], { à: 'a', è: 'e', ì: 'i', ò: 'o', ù: 'u' }), consonants: X([]) }),
    umlaut: Object.freeze({ label: 'Umlaut vowels (ä ë ï ö ü)', vowels: X(['ä', 'ë', 'ï', 'ö', 'ü'], { ä: 'a', ë: 'e', ï: 'i', ö: 'o', ü: 'u' }), consonants: X([]) }),
    nordic: Object.freeze({ label: 'Nordic letters (æ ø å þ ð)', vowels: X(['æ', 'ø', 'å']), consonants: X(['þ', 'ð']) }),
    ligature: Object.freeze({ label: 'Ligatures (æ œ ß)', vowels: X(['æ', 'œ']), consonants: X(['ß']) }),
    ring: Object.freeze({ label: 'Ring and dotless i (å ů ı)', vowels: X(['å', 'ů', 'ı'], { ů: 'u' }), consonants: X([]) }),
    thorn: Object.freeze({ label: 'Thorn, eth, barred l (þ ð ł)', vowels: X([]), consonants: X(['þ', 'ð', 'ł'], { ł: 'l' }) }),
    dotted: Object.freeze({ label: 'Dot below (ḍ ḥ ṣ ṭ ẓ ṛ ṇ ḷ)', vowels: X([]), consonants: X(['ḍ', 'ḥ', 'ṣ', 'ṭ', 'ẓ', 'ṛ', 'ṇ', 'ḷ'], { ḍ: 'd', ḥ: ['h', 'ħ'], ṣ: 's', ṭ: 't', ẓ: 'z', ṛ: 'r', ṇ: 'n', ḷ: 'l' }) }),
    cedilla: Object.freeze({ label: 'Cedilla (ç ş ţ ḑ ģ ķ ļ ņ ŗ)', vowels: X([]), consonants: X(['ç', 'ş', 'ţ', 'ḑ', 'ģ', 'ķ', 'ļ', 'ņ', 'ŗ'], { ç: ['s', 'ʃ', 'k'], ş: ['ʃ', 's'], ţ: 't', ḑ: 'd', ģ: 'g', ķ: 'k', ļ: 'l', ņ: 'n', ŗ: 'r' }) }),
    tilde: Object.freeze({ label: 'Tilde (ñ)', vowels: X([]), consonants: X(['ñ'], { ñ: 'n' }) })
});
export const EXPANSION_KEYS = Object.freeze(Object.keys(EXPANSIONS));

// Phonetic classes of the extra letters (for the genre sound bias): a marked letter keeps the classes of its base letter.
const MARKED_VOWEL = { ä: ['open', 'front'], ë: ['mid', 'front'], ï: ['close', 'front'], ö: ['mid', 'front', 'rounded'], ü: ['close', 'front', 'rounded'],
    'æ': ['open', 'front'], 'ø': ['mid', 'front', 'rounded'], 'œ': ['mid', 'front', 'rounded'], 'å': ['open', 'back'], 'ů': ['close', 'back', 'rounded'], 'ı': ['close', 'back'] };
const MARKED_CONSONANT = {
    'þ': ['fricative', 'voiceless', 'dental'], 'ð': ['fricative', 'voiced', 'dental', 'soft'], 'ß': ['fricative', 'voiceless', 'sibilant', 'harsh'],
    'ł': ['liquid', 'sonorant', 'voiced', 'velar'], 'ñ': ['nasal', 'sonorant', 'voiced', 'soft'],
    'ḥ': ['fricative', 'voiceless', 'guttural', 'harsh'], 'ç': ['fricative', 'voiceless', 'sibilant'], 'ş': ['fricative', 'voiceless', 'sibilant', 'harsh']
};
const baseOf = (group, sym) => [].concat(group.bases[sym] ?? []);
export const EXTRA_VOWEL_CLASSES = {}, EXTRA_CONSONANT_CLASSES = {};
for (const g of Object.values(EXPANSIONS)) {
    for (const v of g.vowels.symbols) EXTRA_VOWEL_CLASSES[v] = MARKED_VOWEL[v] ?? VOWEL_CLASSES[baseOf(g.vowels, v)[0]] ?? ['mid'];
    for (const c of g.consonants.symbols) {
        const base = baseOf(g.consonants, c)[0];
        EXTRA_CONSONANT_CLASSES[c] = MARKED_CONSONANT[c] ?? [...(CONSONANT_CLASSES[base] ?? ['fricative']), ...(g === EXPANSIONS.dotted ? ['harsh', 'guttural'] : [])];
    }
}
Object.freeze(EXTRA_VOWEL_CLASSES); Object.freeze(EXTRA_CONSONANT_CLASSES);
