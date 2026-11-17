// Reference and information structure: the choices a language makes about pointing at things and about what a clause is about.
//   demonstratives  position relative to the noun, one or two distance terms
//   reflexive       one word per person, or a single word for all persons
//   topic           none (no marking) | front (topic first) | particle (topic first, followed by a marker)
//   focus           none | front (focused phrase moved to the front, after a topic) | particle (marker after the focused phrase)
// The strategies are drawn from the seed; head-final (SOV, SVO-with-postpositions…) languages favour particles, as attested languages do.
import { rng } from '../core/rng.js';

const pick = (r, table) => { const total = table.reduce((s, [, w]) => s + w, 0); let x = r() * total; for (const [v, w] of table) { x -= w; if (x < 0) return v; } return table[0][0]; };

export function chooseInformation(spec) {
    const r = rng(`${spec.seed}|information`);
    const final = spec.order.indexOf('V') > spec.order.indexOf('O');
    return Object.freeze({
        demonstrative: { position: pick(r, [[spec.adjPosition === 'before' ? 'before' : 'after', 3], [spec.adjPosition === 'before' ? 'after' : 'before', 1]]), terms: pick(r, [['two', 4], ['one', 1]]) },
        reflexive: pick(r, [['person', 3], ['invariant', 2]]),
        topic: pick(r, [['none', 2], ['front', 3], ['particle', final ? 4 : 1]]),
        focus: pick(r, [['none', 2], ['front', 3], ['particle', final ? 3 : 2]])
    });
}

const REFLEXIVES = { 1: { singular: 'function.myself', plural: 'function.ourselves' }, 2: { singular: 'function.yourself', plural: 'function.yourself' }, 3: { male: 'function.himself', female: 'function.herself', neutral: 'function.itself', plural: 'function.themselves' } };
export const REFLEXIVE_REFS = Object.freeze([...new Set([...Object.values(REFLEXIVES[1]), ...Object.values(REFLEXIVES[2]), ...Object.values(REFLEXIVES[3])])]);
// the reflexive word for a subject: person (1-3), number, and for the third person the pronoun class (male, female, neutral)
export function reflexiveRef(info, person, number, cls = 'neutral') {
    if (info?.reflexive === 'invariant') return 'function.himself';
    if (person === 3) return number === 'plural' ? REFLEXIVES[3].plural : REFLEXIVES[3][cls] ?? REFLEXIVES[3].neutral;
    return REFLEXIVES[person][number] ?? REFLEXIVES[person].singular;
}

export function describeInformation(info) {
    const d = info.demonstrative;
    return {
        demonstratives: `${d.terms === 'two' ? 'two terms (this / that)' : 'one term (no distance contrast)'}, ${d.position} the noun; replace the article`,
        reflexive: info.reflexive === 'person' ? 'a separate word for each person and number' : 'one word for all persons',
        topic: { none: 'not marked', front: 'the topic comes first', particle: 'the topic comes first and is followed by a marker' }[info.topic],
        focus: { none: 'not marked', front: 'the focused phrase is moved to the front', particle: 'a marker follows the focused phrase' }[info.focus]
    };
}
