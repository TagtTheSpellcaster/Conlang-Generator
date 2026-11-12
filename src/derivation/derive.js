// Lexical derivation: derived words and compounds are built from the roots of the words they come from, so that
// related meanings share material (baker = bake + agent suffix, night watch = night + watch).
// The relations are data (data/derivations.json, made by tools/derivation/build.mjs from the dictionary); this module
// decides how the language marks each kind of derivation and builds the forms. Pure and deterministic.
import { rng } from '../core/rng.js';
import { createAffixFactory, resolvePhonotactics } from '../phonology/words.js';
import { join } from '../numerals/system.js';

// type -> [label, what the affix does]
export const DERIVATION_TYPES = Object.freeze({
    agent: ['Agent', 'one who does X (bake → baker)'], act: ['Action', 'the act of X (read → reading)'], result: ['Result', 'result or thing of X (move → movement)'],
    quality: ['Quality', 'being X (dark → darkness)'], abstract: ['Abstract', 'state, group or office of X (king → kingdom)'], place: ['Place', 'place of X (nurse → nursery)'],
    diminutive: ['Diminutive', 'small X (hatch → hatchling)'], feminine: ['Feminine', 'female X (god → goddess)'], adjective: ['Adjective', 'of X, like X, full of X (salt → salty)'],
    privative: ['Privative', 'without X (fear → fearless)'], adverb: ['Adverb', 'in the manner of X (slow → slowly)'], causative: ['Causative', 'make X (hard → harden)'],
    negative: ['Negative', 'not X, undo X (loyal → disloyal)'], repetitive: ['Repetitive', 'X again (turn → return)'], excess: ['Excess', 'X too much (heat → overheat)']
});
export const COMPOUND = 'compound';
// Affixes that may share one form: a language rarely keeps a separate ending for each of these.
const MERGE = [['result', 'act', 0.6], ['abstract', 'quality', 0.5], ['causative', 'adjective', 0.25]];
const PREFIXABLE = new Set(['negative', 'repetitive', 'excess']);
const TYPES = Object.keys(DERIVATION_TYPES);

// The language's derivational morphemes: { type: { form, position, shares } }. Own random stream and own affix factory,
// so nothing else about a seed changes. `reserved` = forms the affixes must not equal.
export function deriveAffixes(spec, reserved = new Set()) {
    const r = rng(`${spec.seed}|derivation|plan`);
    const prefixing = r() < 0.15;
    const draws = Object.fromEntries(TYPES.map(t => [t, [r(), r()]]));
    const make = createAffixFactory({ ...spec, seed: `${spec.seed}|derivation` }, reserved);
    const affixes = {};
    const sharedWith = {};
    for (const [t, into, p] of MERGE) if (draws[t][1] < p) sharedWith[t] = into;
    for (const t of TYPES) {
        if (sharedWith[t]) continue;
        affixes[t] = { form: make(), position: prefixing || (PREFIXABLE.has(t) && draws[t][0] < 0.5) ? 'prefix' : 'suffix', shares: [] };
    }
    for (const [t, into] of Object.entries(sharedWith)) {
        const target = sharedWith[into] ?? into;
        affixes[t] = { ...affixes[target], shares: [] };
        affixes[target].shares.push(t);
        affixes[t].sharedWith = target;
    }
    return affixes;
}

// How the language joins morphemes: what it does when two vowels meet, and whether compounds take a linking vowel.
// Own random stream. hiatus: 'keep' (the vowels stay side by side), 'elide' (the first is lost) or 'glide' (a consonant is put between).
export function derivationPhonology(spec) {
    const r = rng(`${spec.seed}|derivation|phonology`);
    const ph = resolvePhonotactics(spec);
    const a = r(), b = r(), c = r(), d = r();
    const hiatus = a < 0.4 ? 'keep' : a < 0.8 ? 'elide' : 'glide';
    const glide = ['j', 'w', 'h', 'n', 'r', 'l'].find(x => ph.model.c.includes(x)) ?? null;
    const choices = ['o', 'i', 'a', 'e', 'u'].filter(v => ph.vowels.includes(v));
    const linker = b < 0.35 && choices.length ? choices[Math.floor(c * Math.min(choices.length, 3))] : null;
    return { hiatus: hiatus === 'glide' && !glide ? 'elide' : hiatus, glide, linker, order: d };
}

