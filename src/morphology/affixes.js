// Morphological model (which cases exist) and affix inventory (what the endings are).
import { createAffixFactory } from '../phonology/words.js';
import { rng } from '../core/rng.js';
import { chooseValency, VOICES } from '../syntax/valency.js';
import { chooseSubordination, SUBORDINATOR_KEYS } from '../syntax/subordination.js';
import { chooseLocal, evidentialsOf } from '../syntax/local.js';

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
        result.classOverlays = inflectionClasses(spec, result, make);
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
    // Added last so that the affixes of earlier versions keep their shapes for a given seed.
    result.comparative = make();
    result.classOverlays = inflectionClasses(spec, result, make);
    // Voice and valency suffixes, drawn last again so that every earlier ending keeps its shape.
    const valency = chooseValency(spec);
    result.voice = {};
    for (const v of VOICES) if (valency[v] === 'affix') result.voice[v] = make();
    // Subordinating suffixes and the converb, after the voice suffixes for the same reason.
    const sub = chooseSubordination(spec);
    result.subordinators = {};
    if (sub.adverbial.mode === 'suffix') for (const k of SUBORDINATOR_KEYS) result.subordinators[k] = make();
    if (sub.converb) result.subordinators.converb = make();
    // Prohibitive and evidential suffixes, last again.
    const local = chooseLocal(spec);
    result.local = { evidential: {} };
    if (local.prohibitive === 'suffix') result.local.prohibitive = make();
    if (local.evidentiality.mode === 'suffix') for (const k of evidentialsOf(local)) result.local.evidential[k] = make();
    return Object.freeze(result);
}

// Verb suffix chain: stem - VOICE - POTENTIAL - NEGATION - ASPECT - TENSE - SUBJECT AGREEMENT.
// The imperative replaces tense and agreement; the optative replaces the tense and keeps the agreement.
// Present tense and third person singular are unmarked.
function agglutinativeVerb(spec, make) {
    const verb = { mode: 'agglutinative', order: ['potential', 'negation', 'aspect', 'tense', 'agreement'], tense: { present: '', past: make(), future: make() }, negation: make(), potential: make(), imperative: make(), agreement: {} };
    for (const cell of personCells(spec)) verb.agreement[cell] = cell === '3.singular' ? '' : make();
    verb.aspect = { progressive: make(), perfect: make() };
    verb.optative = make();
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


// ---- inflection classes ---------------------------------------------------------------------------------------------
// Classes are alternative paradigms: class 0 is the base table, every other class overrides part of it (agglutinative
// languages: a few endings; fusional languages: most of the portmanteau endings, with some cells shared). Which class
// a word belongs to is decided in the engine from the last sound of its mother-language stem (see assignClasses).
// Generated after everything else with the same factory, so the base endings of a seed do not change.
export function inflectionClasses(spec, t, make) {
    const r = rng(`${spec.seed}|inflection classes`);
    const fusional = !!t.fused;
    const pickCount = (weights) => { const x = r(); let a = 0; for (const [n, w] of weights) { a += w; if (x < a) return n; } return weights.at(-1)[0]; };
    const nounCount = fusional ? pickCount([[2, 0.35], [3, 0.4], [4, 0.25]]) : pickCount([[1, 0.55], [2, 0.45]]);
    const verbCount = fusional ? pickCount([[2, 0.55], [3, 0.45]]) : pickCount([[1, 0.6], [2, 0.4]]);
    const noun = [null], verb = [null];
    for (let k = 1; k < nounCount; k++) {
        if (fusional) {
            const ov = {};
            for (const [g, byN] of Object.entries(t.fused)) { ov[g] = {}; for (const [n, byC] of Object.entries(byN)) { ov[g][n] = {}; for (const [c, e] of Object.entries(byC)) ov[g][n][c] = e === '' ? '' : (r() < 0.3 ? e : make()); } }
            noun.push({ fused: ov });
        } else {
            const ov = { numberMarkers: {}, caseEndings: {} };
            if (t.numberMarkers.plural && r() < 0.85) ov.numberMarkers.plural = make();
            if (t.numberMarkers.dual && r() < 0.5) ov.numberMarkers.dual = make();
            for (const [c, e] of Object.entries(t.caseEndings)) if (e && r() < 0.4) ov.caseEndings[c] = make();
            if (!Object.keys(ov.numberMarkers).length && !Object.keys(ov.caseEndings).length) {
                const first = Object.keys(t.caseEndings).find(c => t.caseEndings[c]);
                if (t.numberMarkers.plural) ov.numberMarkers.plural = make(); else if (first) ov.caseEndings[first] = make();
            }
            noun.push(ov);
        }
    }
    const v = t.verb;
    for (let k = 1; k < verbCount && v; k++) {
        if (v.mode === 'fusional') {
            const ov = { fused: {} };
            for (const [tense, cells] of Object.entries(v.fused)) { ov.fused[tense] = {}; for (const [cell, e] of Object.entries(cells)) ov.fused[tense][cell] = e === '' ? '' : (r() < 0.35 ? e : make()); }
            verb.push(ov);
        } else {
            const ov = { tense: {}, agreement: {} };
            for (const tense of ['past', 'future']) if (r() < 0.65) ov.tense[tense] = make();
            for (const [cell, e] of Object.entries(v.agreement)) if (e && r() < 0.45) ov.agreement[cell] = make();
            verb.push(ov);
        }
    }
    return { noun, verb };
}
