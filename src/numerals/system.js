// Numeral system: roots, composition rules, classifiers and the link to the lexicon. Pure and deterministic.
// Greenberg's constraint holds by construction: whatever the base, every number from 1 up to the largest the language can say
// has a form, and a restricted system stops at its limit instead of skipping numbers.
import { createWordFactory, createAffixFactory, resolvePhonotactics } from '../phonology/words.js';
import { attach } from '../morphology/inflect.js';
import { rng, pick } from '../core/rng.js';

export const MAX_NUMERAL = 999999999;

// Roots and units of each type. Atoms are single words for 1..k; units are the words that start a new level.
function layout(config) {
    const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
    switch (config.type) {
        case 'decimal': return { atoms: range(1, 9), units: [{ value: 1000 }, { value: 100 }, { value: 10 }] };
        case 'vigesimal': return { atoms: range(1, 9), units: [{ value: 1000 }, { value: 100 }, { value: 20 }, { value: 10 }] };
        case 'hybrid': return { atoms: range(1, 9), units: [{ value: 1000 }, { value: 100 }, { value: 20, from: config.french ? 80 : 50 }, { value: 10 }] };
        case 'quinary': return { atoms: range(1, 4), units: [{ value: 1000 }, { value: 100 }, { value: 10 }, { value: 5 }] };
        case 'duodecimal': return { atoms: range(1, 11), units: [{ value: 1728 }, { value: 144 }, { value: 12 }] };
        case 'octal': return { atoms: range(1, 7), units: [{ value: 512 }, { value: 64 }, { value: 8 }] };
        default: return { atoms: range(1, config.limit), units: [] };
    }
}

const CARDINALS = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
    fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
    eighty: 80, ninety: 90, hundred: 100, thousand: 1000, million: 1000000
};
const ORDINALS = { second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };

const CLASSIFIER_CLASSES = [
    { id: 'person', label: 'people' }, { id: 'animal', label: 'animals' }, { id: 'long', label: 'long, thin things' },
    { id: 'flat', label: 'flat things' }, { id: 'round', label: 'small round things' }, { id: 'general', label: 'things in general' }
];
const LONG = new Set('sword spear arrow staff rod road river rope string snake bridge tail pole lance bow knife needle path tunnel wire cable tree'.split(' '));
const FLAT = new Set('leaf door shield page map blanket sheet wall floor table board banner flag cloth carpet'.split(' '));
const ROUND = new Set('stone egg ball coin fruit apple eye seed pearl star moon gem bead pill nut'.split(' '));

