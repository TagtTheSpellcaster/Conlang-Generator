/* ConLang Generator — shared phonology engine v0.10.7 */
(() => {
    'use strict';

    const VOWELS = {
        standard: ['a', 'e', 'i', 'o', 'u'],
        minimal: ['a', 'i', 'u'],
        extended: ['a', 'e', 'i', 'o', 'u', 'y', 'ø', 'æ']
    };

    const MODEL = {
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
            onset: ['p','t','k','b','d','g','f','θ','s','z','ʃ','m','n','r','l','j','w','h'],
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

    const MODEL_OPTIONS = [
        ['isolated', '1 — Minimalist Isolating (Hawaiian-type)'],
        ['japanese', '2 — Controlled Open Syllable (Japanese-type)'],
        ['european', '3 — Balanced European (Italian/Finnish-type)'],
        ['english', '4 — Dynamic Anglo-Saxon (English-type)'],
        ['slavic', '5 — Compact Slavic (Croatian/Polish-type)'],
        ['semitic', '6 — Semitic Root-and-Pattern (Arabic-type)']
    ];

    // Asymmetric lexical-length profiles. They deliberately peak on short
    // words and retain a progressively thinner right-hand tail. The Mean
    // syllables control selects the appropriate macro-profile:
    //   1.0–1.5  Short / isolating
    //   1.6–3.0  Balanced
    //   3.1–5.0  Long / polysynthetic-like
    const LENGTH_PROFILES = {
        short:    [0.60, 0.30, 0.08, 0.02, 0.00, 0.00, 0.00, 0.00],
        balanced: [0.18, 0.40, 0.30, 0.08, 0.03, 0.01, 0.00, 0.00],
        long:     [0.01, 0.04, 0.15, 0.30, 0.25, 0.15, 0.07, 0.03]
    };

    const $ = id => document.getElementById(id);
    const pick = (a, r) => a[Math.floor(r() * a.length)];

    function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    function rng(seed) { let x = hash(seed) || 1; return () => { x += 0x6D2B79F5; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function modelForKey(key) { return MODEL[key] || MODEL.european; }
    function vowelSet() { return VOWELS[$('vowels')?.value] || VOWELS.standard; }

    function chooseOnset(m, r) {
        if (m.clusters?.length && r() < (m === MODEL.english ? .24 : .16)) return pick(m.clusters, r);
        return pick(m.onset, r);
    }

    function makeSyllable(m, vowels, r) {
        const pattern = pick(m.patterns, r);
        const onset = pattern.startsWith('C') ? chooseOnset(m, r) : '';
        const vowel = pick(vowels, r);
        const coda = pattern.endsWith('C') ? pick(m.coda, r) : '';
        return onset + vowel + coda;
    }

    function consonantRuns(w, vowels) {
        const vs = new Set(vowels), runs = [];
        let i = 0;
        while (i < w.length) {
            if (!vs.has(w[i])) { let j = i + 1; while (j < w.length && !vs.has(w[j])) j++; runs.push(w.slice(i, j)); i = j; }
            else i++;
        }
        return runs;
    }

    function validWord(w, m, vowels) {
        if (!w || w.length < 2 || !vowels.some(v => w.includes(v))) return false;

        const vowelCount = [...w].filter(ch => vowels.includes(ch)).length;
        if (vowels.length && /[aeiouyøæ]{3}/i.test(w)) return false;
        if (m.maxVowelRatio && vowelCount / w.length > m.maxVowelRatio) return false;

        const runs = consonantRuns(w, vowels);
        if (runs.some(run => run.length > m.maxClusters)) return false;
        if (/(.)\1/.test(w)) return false;
        if (m === MODEL.isolated && runs.some(run => run.length > 1)) return false;
        if (m === MODEL.japanese && (runs.some(run => run.length > 1) || (/[^aeiouyøæ]$/i.test(w) && !/[nm]$/i.test(w)))) return false;
        if (m === MODEL.european && runs.some(run => run.length >= 2 && !m.clusters.includes(run))) return false;
        if (m === MODEL.english && runs.some((run, i) => i === 0 && run.length >= 2 && !m.clusters.includes(run))) return false;
        if (m === MODEL.slavic && runs.some(run => run.length >= 2 && !m.clusters.includes(run))) return false;
        if (m === MODEL.semitic && (runs.some(run => run.length > 1) || /[aeiouyøæ]{2}/i.test(w))) return false;
        return true;
    }

    function chooseLengthProfile(mean) {
        const target = Number(mean) || 2.2;
        if (target <= 1.5) return LENGTH_PROFILES.short;
        if (target <= 3.0) return LENGTH_PROFILES.balanced;
        return LENGTH_PROFILES.long;
    }

    function pickWeighted(weights, r) {
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        let n = r() * total;
        for (let i = 0; i < weights.length; i++) {
            n -= weights[i];
            if (n < 0) return i + 1;
        }
        return weights.length;
    }

    function makeWord(m, vowels, mean, r, options = {}) {
        if (options.short) {
            const targetSyllables = r() < 0.80 ? 1 : 2;
            for (let tries = 0; tries < 500; tries++) {
                let word = '';
                for (let i = 0; i < targetSyllables; i++) word += makeSyllable(m, vowels, r);
                word = word.toLowerCase();
                if (validWord(word, m, vowels)) return word;
            }
            return null;
        }

        const profile = chooseLengthProfile(mean);
        for (let tries = 0; tries < 500; tries++) {
            const syllables = pickWeighted(profile, r);
            let word = '';
            for (let i = 0; i < syllables; i++) word += makeSyllable(m, vowels, r);
            word = word.toLowerCase();
            if (validWord(word, m, vowels)) return word;
        }
        return null;
    }

    function createWordFactory(c = {}) {
        const modelKey = MODEL[c.consonants] ? c.consonants : 'european';
        const model = MODEL[modelKey];
        const vowels = VOWELS[c.vowels] || VOWELS.standard;
        const mean = Number(c.mean) || 2.2;
        const r = rng(`${String(c.seed || 'auto')}|phonology|${modelKey}|words`);
        const used = new Set();
        return (options = {}) => {
            for (let guard = 0; guard < 100; guard++) {
                const word = makeWord(model, vowels, mean, r, options);
                if (word && !used.has(word)) { used.add(word); return word; }
            }
            return 'lex' + Math.floor(r() * 1e6);
        };
    }

    function resetCycle() {}
    function phonologize() {}

    window.ConlangPhonology = Object.freeze({ version: '0.10.7', models: MODEL, modelOptions: MODEL_OPTIONS, createWordFactory, resetCycle, phonologize });
})();