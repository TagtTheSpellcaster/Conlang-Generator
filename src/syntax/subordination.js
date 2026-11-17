// Subordination and reported speech: how a language joins clauses.
//   complement   "I know that he is here": a complementizer before or after the clause, or none (the clauses are juxtaposed)
//   adverbial    because / if / when / although / while: a separate word before or after the clause, or a suffix on the verb of the
//                subordinate clause (agglutinative languages only; the other conjunctions always stay words)
//   converb      "singing, he walked": a verb form without tense or agreement that shares the subject of the main clause (a suffix,
//                agglutinative languages only); the others join the two clauses with "and"
//   reported     reported speech: indirect (a complement clause), direct (a quotation) or both (the text chooses)
//   quotative    a marker next to a direct quotation, or nothing
import { rng } from '../core/rng.js';

// conjunction -> suffix
export const SUFFIX_KEY = Object.freeze({ 'because:conjunction': 'reason', 'if:conjunction': 'condition', 'when:conjunction': 'time', 'whenever:conjunction': 'time', 'although:conjunction': 'concession', 'though:conjunction': 'concession', 'while:conjunction': 'simultaneous' });
export const SUBORDINATOR_KEYS = Object.freeze(['reason', 'condition', 'time', 'concession', 'simultaneous']);
const pick = (r, table) => { const total = table.reduce((s, [, w]) => s + w, 0); let x = r() * total; for (const [v, w] of table) { x -= w; if (x < 0) return v; } return table[0][0]; };

export function chooseSubordination(spec) {
    const r = rng(`${spec.seed}|subordination`);
    const final = spec.order.indexOf('V') > spec.order.indexOf('O');            // head-final order
    const follow = final ? 'after' : 'before', other = final ? 'before' : 'after';
    const agglutinative = spec.morphology === 'agglutinative';
    const complementMode = pick(r, [['word', 6], ['none', 2]]), complementPos = pick(r, [[follow, 8], [other, 2]]);
    const adverbialMode = pick(r, [['word', 4], ['suffix', 5]]), adverbialPos = pick(r, [[follow, 8], [other, 2]]);
    const converb = r() < 0.7, reported = pick(r, [['indirect', 4], ['both', 4], ['direct', 2]]), quotative = pick(r, [['particle', 4], ['none', 3]]);
    return Object.freeze({
        complement: { mode: complementMode, position: complementPos },
        adverbial: { mode: agglutinative ? adverbialMode : 'word', position: adverbialPos },
        converb: agglutinative && converb,
        reported, quotative: reported === 'indirect' ? 'none' : quotative
    });
}

export function describeSubordination(s) {
    return {
        complement: s.complement.mode === 'none' ? 'no complementizer: the clauses are juxtaposed' : `complementizer ${s.complement.position} the clause`,
        adverbial: s.adverbial.mode === 'suffix' ? 'suffix on the verb of the subordinate clause (because, if, when, although, while); other conjunctions are words' : `conjunction ${s.adverbial.position} the clause`,
        converb: s.converb ? 'verb suffix without tense or agreement, same subject as the main clause' : 'none: the clauses are joined with "and"',
        reported: { indirect: 'indirect only (a complement clause)', direct: 'direct only (a quotation)', both: 'direct and indirect' }[s.reported],
        quotative: s.quotative === 'particle' ? 'a marker next to the quotation' : 'no marker'
    };
}
