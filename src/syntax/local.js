// Local constructions, each decided by the language from its seed:
//   prohibitive   how "do not!" is made: with the ordinary negation, with a separate prohibitive word, or (agglutinative) with a verb suffix
//   wh            question words (who, what, where, when, why): fronted or left in place; optionally with the question particle
//   evidentiality how the source of information is marked: none, two (witnessed / reported) or three (witnessed / reported / inferred) values,
//                 by a particle after the verb or (agglutinative) a verb suffix
//   tenseSequence backshift (a past main verb puts the reported clause in the past) or absolute (the reported clause keeps the speaker's tense)
//   register      polite address: the plural of the second person ("pronoun"), a politeness particle at the edge of the clause, both or neither
import { rng } from '../core/rng.js';

export const EVIDENTIALS = Object.freeze(['direct', 'reported', 'inferred']);
export const EVIDENTIAL_ENTRY = Object.freeze({ direct: 'witnessed marker:particle', reported: 'reported marker:particle', inferred: 'inferred marker:particle' });
const pick = (r, table) => { const total = table.reduce((s, [, w]) => s + w, 0); let x = r() * total; for (const [v, w] of table) { x -= w; if (x < 0) return v; } return table[0][0]; };

export function chooseLocal(spec) {
    const r = rng(`${spec.seed}|local`);
    const agglutinative = spec.morphology === 'agglutinative';
    const verbFirst = spec.order.indexOf('V') < spec.order.indexOf('O');
    const prohibitive = pick(r, [['negation', 5], ['particle', 3], ['suffix', agglutinative ? 3 : 0]]);
    const front = r() < (verbFirst ? 0.55 : 0.12), whParticle = r() < 0.3;
    const system = pick(r, [['none', 5], ['two', 3], ['three', 2]]), evMode = r() < 0.6 && agglutinative ? 'suffix' : 'particle';
    const tenseSequence = pick(r, [['backshift', 5], ['absolute', 5]]);
    const pronoun = r() < 0.3, particle = pick(r, [['none', 5], ['after', 3], ['before', 2]]);
    return Object.freeze({
        prohibitive,
        wh: { position: front ? 'front' : 'in-situ', particle: whParticle },
        evidentiality: { system, mode: system === 'none' ? null : evMode },
        tenseSequence,
        register: { pronoun, particle }
    });
}

export const evidentialsOf = local => local.evidentiality.system === 'three' ? EVIDENTIALS : local.evidentiality.system === 'two' ? ['direct', 'reported'] : [];

export function describeLocal(l) {
    const ev = l.evidentiality;
    return {
        prohibitive: { negation: 'the ordinary negation', particle: 'a separate prohibitive word', suffix: 'a verb suffix (replaces the negation)' }[l.prohibitive],
        wh: `${l.wh.position === 'front' ? 'question words at the start of the sentence' : 'question words stay in place'}${l.wh.particle ? ', with the question particle' : ''}`,
        evidentiality: ev.system === 'none' ? 'not marked' : `${ev.system === 'two' ? 'witnessed / reported' : 'witnessed / reported / inferred'}, ${ev.mode === 'suffix' ? 'verb suffix' : 'particle after the verb'}`,
        tenseSequence: l.tenseSequence === 'backshift' ? 'a past main verb puts the reported clause in the past' : 'the reported clause keeps the speaker\'s tense',
        register: l.register.pronoun || l.register.particle !== 'none' ? [l.register.pronoun ? 'plural pronoun for polite address' : null, l.register.particle !== 'none' ? `politeness particle ${l.register.particle === 'after' ? 'after' : 'before'} the clause` : null].filter(Boolean).join(' + ') : 'no marked politeness'
    };
}
