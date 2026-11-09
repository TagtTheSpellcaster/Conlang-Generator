// Input normalisation: turns whatever the UI (or a test) provides into one complete, valid spec,
// and reports every place where a requested option was overridden.
import { MODEL } from './phonology/models.js';
import { freshSeed } from './core/rng.js';

export const OPTIONS = Object.freeze({
    vowels: ['standard', 'minimal', 'extended'],
    consonants: Object.keys(MODEL),
    order: ['SVO', 'SOV', 'VSO', 'VOS', 'OSV', 'OVS'],
    morphology: ['isolating', 'agglutinative', 'fusional'],
    articles: ['none', 'both', 'definite', 'indefinite', 'partitive'],
    plural: ['suffix', 'prefix', 'none'],
    number: ['singular', 'singular-plural', 'singular-plural-dual'],
    gender: ['none', 'masculine-feminine', 'masculine-feminine-neuter'],
    relations: ['prepositions', 'cases', 'mixed', 'ergative'],
    caseSystem: ['minimal', 'moderate', 'extensive'],
    adjPosition: ['before', 'after']
});

export const DEFAULTS = Object.freeze({
    vowels: 'standard', consonants: 'european', mean: 2.2, order: 'SVO', morphology: 'agglutinative', articles: 'none',
    plural: 'suffix', number: 'singular-plural', gender: 'masculine-feminine', relations: 'prepositions',
    caseSystem: 'moderate', adjPosition: 'after'
});

const list = v => Array.isArray(v) ? v.map(String).filter(Boolean) : (v === undefined || v === null || v === '' ? [] : [String(v)]);

export function resolveSpec(input = {}) {
    const notes = [];
    const spec = {};
    for (const [key, allowed] of Object.entries(OPTIONS)) {
        const requested = key === 'order' ? String(input[key] ?? '').toUpperCase() : input[key];
        if (requested === undefined || requested === '') spec[key] = DEFAULTS[key];
        else if (allowed.includes(requested)) spec[key] = requested;
        else { spec[key] = DEFAULTS[key]; notes.push(`${key}: "${requested}" is not valid, using "${DEFAULTS[key]}".`); }
    }
    const mean = Number(input.mean);
    spec.mean = Number.isFinite(mean) && mean > 0 ? Math.min(5, Math.max(1, mean)) : DEFAULTS.mean;
    for (const f of ['region', 'culture', 'biome', 'era', 'tags']) spec[f] = list(input[f]);

    const requestedSeed = String(input.seed ?? '').trim();
    spec.seedRequested = requestedSeed || 'auto';
    spec.seed = requestedSeed && requestedSeed.toLowerCase() !== 'auto' ? requestedSeed : freshSeed();

    // Options that depend on each other.
    if (spec.morphology === 'isolating') {
        if (spec.relations !== 'prepositions') notes.push('Isolating morphology: grammatical relations are expressed with adpositions only.');
        if (spec.plural !== 'none') notes.push('Isolating morphology: no productive plural marker.');
        if (spec.gender !== 'none') notes.push('Isolating morphology: no grammatical gender.');
        spec.relations = 'prepositions'; spec.plural = 'none'; spec.gender = 'none';
    }
    spec.numbers = spec.plural === 'none' || spec.number === 'singular' ? ['singular']
        : spec.number === 'singular-plural-dual' ? ['singular', 'plural', 'dual'] : ['singular', 'plural'];
    if (spec.morphology !== 'isolating' && spec.number !== 'singular' && spec.plural === 'none') notes.push('Plural "none": numbers are not marked.');
    if (spec.relations === 'prepositions') spec.caseSystem = null;
    spec.genders = spec.gender === 'none' ? [] : spec.gender === 'masculine-feminine-neuter' ? ['masculine', 'feminine', 'neuter'] : ['masculine', 'feminine'];
    return { spec, notes };
}