// Joins morphs the way the language does; `compound` adds the linking vowel after a consonant.
function joinMorphs(forms, spec, phon, compound) {
    const ph = resolvePhonotactics(spec);
    const isVowel = ch => ph.vowels.includes(ch);
    return forms.reduce((acc, f) => {
        if (!acc) return f;
        const last = acc[acc.length - 1], first = f[0];
        if (compound && phon.linker && !isVowel(last) && !isVowel(first)) acc += phon.linker;
        else if (isVowel(last) && isVowel(first)) {
            if (phon.hiatus === 'elide' && acc.length > 1) acc = acc.slice(0, -1);
            else if (phon.hiatus === 'glide') acc += phon.glide;
        }
        return join([acc, f], 'compound', spec);
    }, '');
}

// Applies the derivations to a lexicon with forms. `derivations` = [{ id, type, bases: [ids] }].
// Entries whose bases are not all in this lexicon keep their own root. `taken` = forms already used elsewhere (numerals).
export function applyDerivation(lexicon, derivations, spec, affixes, taken = new Set(), phon = derivationPhonology(spec)) {
    const byId = new Map(lexicon.map(e => [e.id, e]));
    const rules = new Map((derivations ?? []).filter(d => byId.has(d.id) && d.bases.every(b => byId.has(b))).map(d => [d.id, d]));
    const forms = new Map(lexicon.map(e => [e.id, e.form]));
    const used = new Map();   // form -> count among all forms and reserved words
    for (const f of [...forms.values(), ...taken]) used.set(f, (used.get(f) ?? 0) + 1);
    const state = new Map();  // id -> 'busy' | 'done' | 'skipped'
    const info = new Map();
    const compoundFirst = spec.adjPosition === 'before';
    const build = id => {
        if (state.get(id) === 'done') return true;
        if (state.get(id) === 'skipped' || state.get(id) === 'busy') return false;
        const rule = rules.get(id);
        if (!rule) return false;
        state.set(id, 'busy');
        for (const b of rule.bases) if (rules.has(b)) build(b);
        let form, detail;
        const baseForms = rule.bases.map(b => forms.get(b));
        if (rule.type === COMPOUND) {
            const [mod, head] = baseForms;
            // isolating languages write the two words apart, like their numerals; the others make one word
            form = spec.morphology === 'isolating' ? join(compoundFirst ? [mod, head] : [head, mod], 'spaced', spec) : joinMorphs(compoundFirst ? [mod, head] : [head, mod], spec, phon, true);
            const order = compoundFirst ? [0, 1] : [1, 0];
            detail = { type: COMPOUND, bases: rule.bases, parts: order.map(i => ({ id: rule.bases[i], form: baseForms[i] })) };
        } else {
            const a = affixes[rule.type];
            if (!a) { state.set(id, 'skipped'); return false; }
            form = joinMorphs(a.position === 'prefix' ? [a.form, baseForms[0]] : [baseForms[0], a.form], spec, phon, false);
            const base = { id: rule.bases[0], form: baseForms[0] }, affix = { affix: rule.type, form: a.form };
            detail = { type: rule.type, bases: rule.bases, affix: a.form, position: a.position, parts: a.position === 'prefix' ? [affix, base] : [base, affix] };
        }
        const old = forms.get(id);
        const others = (used.get(form) ?? 0) - (form === old ? 1 : 0);
        if (!form || others > 0) { state.set(id, 'skipped'); return false; }
        used.set(old, used.get(old) - 1);
        used.set(form, (used.get(form) ?? 0) + 1);
        forms.set(id, form);
        info.set(id, detail);
        state.set(id, 'done');
        return true;
    };
    for (const id of rules.keys()) build(id);
    const stats = { available: rules.size, applied: info.size, byType: {} };
    for (const d of info.values()) stats.byType[d.type] = (stats.byType[d.type] ?? 0) + 1;
    const out = lexicon.map(e => {
        const d = info.get(e.id);
        if (!d) return e;
        // parts in the order they stand in the word; forms are the final forms of the bases
        const parts = d.parts.map(p => (p.affix ? { ...p, text: d.position === 'prefix' ? `${p.form}-` : `-${p.form}`, gloss: DERIVATION_TYPES[p.affix][0].toUpperCase() } : { ...p, form: forms.get(p.id), text: forms.get(p.id), gloss: byId.get(p.id).lemma }));
        return { ...e, form: forms.get(e.id), derivation: { type: d.type, bases: d.bases, baseLemmas: d.bases.map(b => byId.get(b).lemma), baseForms: d.bases.map(b => forms.get(b)), affix: d.affix, position: d.position, parts, text: parts.map(p => p.text).join(' + '), gloss: parts.map(p => p.gloss).join(' + ') } };
    });
    return { lexicon: out, stats };
}
