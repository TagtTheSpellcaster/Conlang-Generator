// Pure word and affix factories. No DOM, no globals: everything depends on (config, seed).
import { MODEL, VOWELS, resolveClusters } from './models.js';
import { rng, pick } from '../core/rng.js';

const LENGTH_PROFILES = {
    short:    [0.60, 0.30, 0.08, 0.02, 0.00, 0.00, 0.00, 0.00],
    balanced: [0.18, 0.40, 0.30, 0.08, 0.03, 0.01, 0.00, 0.00],
    long:     [0.01, 0.04, 0.15, 0.30, 0.25, 0.15, 0.07, 0.03]
};

export const vowelsFor = key => VOWELS[key] || VOWELS.standard;
export const modelFor = key => MODEL[key] ? key : 'european';

// Effective phonotactics for a spec: model + chosen cluster sets.
// spec.onsetClusters / codaClusters: null = model default, [] = none, otherwise the chosen sets.
export function resolvePhonotactics(c = {}) {
    const modelKey = modelFor(c.consonants);
    const model = MODEL[modelKey];
    const vowels = vowelsFor(c.vowels);
    const maxCluster = [2, 3].includes(Number(c.maxCluster)) ? Number(c.maxCluster) : 3;
    const onsetChosen = Array.isArray(c.onsetClusters), codaChosen = Array.isArray(c.codaClusters);
    const onset = onsetChosen ? resolveClusters(modelKey, 'onset', c.onsetClusters, maxCluster) : (model.clusters ?? []).filter(cl => cl.length <= maxCluster);
    const coda = codaChosen ? resolveClusters(modelKey, 'coda', c.codaClusters, maxCluster) : [];
    return {
        modelKey, model, vowels, maxCluster, onsetChosen, codaChosen, onset, coda,
        onsetSet: new Set(onset), codaSet: new Set(coda),
        // models without clusters keep their strict "no consonant run" rule unless the user picked clusters
        strictSingle: !onsetChosen && !codaChosen && ['isolated', 'japanese', 'semitic'].includes(modelKey)
    };
}

function chooseOnset(ph, r) {
    if (ph.onset.length && r() < (ph.onsetChosen ? 0.30 : (ph.modelKey === 'english' ? 0.24 : 0.16))) return pick(ph.onset, r);
    return pick(ph.model.onset, r);
}

function patternsFor(ph) {
    const base = ph.model.patterns;
    // chosen coda clusters need closed syllables to appear in
    if (ph.coda.length && !base.some(p => p.endsWith('C'))) return [...base, 'CVC', 'CVC'];
    return base;
}

function makeSyllable(ph, vowels, r, patterns) {
    const pattern = pick(patterns, r);
    const onset = pattern.startsWith('C') ? chooseOnset(ph, r) : '';
    const vowel = pick(vowels, r);
    let coda = '';
    if (pattern.endsWith('C')) coda = ph.coda.length && r() < 0.45 ? pick(ph.coda, r) : pick(ph.model.coda, r);
    return onset + vowel + coda;
}

const makeSafeSyllable = (m, vowels, r) => pick(m.onset, r) + pick(vowels, r);

// Maximal consonant runs with their position in the word.
function consonantRuns(w, vowels) {
    const vs = new Set(vowels), runs = [];
    let i = 0;
    while (i < w.length) {
        if (!vs.has(w[i])) { let j = i + 1; while (j < w.length && !vs.has(w[j])) j++; runs.push({ text: w.slice(i, j), start: i, end: j }); i = j; }
        else i++;
    }
    return runs;
}

// A medial run is valid if it can be split into coda + onset, each a single consonant or a chosen cluster.
export function medialRunOk(run, ph) {
    if (run.length === 1) return true;
    for (let i = 0; i < run.length; i++) {
        const coda = run.slice(0, i), onset = run.slice(i);
        const onsetOk = onset.length === 1 || ph.onsetSet.has(onset);
        const codaOk = coda.length <= 1 || ph.codaSet.has(coda);
        if (onsetOk && codaOk) return true;
    }
    return false;
}

export function validWord(w, modelKey, vowels, ph = resolvePhonotactics({ consonants: modelKey })) {
    const m = MODEL[modelKey];
    if (!w || w.length < 2 || !vowels.some(v => w.includes(v))) return false;
    const vowelCount = [...w].filter(ch => vowels.includes(ch)).length;
    if (/[aeiouyøæ]{3}/i.test(w)) return false;
    if (m.maxVowelRatio && vowelCount / w.length > m.maxVowelRatio) return false;
    if (/(.)\1/.test(w)) return false;
    const runs = consonantRuns(w, vowels);
    if (ph.strictSingle) {
        if (runs.some(run => run.text.length > 1)) return false;
        if (modelKey === 'japanese' && /[^aeiouyøæ]$/i.test(w) && !/[nm]$/i.test(w)) return false;
    } else {
        for (const { text, start, end } of runs) {
            if (start === 0) { if (text.length > 1 && !ph.onsetSet.has(text)) return false; }
            else if (end === w.length) { if (text.length > 1 && !ph.codaSet.has(text)) return false; }
            else if (!medialRunOk(text, ph)) return false;
        }
    }
    if (modelKey === 'semitic' && /[aeiouyøæ]{2}/i.test(w)) return false;
    return true;
}

