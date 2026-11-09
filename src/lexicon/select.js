// Vocabulary selection and word assignment. Pure and deterministic.
import { norm } from '../core/text.js';
import { createWordFactory } from '../phonology/words.js';

const GROUP_OF = {
    verb: 'verb', adjective: 'adjective', pronoun: 'pronoun',
    adverb: 'function', adposition: 'function', conjunction: 'function', determiner: 'function', particle: 'function', auxiliary: 'function',
    numeral: 'number', quantifier: 'number', noun: 'noun'
};
const GROUP_ORDER = ['verb', 'adjective', 'pronoun', 'function', 'number', 'noun'];
const FILTERS = ['region', 'culture', 'biome', 'era', 'tags'];
export const MAX_LEXICON = 600;

function score(e, spec) {
    let s = e.tier === 'domain' ? 0 : 1;
    for (const f of FILTERS) {
        if (!spec[f].length) continue;
        s += e[f].some(x => spec[f].includes(x)) ? (f === 'tags' ? 1.25 : 2) : -0.15;
    }
    return s;
}

function articleAllowed(entry, mode) {
    if (entry.pos !== 'determiner') return true;
    const l = norm(entry.lemma);
    if (l !== 'the' && l !== 'a' && l !== 'an') return true;
    if (mode === 'none') return false;
    if (l === 'the') return ['both', 'definite', 'partitive'].includes(mode);
    return ['both', 'indefinite', 'partitive'].includes(mode);
}

export function selectEntries(vocabulary, spec, limit = MAX_LEXICON) {
    const ranked = vocabulary
        .map((e, index) => ({ e, index, score: score(e, spec), group: GROUP_OF[e.pos] }))
        .filter(x => articleAllowed(x.e, spec.articles));
    const byScore = (a, b) => b.score - a.score || a.index - b.index;
    const chosen = [];
    const seen = new Set();
    const add = x => { if (x && !seen.has(x.e.id) && chosen.length < limit) { seen.add(x.e.id); chosen.push(x.e); } };

    ranked.filter(x => x.e.tier === 'core').forEach(add);
    for (const group of GROUP_ORDER) {
        const quota = group === 'noun' ? 220 : 60;
        ranked.filter(x => x.group === group && !seen.has(x.e.id)).sort(byScore).slice(0, quota).forEach(add);
    }
    ranked.filter(x => !seen.has(x.e.id)).sort(byScore).forEach(add);
    return chosen;
}

const SHORT_LEMMAS = new Set(['this', 'that', 'these', 'those', 'here', 'there', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
    'us', 'them', 'my', 'your', 'his', 'our', 'their', 'mine', 'yours', 'ours', 'theirs', 'who', 'what', 'which', 'thing', 'not', 'no', 'yes',
    'already', 'maybe', 'but', 'also']);
const SHORT_POS = new Set(['adposition', 'conjunction', 'determiner', 'pronoun', 'particle', 'auxiliary']);
export const isShort = e => SHORT_POS.has(e.pos) || SHORT_LEMMAS.has(norm(e.lemma));

// Assigns a unique conlang form to every selected sense.
export function assignForms(entries, spec) {
    const make = createWordFactory(spec);
    const seen = new Set();
    return entries.map(e => {
        let form = make({ short: isShort(e) });
        for (let i = 0; seen.has(form) && i < 50; i++) form = make({ short: isShort(e) });
        seen.add(form);
        return { ...e, form };
    });
}