export function buildNumerals(spec, lexicon) {
    const config = spec.numeralSystem;
    const { atoms, units } = layout(config);
    const numeralIds = new Set(lexicon.filter(e => numeralValue(e) !== undefined).map(e => e.id));
    const reserved = new Set(lexicon.filter(e => !numeralIds.has(e.id)).map(e => e.form));
    const factory = createWordFactory({
        consonants: spec.consonants, vowels: spec.vowels, mean: 1.3, seed: `${spec.seed}|numerals|roots`,
        onsetClusters: spec.onsetClusters, codaClusters: spec.codaClusters, maxCluster: spec.maxCluster, soundBias: spec.soundBias,
        extraVowels: spec.extraVowels, extraConsonants: spec.extraConsonants
    });
    const fresh = () => { for (let i = 0; i < 60; i++) { const w = factory({ short: true }); if (!reserved.has(w)) { reserved.add(w); return w; } } return factory(); };

    const roots = {};
    const values = [...(config.type === 'restricted' ? [] : [0]), ...atoms, ...units.map(u => u.value)].sort((a, b) => a - b);
    for (const v of values) roots[v] = fresh();
    const words = {};
    if (config.type === 'restricted') words.many = fresh();
    if (config.linker) words.and = fresh();
    if (config.subtractive) words.minus = fresh();
    if (config.halves) words.half = fresh();
    words.ordinal = createAffixFactory({ ...spec, seed: `${spec.seed}|numerals|ordinal` }, reserved)();

    let classifiers = null;
    if (config.classifiers) {
        const r = rng(`${spec.seed}|classifiers`);
        const optional = CLASSIFIER_CLASSES.filter(c => !['person', 'animal', 'general'].includes(c.id));
        const extra = [];
        for (const n = 1 + Math.floor(r() * 3); extra.length < n;) { const c = pick(optional, r); if (!extra.includes(c)) extra.push(c); }
        const chosen = CLASSIFIER_CLASSES.filter(c => ['person', 'animal', 'general'].includes(c.id) || extra.includes(c));
        classifiers = chosen.map(c => ({ ...c, form: fresh() }));
    }

    // halves ("half-third twenty" = 50) use the ordinal of 3, 4 and 5
    const halfOrdinals = {};
    if (config.halves) for (const k of [3, 4, 5]) halfOrdinals[k] = roots[k] + attach(roots[k], words.ordinal, spec);
    const system = Object.freeze({ config, atoms, units, roots: Object.freeze(roots), words: Object.freeze(words), halfOrdinals: Object.freeze(halfOrdinals), classifiers: classifiers && Object.freeze(classifiers) });

    // numeral entries of the lexicon follow the system: composed forms, and none beyond what the language can count
    const out = [];
    for (const e of lexicon) {
        if (!numeralIds.has(e.id)) { out.push(e); continue; }
        const card = CARDINALS[e.lemma], ord = ORDINALS[e.lemma];
        const value = card ?? ord;
        if (!isDefined(system, value) || (config.type === 'restricted' && value === 0)) continue;
        out.push({ ...e, form: ord !== undefined && card === undefined ? ordinalForm(system, value, spec) : numeralForm(system, value, spec).form });
    }
    // "many" is the open end of a restricted system
    let lex = config.type === 'restricted' ? out.map(e => (e.id === 'adjective.many' ? { ...e, form: words.many } : e)) : out;
    // a composed numeral can coincide with an ordinary word: that word gets a new form
    const numeralForms = new Set(lex.filter(e => numeralIds.has(e.id)).map(e => e.form));
    const taken = new Set(lex.map(e => e.form));
    const again = createWordFactory({ consonants: spec.consonants, vowels: spec.vowels, mean: spec.mean, seed: `${spec.seed}|numerals|collision`, onsetClusters: spec.onsetClusters, codaClusters: spec.codaClusters, maxCluster: spec.maxCluster, soundBias: spec.soundBias, extraVowels: spec.extraVowels, extraConsonants: spec.extraConsonants });
    const seenNumeral = new Set();
    lex = lex.map(e => {
        if (numeralIds.has(e.id)) {
            // two numeral entries may coincide in very short languages (eighteen / tenth): the later one is lengthened
            if (!seenNumeral.has(e.form)) { seenNumeral.add(e.form); return e; }
            let form = e.form;
            for (let i = 0; (seenNumeral.has(form) || taken.has(form)) && i < 20; i++) form += attach(form, i % 2 ? again() : words.ordinal, spec);
            seenNumeral.add(form); taken.add(form);
            return { ...e, form };
        }
        if (!numeralForms.has(e.form)) return e;
        let form = again();
        for (let i = 0; taken.has(form) && i < 50; i++) form = again();
        taken.add(form);
        return { ...e, form };
    });
    return { system, lexicon: lex };
}

export const maxDefined = system => (system.config.type === 'restricted' ? (system.config.extended ? 5 : system.config.limit) : MAX_NUMERAL);
export const isDefined = (system, n) => Number.isInteger(n) && n >= 0 && n <= maxDefined(system) && !(n === 0 && system.config.type === 'restricted');

const part = (system, value) => ({ form: system.roots[value], meaning: String(value) });

