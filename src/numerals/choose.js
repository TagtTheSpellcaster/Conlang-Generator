// Chooses the numeral system of a language: counting base, variants, obligatory classifiers and the position of the numeral.
// Pure and deterministic: everything is drawn from the seed (and the genre's tastes) unless the user fixed it.
import { rng } from '../core/rng.js';

export const NUMERAL_TYPES = Object.freeze(['decimal', 'vigesimal', 'hybrid', 'quinary', 'duodecimal', 'octal', 'restricted']);
export const NUMERAL_VARIANTS = Object.freeze(['plain', 'subtractive', 'halves']);
export const NUMERAL_LABELS = Object.freeze({
    decimal: 'Decimal (base 10)', vigesimal: 'Vigesimal (base 20, Basque/Maya-type)', hybrid: 'Mixed decimal-vigesimal (French/Danish-type)',
    quinary: 'Quinary (base 5 and 10)', duodecimal: 'Duodecimal (base 12)', octal: 'Octal (base 8)', restricted: 'Restricted (only a few exact numbers, then "many")'
});

// Rough frequency among the world's languages: about three quarters decimal, 15% on 20, 7% quinary, a few restricted, the rest very rare.
const BASE_WEIGHTS = { decimal: 70, vigesimal: 7, hybrid: 8, quinary: 7, restricted: 2, duodecimal: 0.6, octal: 0.4 };

// What each genre's speakers would count with (multipliers on the weights above) and how likely they are to need classifiers.
const GENRE_NUMERALS = Object.freeze({
    dwarven: { weights: { vigesimal: 4, hybrid: 3 } },
    giant: { weights: { restricted: 8, quinary: 3 } },
    orcish: { weights: { restricted: 6, quinary: 3 } },
    hive: { weights: { restricted: 8 }, classifiers: 3 },
    machine: { weights: { octal: 40, duodecimal: 15, decimal: 0.5 }, classifiers: 2 },
    merchant: { weights: { duodecimal: 8 } },
    nomad: { weights: { quinary: 3, vigesimal: 2 }, classifiers: 2 },
    sacred: { weights: { duodecimal: 12, vigesimal: 2 } },
    arcane: { weights: { duodecimal: 10, octal: 5 }, classifiers: 2 },
    infernal: { weights: { duodecimal: 6 } },
    undead: { weights: { restricted: 2 } },
    fey: { weights: { vigesimal: 2, quinary: 2 } },
    marine: { weights: { quinary: 2 } },
    artisan: { weights: { duodecimal: 4 } }
});

// The counting base each genre uses unless the user picks another (genres not listed fall back to the weighted draw of the seed).
export const GENRE_DEFAULT = Object.freeze({
    dwarven: 'vigesimal', giant: 'quinary', orcish: 'quinary', nomad: 'quinary', fey: 'vigesimal', machine: 'octal',
    merchant: 'duodecimal', sacred: 'duodecimal', arcane: 'duodecimal', infernal: 'duodecimal',
    hive: 'decimal', undead: 'decimal', marine: 'decimal', artisan: 'decimal', war: 'decimal', women: 'decimal', thieves: 'decimal', draconic: 'decimal'
});

const pickWeighted = (table, r) => {
    const entries = Object.entries(table), total = entries.reduce((s, [, w]) => s + w, 0);
    let x = r() * total;
    for (const [k, w] of entries) { x -= w; if (x < 0) return k; }
    return entries[entries.length - 1][0];
};

