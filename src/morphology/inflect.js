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

// ---- inflection classes ---------------------------------------------------------------------------------------------
const merge = (base, over) => {
    if (over === undefined) return base;
    if (typeof over !== 'object' || over === null || Array.isArray(over)) return over;
    const out = { ...base };
    for (const [k, v] of Object.entries(over)) out[k] = merge(base?.[k], v);
    return out;
};
const classCache = new WeakMap();
// The paradigm of a word: the base tables with the overrides of its class.
export function classOf(entry, affixes, spec) {
    const group = entry.pos === 'verb' ? 'verb' : (entry.pos === 'noun' || entry.pos === 'adjective') ? 'noun' : null;
    const count = group ? affixes.classOverlays?.[group]?.length ?? 1 : 1;
    if (count < 2) return 0;
    const map = affixes.classMap?.[group];
    const exceptions = affixes.classMap?.exceptions ?? 0;
    const h = hash(`${spec.seed}|class|${entry.id}`);
    if (!map || h % 100 < exceptions * 100) return h % count;
    const last = (entry.protoForm ?? entry.form).slice(-1);
    return map[last] ?? h % count;
}
function paradigm(affixes, k, group) {
    const ov = affixes.classOverlays?.[group]?.[k];
    if (!ov) return affixes;
    if (!classCache.has(affixes)) classCache.set(affixes, new Map());
    const c = classCache.get(affixes);
    const key = `${group}${k}`;
    if (!c.has(key)) c.set(key, { ...affixes, ...(group === 'verb' ? { verb: merge(affixes.verb, ov) } : merge(affixes, ov)) });
    return c.get(key);
}

// Full inflection: the regular form (daughter stem + daughter endings) unless the history of the language says otherwise.
// The mother's stem and mother's endings were joined first and the whole word went through the sound changes, so a change can
// reach across the boundary (umlaut, lenition, palatalisation…): that is where irregular and alternating forms come from.
export function inflect(entry, features = {}, morph) {
    const r = inflectCore(entry, features, morph);
    const H = morph.affixes.history;
    if (!H || entry.loan || entry.protoForm === undefined || r.parts.length < 2 || r.parts[0].kind !== 'stem') return r;
    if (H.convert(entry.protoForm) !== entry.form) return r;                       // stem blocked or repaired: keep the regular form
    const p = inflectCore({ ...entry, form: entry.protoForm }, features, { spec: morph.spec, model: morph.model, affixes: H.proto });
    if (p.parts.length < 2) return r;
    const form = H.convert(p.form);
    if (form === r.form || !form) return r;
    // Only a changed stem counts (the endings of a class stay what the table says), and only for words the language has not
    // levelled by analogy (a fixed share of the words, decided by the word and the cell, so a paradigm keeps its irregularities).
    const ending = r.parts.slice(1).map(x => x.text).join('');
    if (!(form.endsWith(ending) && form.length > ending.length)) return r;
    const altStem = form.slice(0, form.length - ending.length);
    if (altStem === entry.form) return r;
    if (hash(`${morph.spec.seed}|level|${entry.id}`) % 100 >= H.survive) return r;
    const parts = [{ text: altStem, kind: 'stem-alt', regular: entry.form }, ...r.parts.slice(1)];
    return { stem: entry.form, parts, form, irregular: { regular: r.form, proto: p.form, rules: boundaryRules(H, entry.protoForm, p.form) } };
}

// Rules that acted on the joined word but not on the bare stem: the ones the ending set off.
function boundaryRules(H, stem, word) {
    const own = [...H.trace(stem)];
    const onWord = H.trace(word);
    const set = onWord.filter(id => { const i = own.indexOf(id); if (i >= 0) { own.splice(i, 1); return false; } return true; });
    if (set.length) return set;
    // nothing new acted: a change that hit the stem at the end of the word did not, now that an ending follows
    const rest = H.trace(stem).filter(id => !onWord.includes(id));
    return rest.map(id => `${id} (not applied: no longer word-final)`);
}

