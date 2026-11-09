// inflect(entry, {number, case, gender}, morphology) -> { stem, parts, form }
// Used by the tables in the UI and by the sentence realiser, so both always agree.
import { hash } from '../core/rng.js';
import { FUSED_NO_GENDER } from './affixes.js';

// Grammatical gender of a noun: deterministic from (seed, id), never stored in the dictionary.
export function genderOf(entry, spec) {
    if (!spec.genders.length) return null;
    return spec.genders[hash(`${spec.seed}|gender|${entry.id}`) % spec.genders.length];
}

const INFLECTS = new Set(['noun', 'adjective', 'pronoun']);

export function inflect(entry, features = {}, morph) {
    const stem = entry.form;
    const { spec, affixes, model } = morph;
    const parts = [{ text: stem, kind: 'stem' }];
    const finish = () => ({ stem, parts, form: parts.map(p => p.text).join('') });
    if (!INFLECTS.has(entry.pos) || spec.morphology === 'isolating') return finish();

    const number = entry.pos === 'pronoun' ? 'singular' : (features.number ?? 'singular');
    // Object-form pronouns (me, you) already encode the case.
    const caseless = entry.pos === 'pronoun' && entry.features.role === 'object';
    const grammaticalCase = caseless ? null : (model.cases.includes(features.case) ? features.case : model.baseCase);
    let gender = null;
    if (spec.genders.length) {
        if (entry.pos === 'adjective') gender = features.gender ?? spec.genders[0];
        else if (entry.pos === 'noun') gender = features.gender ?? genderOf(entry, spec);
    }

    if (affixes.fused) {
        const ending = affixes.fused[gender ?? FUSED_NO_GENDER]?.[number]?.[grammaticalCase ?? '-'] ?? '';
        if (ending) parts.push({ text: ending, kind: 'fused' });
        return finish();
    }

    const markers = affixes.numberMarkers;
    const marker = number === 'plural' ? markers.plural : number === 'dual' ? markers.dual : '';
    if (marker && entry.pos !== 'pronoun') {
        if (markers.mode === 'prefix') parts.unshift({ text: marker, kind: 'number' });
        else parts.push({ text: marker, kind: 'number' });
    }
    // Gender agreement is shown on adjectives; nouns carry it only as a class.
    if (entry.pos === 'adjective' && gender && affixes.genderEndings[gender]) parts.splice(parts.findIndex(p => p.kind === 'stem') + 1, 0, { text: affixes.genderEndings[gender], kind: 'gender' });
    const caseEnding = grammaticalCase ? affixes.caseEndings[grammaticalCase] : '';
    if (caseEnding) parts.push({ text: caseEnding, kind: 'case' });
    return finish();
}