// input: raw user options { numerals, numeralVariant, classifiers } ('auto' or unset = decide here).
export function resolveNumerals(spec, input = {}) {
    const notes = [];
    const r = rng(`${spec.seed}|numerals`);
    const bias = GENRE_NUMERALS[spec.genre] ?? {};
    // every draw is made in a fixed order, whatever the user fixed, so that fixing one option does not reshuffle the others
    const weights = Object.fromEntries(Object.entries(BASE_WEIGHTS).map(([k, w]) => [k, w * (bias.weights?.[k] ?? 1)]));
    const drawType = pickWeighted(weights, r);
    const genreDefault = GENRE_DEFAULT[spec.genre];
    const dSub = r(), dSubFrom = r(), dHalves = r(), dUnitFirst = r(), dLinker = r(), dLimit = r(), dExtended = r(), dClass = r(), dPos = r();

    // automatic: the genre's customary system; without a genre (or a free choice) the weighted draw is the fallback
    let type = NUMERAL_TYPES.includes(input.numerals) ? input.numerals : (genreDefault ?? drawType);
    if (input.numerals && input.numerals !== 'auto' && !NUMERAL_TYPES.includes(input.numerals)) notes.push(`numerals: "${input.numerals}" is not valid, chosen automatically.`);

    let variant = NUMERAL_VARIANTS.includes(input.numeralVariant) ? input.numeralVariant : null;
    const arithmetic = t => ['decimal', 'vigesimal', 'hybrid'].includes(t);
    if (variant === 'halves' && type !== 'hybrid') {
        if (NUMERAL_TYPES.includes(input.numerals)) { notes.push('numeral variant "halves" (50 = 2.5 × 20) needs the mixed decimal-vigesimal system; ignored.'); variant = null; }
        else type = 'hybrid';
    }
    if (variant === 'subtractive' && !arithmetic(type)) { notes.push('numeral variant "subtractive" applies to decimal, vigesimal and mixed systems; ignored.'); variant = null; }

    const config = { type, subtractive: null, halves: false, french: false, unitFirst: false, linker: false, limit: null, extended: false };
    if (arithmetic(type)) {
        const subChance = (type === 'decimal' ? 0.01 : 0.05);
        const subtractive = variant ? variant === 'subtractive' : dSub < subChance;
        if (subtractive) config.subtractive = { from: type === 'decimal' ? 8 : (dSubFrom < 0.5 ? 5 : 6) };
        if (type === 'hybrid') {
            config.halves = variant ? variant === 'halves' : dHalves < 0.4;
            config.french = !config.halves && dHalves < 0.75;
        }
        // units before tens (five-and-twenty) need the linking word, or 15 and 50 would be the same word
        config.unitFirst = dUnitFirst < 0.07;
        config.linker = config.unitFirst || dLinker < 0.5;
    } else if (type === 'restricted') {
        config.limit = dLimit < 0.3 ? 2 : dLimit < 0.7 ? 3 : 5;
        config.extended = config.limit < 5 && dExtended < 0.5;
    } else {
        config.linker = dLinker < 0.5;
    }
    if (variant && !arithmetic(type) && type !== 'hybrid') variant = null;

    // obligatory numeral classifiers: about 15% of languages, more often isolating ones
    const wants = ['none', 'obligatory'].includes(input.classifiers) ? input.classifiers === 'obligatory'
        : dClass < 0.15 * (bias.classifiers ?? 1) * (spec.morphology === 'isolating' ? 2 : 1);
    // an automatic choice never overrides a plural the genre or the user asked for; classifiers need "plural: none"
    const pluralMarked = spec.plural !== 'none' && spec.number !== 'singular';
    const forced = input.classifiers === 'obligatory';
    config.classifiers = wants && type !== 'restricted' && (forced || !pluralMarked);
    if (wants && type === 'restricted') notes.push('Restricted numerals: no classifiers (nothing to count with them).');

    // numeral and adjective tend to stand on the same side of the noun
    config.position = ['before', 'after'].includes(input.numeralPosition) ? input.numeralPosition : (dPos < 0.8 ? spec.adjPosition : (spec.adjPosition === 'before' ? 'after' : 'before'));
    // isolating languages write the numeral as separate words, the others as one compound word
    config.style = spec.morphology === 'isolating' ? 'spaced' : 'compound';
    return { config, notes };
}