function inflectCore(entry, features = {}, morph) {
    const stem = entry.form;
    const { spec, model } = morph;
    const group = entry.pos === 'verb' ? 'verb' : (entry.pos === 'noun' || entry.pos === 'adjective') ? 'noun' : null;
    const affixes = group ? paradigm(morph.affixes, classOf(entry, morph.affixes, spec), group) : morph.affixes;
    const supp = morph.affixes.suppletion?.[entry.id];
    if (entry.pos === 'adjective' && features.degree === 'comparative' && supp?.comparative) return { stem, parts: [{ text: supp.comparative, kind: 'suppletive', meaning: 'more' }], form: supp.comparative };
    const parts = [{ text: stem, kind: 'stem' }];
    const built = () => parts.map(p => p.text).join('');
    const add = (text, kind, meaning, at = parts.length) => {
        if (!text) return;
        if (at === 0) parts.unshift({ text, kind, meaning });
        else parts.splice(at, 0, { text: attach(parts.slice(0, at).map(p => p.text).join(''), text, spec), kind, meaning });
    };
    const finish = () => ({ stem, parts, form: built() });
    if (!INFLECTS.has(entry.pos) || spec.morphology === 'isolating') return finish();

    if (entry.pos === 'verb') return inflectVerb(entry, features, { ...morph, affixes, supp }, { parts, add, finish });

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
    if (entry.pos === 'adjective' && features.degree === 'comparative' && affixes.comparative) add(affixes.comparative, 'degree', 'more');
    if (entry.pos === 'adjective' && gender) add(affixes.genderEndings[gender], 'gender', gender);
    if (marker && entry.pos !== 'pronoun') {
        if (markers.mode === 'prefix') add(marker, 'number', number, 0);
        else add(marker, 'number', number);
    }
    if (entry.pos === 'noun' && features.possessor && affixes.possessive?.[features.possessor]) add(affixes.possessive[features.possessor], 'possessor', `poss.${features.possessor}`);
    if (grammaticalCase) add(affixes.caseEndings[grammaticalCase], 'case', grammaticalCase);
    return finish();
}

// features: { tense: present|past|future, person: 1|2|3, number, negative, potential, imperative, optative, aspect: progressive|perfect, voice: passive|antipassive|causative|applicative, converb, subordinator: reason|condition|time|concession|simultaneous }
function inflectVerb(entry, f, morph, { parts, add, finish }) {
    const v = morph.affixes.verb;
    if (!v) return finish();
    const cell = cellOf(f.person, f.number);
    const tense = f.tense ?? 'present';
    // suppletion: another stem for a tense (went, was…)
    const stemFor = morph.supp?.[tense];
    if (stemFor && !f.imperative) parts[0] = { text: stemFor, kind: 'suppletive', meaning: tense };
    if (v.mode === 'fusional') {
        if (!f.imperative) add(v.fused[tense]?.[cell] ?? '', 'fused', `${tense}.${cell}`);
        return finish();
    }
    if (f.voice) add(morph.affixes.voice?.[f.voice], 'voice', f.voice);
    if (f.potential) add(v.potential, 'potential', 'can');
    if (f.negative && f.imperative && f.prohibitive && morph.affixes.local?.prohibitive) add(morph.affixes.local.prohibitive, 'prohibitive', 'do not');
    else if (f.negative) add(v.negation, 'negation', 'not');
    if (f.imperative) { add(v.imperative, 'mood', 'imperative'); return finish(); }
    if (f.optative) { add(v.optative, 'mood', 'optative'); add(v.agreement[cell], 'agreement', cell); return finish(); }
    if (f.aspect) add(v.aspect?.[f.aspect], 'aspect', f.aspect);
    // the converb is non-finite: no tense, no agreement
    if (f.converb) { add(morph.affixes.subordinators?.converb, 'converb', 'converb'); return finish(); }
    add(v.tense[tense], 'tense', tense);
    add(v.agreement[cell], 'agreement', cell);
    if (f.evidential) add(morph.affixes.local?.evidential?.[f.evidential], 'evidential', f.evidential);
    if (f.subordinator) add(morph.affixes.subordinators?.[f.subordinator], 'subordinator', f.subordinator);
    return finish();
}
