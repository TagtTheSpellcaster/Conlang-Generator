// inflect(entry, features, morphology) -> { stem, parts: [{text, kind, meaning?}], form }
// Used by the tables in the UI and by the sentence realiser, so both always agree.
//   nouns:      stem - NUMBER - POSSESSOR - CASE          (agglutinative; fusional: one portmanteau ending)
//   adjectives: stem - GENDER - NUMBER - CASE
//   verbs:      stem - POTENTIAL - NEGATION - TENSE - AGREEMENT   (fusional: tense+person+number portmanteau)
import { hash } from '../core/rng.js';
import { FUSED_NO_GENDER, cellOf } from './affixes.js';
import { resolvePhonotactics, medialRunOk } from '../phonology/words.js';

// Grammatical gender of a noun: deterministic from (seed, id), never stored in the dictionary.
export function genderOf(entry, spec) {
    if (!spec.genders.length) return null;
    return spec.genders[hash(`${spec.seed}|gender|${entry.id}`) % spec.genders.length];
}

const INFLECTS = new Set(['noun', 'adjective', 'pronoun', 'verb']);

const phonCache = new WeakMap();
const phonFor = spec => { if (!phonCache.has(spec)) phonCache.set(spec, resolvePhonotactics(spec)); return phonCache.get(spec); };

const isVowel = (ch, vowels) => vowels.includes(ch);
const trailingConsonants = (w, vowels) => { let i = w.length; while (i > 0 && !isVowel(w[i - 1], vowels)) i--; return w.slice(i); };
const leadingConsonants = (w, vowels) => { let i = 0; while (i < w.length && !isVowel(w[i], vowels)) i++; return w.slice(0, i); };
const lastVowel = (w, vowels) => { for (let i = w.length - 1; i >= 0; i--) if (isVowel(w[i], vowels)) return w[i]; return ''; };

// Attaches an affix to what has been built so far. If the junction would create a consonant run the
// phonotactics do not allow, the last vowel of the stem is inserted as a linking vowel (it becomes part of the affix).
export function attach(built, affix, spec) {
    if (!affix) return affix;
    const ph = phonFor(spec);
    const tail = trailingConsonants(built, ph.vowels), head = leadingConsonants(affix, ph.vowels);
    if (tail && head && !medialRunOk(tail + head, ph)) {
        const v = lastVowel(built, ph.vowels);
        if (v) return v + affix;
    }
    return affix;
}

export function inflect(entry, features = {}, morph) {
    const stem = entry.form;
    const { spec, affixes, model } = morph;
    const parts = [{ text: stem, kind: 'stem' }];
    const built = () => parts.map(p => p.text).join('');
    const add = (text, kind, meaning, at = parts.length) => {
        if (!text) return;
        if (at === 0) parts.unshift({ text, kind, meaning });
        else parts.splice(at, 0, { text: attach(parts.slice(0, at).map(p => p.text).join(''), text, spec), kind, meaning });
    };
    const finish = () => ({ stem, parts, form: built() });
    if (!INFLECTS.has(entry.pos) || spec.morphology === 'isolating') return finish();

    if (entry.pos === 'verb') return inflectVerb(entry, features, morph, { parts, add, finish });

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
        add(ending, 'fused', [gender, number, grammaticalCase].filter(Boolean).join('.'));
        return finish();
    }

    const markers = affixes.numberMarkers;
    const marker = number === 'plural' ? markers.plural : number === 'dual' ? markers.dual : '';
    // Gender agreement is shown on adjectives; nouns carry it only as a class.
    if (entry.pos === 'adjective' && gender) add(affixes.genderEndings[gender], 'gender', gender);
    if (marker && entry.pos !== 'pronoun') {
        if (markers.mode === 'prefix') add(marker, 'number', number, 0);
        else add(marker, 'number', number);
    }
    if (entry.pos === 'noun' && features.possessor && affixes.possessive?.[features.possessor]) add(affixes.possessive[features.possessor], 'possessor', `poss.${features.possessor}`);
    if (grammaticalCase) add(affixes.caseEndings[grammaticalCase], 'case', grammaticalCase);
    return finish();
}

// features: { tense: present|past|future, person: 1|2|3, number, negative, potential, imperative }
function inflectVerb(entry, f, morph, { add, finish }) {
    const v = morph.affixes.verb;
    if (!v) return finish();
    const cell = cellOf(f.person, f.number);
    const tense = f.tense ?? 'present';
    if (v.mode === 'fusional') {
        if (!f.imperative) add(v.fused[tense]?.[cell] ?? '', 'fused', `${tense}.${cell}`);
        return finish();
    }
    if (f.potential) add(v.potential, 'potential', 'can');
    if (f.negative) add(v.negation, 'negation', 'not');
    if (f.imperative) { add(v.imperative, 'mood', 'imperative'); return finish(); }
    add(v.tense[tense], 'tense', tense);
    add(v.agreement[cell], 'agreement', cell);
    return finish();
}
