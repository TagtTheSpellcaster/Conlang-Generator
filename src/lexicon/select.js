// Vocabulary selection and word assignment. Pure and deterministic.
import { norm } from '../core/text.js';
import { hash } from '../core/rng.js';
import { createWordFactory } from '../phonology/words.js';

const GROUP_OF = {
    verb: 'verb', adjective: 'adjective', pronoun: 'pronoun',
    adverb: 'function', adposition: 'function', conjunction: 'function', determiner: 'function', particle: 'function', auxiliary: 'function',
    numeral: 'number', quantifier: 'number', noun: 'noun'
};
const GROUP_ORDER = ['verb', 'adjective', 'pronoun', 'function', 'number', 'noun'];
const FILTERS = ['region', 'culture', 'biome', 'era', 'tags'];
export const MAX_LEXICON = 600;
// A language with a genre has room for its specialised vocabulary on top of the general one.
export const MAX_LEXICON_GENRE = 900;

const sumOf = (list, table) => list.reduce((n, x) => n + (table?.[x] ?? 0), 0);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// How much the language genre wants this entry (see genres.js). Capped so no single dimension dominates.
export function genreBonus(e, sem) {
    if (!sem) return 0;
    let s = (sem.domains?.[e.domain] ?? 0) + (sem.domainsAvoid?.[e.domain] ?? 0) + (sem.groups?.[`${e.domain}/${e.group}`] ?? 0);
    s += clamp(sumOf(e.tags, sem.tags), -4, 7);
    s += clamp(sumOf(e.culture, sem.cultures), -3, 4);
    s += clamp(sumOf(e.biome, sem.biomes), -3, 4);
    s += clamp(sumOf(e.era, sem.eras), -3, 3);
    return clamp(s, -6, 12);
}

const excludedByGenre = (e, sem) => !!sem && e.tier !== 'core' && (sem.exclude?.domains?.includes(e.domain) || e.tags.some(t => sem.exclude?.tags?.includes(t)));

function score(e, spec) {
    let s = e.tier === 'domain' ? 0 : 1;
    s += genreBonus(e, spec.semantics);
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

// `required`: entries the sample sentences need; they are always included, even if the genre would exclude them.
export function selectEntries(vocabulary, spec, limit = spec.genre ? MAX_LEXICON_GENRE : MAX_LEXICON, required = []) {
    const ranked = vocabulary
        // equal scores are ordered by a fixed hash of the id (not the seed): the selected senses stay the same for every seed,
        // but they are spread over the whole dictionary instead of always being its first entries
        .map((e, index) => ({ e, index, order: hash(`select|${e.id}`), score: score(e, spec), group: GROUP_OF[e.pos] }))
        .filter(x => articleAllowed(x.e, spec.articles) && !excludedByGenre(x.e, spec.semantics));
    const byScore = (a, b) => b.score - a.score || a.order - b.order || a.index - b.index;
    const chosen = [];
    const seen = new Set();
    const add = x => { if (x && !seen.has(x.e.id) && chosen.length < limit) { seen.add(x.e.id); chosen.push(x.e); } };

    const needed = new Set(required.map(e => e.id));
    ranked.filter(x => x.e.tier === 'core' || needed.has(x.e.id)).forEach(add);
    required.filter(e => !seen.has(e.id) && articleAllowed(e, spec.articles)).forEach(e => add({ e }));
    // With a genre the specialised nouns, verbs and adjectives come first; numerals and function words are capped lower.
    const plan = spec.genre
        ? [['noun', 420], ['verb', 120], ['adjective', 100], ['pronoun', 40], ['function', 60], ['number', 40]]
        : GROUP_ORDER.map(g => [g, g === 'noun' ? 220 : 60]);
    for (const [group, quota] of plan) {
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
