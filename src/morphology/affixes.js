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

export function generateAffixes(spec, model, reserved = new Set()) {
    const make = createAffixFactory(spec, reserved);
    const cases = model.cases;
    const result = { caseEndings: {}, numberMarkers: { plural: '', dual: '', mode: spec.plural }, genderEndings: {}, fused: null };
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
        return Object.freeze(result);
    }

    for (const c of cases) result.caseEndings[c] = c === model.baseCase ? '' : make();
    if (spec.numbers.includes('plural')) result.numberMarkers.plural = make();
    if (spec.numbers.includes('dual')) result.numberMarkers.dual = make();
    for (const g of spec.genders) result.genderEndings[g] = make();
    return Object.freeze(result);
}

export const FUSED_NO_GENDER = NO_GENDER;
