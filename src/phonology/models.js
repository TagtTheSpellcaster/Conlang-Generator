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
