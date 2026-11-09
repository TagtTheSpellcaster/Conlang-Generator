// Morphological model (which cases exist) and affix inventory (what the endings are).
import { createAffixFactory } from '../phonology/words.js';

export const CASE_SETS = Object.freeze({
    accusative: Object.freeze({
        minimal: ['nominative', 'accusative'],
        moderate: ['nominative', 'accusative', 'genitive', 'dative'],
        extensive: ['nominative', 'accusative', 'genitive', 'dative', 'locative', 'ablative', 'instrumental']
    }),
    ergative: Object.freeze({
        minimal: ['absolutive', 'ergative'],
        moderate: ['absolutive', 'ergative', 'genitive', 'dative'],
        extensive: ['absolutive', 'ergative', 'genitive', 'dative', 'locative', 'ablative', 'instrumental']
    })
});

export function buildMorphologyModel(spec) {
    const ergative = spec.relations === 'ergative';
    const cases = spec.relations === 'prepositions' ? [] : CASE_SETS[ergative ? 'ergative' : 'accusative'][spec.caseSystem].slice();
    return Object.freeze({
        relationModel: spec.relations,
        alignment: ergative ? 'ergative-absolutive' : 'nominative-accusative',
        caseSystem: spec.relations === 'prepositions' ? null : spec.caseSystem,
        cases,
        fusional: spec.morphology === 'fusional',
        // first case of the list is the unmarked one
        baseCase: cases[0] ?? null,
        stemRule: 'endings attach to the lexical stem, never to an already inflected form'
    });
}

const NO_GENDER = '-';

export const PERSONS = Object.freeze([1, 2, 3]);
export const TENSES = Object.freeze(['present', 'past', 'future']);
// Person/number cells used by verb agreement and possessive suffixes, e.g. "1.singular".
export const personCells = spec => {
    const numbers = ['singular', 'plural', ...(spec.numbers.includes('dual') ? ['dual'] : [])];
    return PERSONS.flatMap(p => numbers.map(n => `${p}.${n}`));
};
export const cellOf = (person, number) => `${person ?? 3}.${number ?? 'singular'}`;

export function generateAffixes(spec, model, reserved = new Set()) {
    const make = createAffixFactory(spec, reserved);
    const cases = model.cases;
    const result = { caseEndings: {}, numberMarkers: { plural: '', dual: '', mode: spec.plural }, genderEndings: {}, fused: null, possessive: null, verb: null };
    if (spec.morphology === 'isolating') return Object.freeze(result);

    if (model.fusional) {
        // One portmanteau ending per gender x number x case. The unmarked cell stays empty.
        const genders = spec.genders.length ? spec.genders : [NO_GENDER];
        const fused = {};
        for (const g of genders) {
            fused[g] = {};
            for (const n of spec.numbers) {
                fused[g][n] = {};
                for (const c of cases.length ? cases : [null]) {
                    const unmarked = n === 'singular' && c === model.baseCase;
                    fused[g][n][c ?? '-'] = unmarked ? '' : make();
                }
            }
        }
        result.fused = fused;
        result.verb = fusionalVerb(spec, make);
        return Object.freeze(result);
    }

    for (const c of cases) result.caseEndings[c] = c === model.baseCase ? '' : make();
    if (spec.numbers.includes('plural')) result.numberMarkers.plural = make();
    if (spec.numbers.includes('dual')) result.numberMarkers.dual = make();
    for (const g of spec.genders) result.genderEndings[g] = make();
    // Possessor suffixes on the noun (agglutinative only): one per person and number.
    result.possessive = {};
    for (const cell of personCells(spec)) result.possessive[cell] = make();
    result.verb = agglutinativeVerb(spec, make);
    return Object.freeze(result);
}

// Verb suffix chain: stem - POTENTIAL - NEGATION - TENSE - SUBJECT AGREEMENT (imperative replaces tense and agreement).
// Present tense and third person singular are unmarked.
function agglutinativeVerb(spec, make) {
    const verb = { mode: 'agglutinative', order: ['potential', 'negation', 'tense', 'agreement'], tense: { present: '', past: make(), future: make() }, negation: make(), potential: make(), imperative: make(), agreement: {} };
    for (const cell of personCells(spec)) verb.agreement[cell] = cell === '3.singular' ? '' : make();
    return verb;
}

// One portmanteau ending per tense x person x number. Negation and ability stay separate words, the imperative is the bare stem.
function fusionalVerb(spec, make) {
    const fused = {};
    for (const tense of TENSES) {
        fused[tense] = {};
        for (const cell of personCells(spec)) fused[tense][cell] = tense === 'present' && cell === '3.singular' ? '' : make();
    }
    return { mode: 'fusional', fused, negation: '', potential: '', imperative: '' };
}

export const FUSED_NO_GENDER = NO_GENDER;