// The words of a number, in order: [{ form, meaning }]. Beyond a restricted system's limit the answer is its word for "many".
export function numeralParts(system, n) {
    const { config, roots, words } = system;
    if (config.type === 'restricted') {
        if (n >= 1 && n <= config.limit) return [part(system, n)];
        if (config.extended && n >= 2 && n <= 5) {
            const twos = Array.from({ length: Math.floor(n / 2) }, () => part(system, 2));
            return n % 2 ? [...twos, part(system, 1)] : twos;
        }
        return [{ form: words.many, meaning: 'many' }];
    }
    const sub = config.subtractive;
    const compose = value => {
        if (roots[value] !== undefined) return [part(system, value)];
        // subtractive: 15..19 as 20 minus 5..1 (Yoruba-type), 28 and 29 as 30 minus 2 and 1 (Latin-type)
        const d = value % 10;
        if (sub && value > 10 && d >= sub.from) return [...compose(10 - d), { form: words.minus, meaning: '−' }, ...compose(value + 10 - d)];
        // mixed systems with the French cut: 70-79 = 60 + n, 90-99 = 80 + n
        if (config.french && value >= 70 && value < 100 && value % 100 >= 70 && Math.floor(value / 10) % 2 === 1) {
            const base = Math.floor(value / 10) * 10 === 70 ? 60 : 80;
            return [...compose(base), ...compose(value - base)];
        }
        // halves (Danish-type): 50 = half-third twenty (2.5 × 20), 70 = 3.5 × 20, 90 = 4.5 × 20
        if (config.halves && value >= 50 && value < 100 && Math.floor(value / 10) % 2 === 1) {
            const k = (Math.floor(value / 10) + 1) / 2, r = value % 10;
            const head = [{ form: words.half, meaning: '½' }, { form: system.halfOrdinals[k], meaning: `${k}th` }];
            return finishLevel(head, [part(system, 20)], r, value);
        }
        const U = system.units.find(u => u.value <= value && (u.from === undefined || value >= u.from));
        const q = Math.floor(value / U.value), r = value % U.value;
        const head = q === 1 ? [part(system, U.value)] : [...compose(q), part(system, U.value)];
        return finishLevel([], head, r, value);
    };
    // tail = what is left after the unit; some languages say the units first ("five-and-twenty")
    const finishLevel = (prefix, head, r, value) => {
        const body = [...prefix, ...head];
        if (!r) return body;
        const tail = compose(r);
        const link = words.and ? [{ form: words.and, meaning: '+' }] : [];
        if (config.unitFirst && value >= 20 && value < 100 && r < 10) return [...tail, ...link, ...body];
        return [...body, ...(value >= 100 ? link : []), ...tail];
    };
    return compose(n);
}


// The arithmetic behind a number, written with the multiplication sign: 90 in a French-type system is "(4 × 20) + 10".
// It mirrors numeralParts: same cuts, same units, same order of the terms.
export function numeralMeaning(system, n) {
    const { config, roots } = system;
    if (!Number.isInteger(n) || n < 0) return '';
    if (config.type === 'restricted') {
        if (n >= 1 && n <= config.limit) return String(n);
        if (config.extended && n >= 2 && n <= 5) return [...Array(Math.floor(n / 2)).fill('2'), ...(n % 2 ? ['1'] : [])].join(' + ');
        return 'many';
    }
    const sub = config.subtractive;
    const show = items => (items.length === 1 ? items[0].s : items.map(t => (t.compound ? `(${t.s})` : t.s)).join(' + '));
    const operand = items => (items.length === 1 && !items[0].compound ? items[0].s : `(${show(items)})`);
    const terms = value => {
        if (roots[value] !== undefined) return [{ s: String(value) }];
        const d = value % 10;
        if (sub && value > 10 && d >= sub.from) return [{ s: `${operand(terms(value + 10 - d))} − ${operand(terms(10 - d))}`, compound: true }];
        if (config.french && value >= 70 && value < 100 && Math.floor(value / 10) % 2 === 1) {
            const base = Math.floor(value / 10) * 10 === 70 ? 60 : 80;
            return [...terms(base), ...terms(value - base)];
        }
        if (config.halves && value >= 50 && value < 100 && Math.floor(value / 10) % 2 === 1) {
            const k = (Math.floor(value / 10) + 1) / 2, r = value % 10;
            return level([{ s: `${k - 0.5} × 20`, compound: true }], r, value);
        }
        const U = system.units.find(u => u.value <= value && (u.from === undefined || value >= u.from));
        const q = Math.floor(value / U.value), r = value % U.value;
        const head = q === 1 ? [{ s: String(U.value) }] : [{ s: `${operand(terms(q))} × ${U.value}`, compound: true }];
        return level(head, r, value);
    };
    const level = (body, r, value) => {
        if (!r) return body;
        const tail = terms(r);
        return config.unitFirst && value >= 20 && value < 100 && r < 10 ? [...tail, ...body] : [...body, ...tail];
    };
    return show(terms(n));
}