export function lengthProfile(mean) {
    const target = Number(mean) || 2.2;
    if (target <= 1.5) return 'short';
    if (target <= 3.0) return 'balanced';
    return 'long';
}

function pickWeighted(weights, r) {
    const total = weights.reduce((s, w) => s + w, 0);
    let n = r() * total;
    for (let i = 0; i < weights.length; i++) { n -= weights[i]; if (n < 0) return i + 1; }
    return weights.length;
}

// Root words. Same (config, seed) always yields the same sequence.
export function createWordFactory(c = {}) {
    const ph = resolvePhonotactics(c);
    const { modelKey, model, vowels } = ph;
    const patterns = patternsFor(ph);
    const profile = LENGTH_PROFILES[lengthProfile(c.mean)];
    const r = rng(`${String(c.seed ?? 'auto')}|phonology|${modelKey}|words`);
    const used = new Set();

    const attempt = (options) => {
        const target = options.short ? (r() < 0.80 ? 1 : 2) : pickWeighted(profile, r);
        for (let tries = 0; tries < 80; tries++) {
            let word = '';
            for (let i = 0; i < target; i++) word += makeSyllable(ph, vowels, r, patterns);
            word = word.toLowerCase();
            if (validWord(word, modelKey, vowels, ph) && !used.has(word)) return word;
        }
        const count = Math.max(1, Math.min(2, target));
        for (let tries = 0; tries < 64; tries++) {
            let word = '';
            for (let i = 0; i < count; i++) word += makeSafeSyllable(model, vowels, r);
            word = word.toLowerCase();
            if (validWord(word, modelKey, vowels, ph) && !used.has(word)) return word;
        }
        return null;
    };

    return (options = {}) => {
        for (let guard = 0; guard < 20; guard++) {
            const word = attempt(options);
            if (word) { used.add(word); return word; }
        }
        // Last resort, still unique: keep appending open syllables (never digits).
        let emergency = makeSafeSyllable(model, vowels, r).toLowerCase();
        for (let n = 0; used.has(emergency) && n < 1000; n++) emergency += makeSafeSyllable(model, vowels, r).toLowerCase();
        used.add(emergency);
        return emergency;
    };
}

// Affixes: dedicated templates V, CV, VC (never clusters), so they stay short and recognisable.
// `reserved` is a set of forms the affixes must not collide with.
export function createAffixFactory(c = {}, reserved = new Set()) {
    const modelKey = modelFor(c.consonants);
    const model = MODEL[modelKey];
    const vowels = vowelsFor(c.vowels);
    const r = rng(`${String(c.seed ?? 'auto')}|phonology|${modelKey}|affixes`);
    const used = new Set(reserved);
    const TEMPLATES = ['CV', 'CV', 'CV', 'V', 'VC'];

    const one = () => {
        const t = pick(TEMPLATES, r);
        const onset = t.startsWith('C') ? pick(model.onset, r) : '';
        const coda = t.endsWith('C') ? pick(model.coda ?? model.onset, r) : '';
        return (onset + pick(vowels, r) + coda).toLowerCase();
    };
    return () => {
        for (let i = 0; i < 300; i++) {
            const a = one();
            if (!used.has(a)) { used.add(a); return a; }
        }
        // inventory of single syllables exhausted: allow two syllables
        for (let i = 0; i < 300; i++) {
            const a = one() + one();
            if (!used.has(a)) { used.add(a); return a; }
        }
        throw new Error('Unable to generate a unique affix for this phonology.');
    };
}

export function describePhonology(c = {}) {
    const ph = resolvePhonotactics(c);
    const key = ph.modelKey;
    const m = MODEL[key];
    return {
        model: key,
        name: m.name,
        vowels: vowelsFor(c.vowels).slice(),
        consonants: m.c.slice(),
        clusters: ph.onset.slice(),
        codaClusters: ph.coda.slice(),
        patterns: [...new Set(m.patterns)],
        maxCluster: ph.onset.length || ph.coda.length ? ph.maxCluster : m.maxClusters,
        meanSyllables: Number(c.mean) || 2.2,
        lengthProfile: lengthProfile(c.mean)
    };
}