// Joins words into the language's way of writing numbers: separate words (isolating) or one compound word.
function join(forms, style, spec) {
    if (style === 'spaced') return forms.join(' ');
    const ph = resolvePhonotactics(spec);
    const isVowel = ch => ph.vowels.includes(ch);
    return forms.reduce((acc, f) => {
        if (!acc) return f;
        let piece = attach(acc, f, spec);
        const last = acc[acc.length - 1], first = f[0];
        if (piece === f) {
            // languages with single consonants only (and every language for a doubled letter) never get a clash at the junction
            const link = [...acc].reverse().find(isVowel);
            if (last === first) piece = isVowel(first) ? f.slice(1) : (link ?? '') + f;
            else if (ph.strictSingle && !isVowel(last) && !isVowel(first)) piece = (link ?? '') + f;
        }
        return acc + piece;
    }, '');
}

// The number an entry of the dictionary stands for ("seven" -> 7, "tenth" -> 10), or undefined.
export function numeralValue(entry) {
    if (!entry.id.startsWith('number.') || entry.pos !== 'numeral') return undefined;
    return CARDINALS[entry.lemma] ?? ORDINALS[entry.lemma];
}
// A restricted system has no word for zero and none above its limit: those entries are left out of the lexicon.
export function numeralBeyondSystem(entry, spec) {
    const cfg = spec.numeralSystem;
    if (cfg?.type !== 'restricted') return false;
    const v = numeralValue(entry);
    return v !== undefined && (v === 0 || v > (cfg.extended ? 5 : cfg.limit));
}

export function numeralForm(system, n, spec) {
    if (!isDefined(system, n) && !(n > maxDefined(system))) return { defined: false, form: '', parts: [] };
    const parts = numeralParts(system, n);
    return { defined: isDefined(system, n), form: join(parts.map(p => p.form), system.config.style, spec), parts };
}

export function ordinalForm(system, n, spec) {
    const base = numeralForm(system, n, spec).form;
    return system.config.style === 'spaced' ? `${base} ${system.words.ordinal}` : base + attach(base, system.words.ordinal, spec);
}

// Which classifier goes with a noun.
export function classifierFor(system, entry) {
    if (!system.classifiers) return null;
    const has = id => system.classifiers.find(c => c.id === id);
    const lemma = entry.lemma;
    const id = entry.features?.animacy === 'human' ? 'person' : entry.features?.animacy === 'animate' ? 'animal'
        : LONG.has(lemma) ? 'long' : FLAT.has(lemma) ? 'flat' : ROUND.has(lemma) ? 'round' : 'general';
    return has(id) ?? has('general');
}

const SAMPLES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 25, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100, 101, 250, 1000, 1234, 10000];
export function sampleNumbers(system) {
    return SAMPLES.filter(n => isDefined(system, n));
}
