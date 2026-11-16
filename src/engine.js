// Pure engine: generateLanguage(input, vocabulary, templates) -> everything the UI needs.
// No DOM, no globals, no I/O. Same input + same seed => identical output.
import { VERSION } from './version.js';
import { resolveSpec } from './spec.js';
import { selectEntries, assignForms } from './lexicon/select.js';
import { describePhonology, createWordFactory } from './phonology/words.js';
import { buildMorphologyModel, generateAffixes } from './morphology/affixes.js';
import { assignClasses, buildSuppletion } from './morphology/classes.js';
import { buildNumerals } from './numerals/system.js';
import { resolveCalendar, calendarLemmas } from './calendar/plan.js';
import { deriveDaughter } from './history/changes.js';
import { applyLoans } from './history/loans.js';
import { buildCalendar } from './calendar/build.js';
import { deriveAffixes, applyDerivation, derivationPhonology } from './derivation/derive.js';
import { adpositionPosition, generateSamples, requiredEntries, templateSets } from './syntax/realize.js';
import { GENRES } from './genres.js';
import { rng as seededRng } from './core/rng.js';
import { stressSystemFor } from './ipa.js';

// The letters that actually occur in the words of the language, sorted into vowels and consonants.
function usedLetters(lexicon, spec, phonology) {
    const vowelLetters = new Set([...phonology.vowels, ...phonology.extraVowels, ...'aeiouyøæ']);
    const seen = new Set(lexicon.flatMap(e => [...e.form.replace(/ /g, '')]));
    const sorted = list => [...list].sort((a, b) => a.localeCompare(b));
    return { vowels: sorted([...seen].filter(c => vowelLetters.has(c))), consonants: sorted([...seen].filter(c => !vowelLetters.has(c))) };
}

export function languageName(spec) {
    const make = createWordFactory({
        consonants: spec.consonants, vowels: spec.vowels,
        mean: Math.max(1, Math.min(4, spec.mean * 0.8)), seed: `${spec.seed}|language-name`,
        onsetClusters: spec.onsetClusters, codaClusters: spec.codaClusters, maxCluster: spec.maxCluster, soundBias: spec.soundBias,
        extraVowels: spec.extraVowels, extraConsonants: spec.extraConsonants
    });
    return make();
}

// templates: { universal: [...], genres: { id: [...] } } (data/sentence-templates.json) or a plain array of universal templates.
// derivations: data/derivations.json (optional; without it every word has its own root).
export function generateLanguage(input, vocabulary, templates = [], derivations = []) {
    if (!Array.isArray(vocabulary) || !vocabulary.length) throw new Error('Vocabulary is empty or not loaded.');
    const { spec, notes } = resolveSpec(input);
    const phonology = describePhonology(spec);
    const model = buildMorphologyModel(spec);
    const sets = templateSets(templates, spec.genre);
    const calendarPlan = resolveCalendar(spec);
    notes.push(...calendarPlan.notes);
    const wanted = new Set(calendarLemmas(calendarPlan.config));
    // one sense per lemma: the time sense when there are several
    const calendarEntries = [...wanted].map(l => { const all = vocabulary.filter(e => e.pos === 'noun' && e.lemma === l && !e.gloss); return all.find(e => e.domain === 'time') ?? all[0]; }).filter(Boolean);
    const required = [...requiredEntries([...sets.universal, ...sets.specialised], vocabulary), ...calendarEntries];
    const rules = Array.isArray(derivations) ? derivations : derivations?.derivations ?? [];
    const assigned = assignForms(selectEntries(vocabulary, spec, undefined, required, rules), spec);
    const { system: numerals, lexicon: rooted } = buildNumerals(spec, assigned);
    // Derived words and compounds are built from the words they come from (the other roots keep their forms).
    const derivationAffixes = deriveAffixes(spec, new Set(rooted.map(e => e.form)));
    const numeralForms = new Set([...Object.values(numerals.roots ?? {}), ...Object.values(numerals.words ?? {})].filter(x => typeof x === 'string'));
    const derivationPhon = derivationPhonology(spec);
    const mother = applyDerivation(rooted, rules, spec, derivationAffixes, numeralForms, derivationPhon);
    // The generated language is the mother; what is returned is its daughter: every form has gone through the sound changes.
    const daughter = deriveDaughter(spec, mother.lexicon, derivationAffixes, numerals);
    // Words borrowed after the split: other languages, adapted to the daughter's sounds.
    const numeralFixed = [...Object.values(daughter.numerals.roots), ...Object.values(daughter.numerals.words), ...(daughter.numerals.classifiers ?? []).map(c => c.form), ...Object.values(daughter.derivationAffixes).map(a => a.form)];
    const borrowed = applyLoans(spec, daughter.lexicon, daughter.history, daughter.later, numeralFixed);
    const lexicon = borrowed.lexicon, derivationStats = mother.stats;
    const loanById = new Map(borrowed.loans.items.map(x => [x.id, x]));
    const history = { ...daughter.history, sister: { ...daughter.history.sister, examples: daughter.sisterExamples(14, new Set(borrowed.loans.items.map(x => x.id))) }, loans: borrowed.loans, lexicon: daughter.history.lexicon.map(w => loanById.has(w.id) ? { ...w, daughter: loanById.get(w.id).form, loan: loanById.get(w.id) } : w) };
    // Inflectional affixes must not collide with any root form or derivational affix; they undergo the same changes.
    const protoAffixes = generateAffixes(spec, model, new Set([...lexicon.map(e => e.form), ...Object.values(daughter.derivationAffixes).map(a => a.form)]));
    const converted = daughter.convertAffixes(protoAffixes, lexicon.map(e => e.form));   // loans entered after the history was built
    // Inflection classes follow the mother's stems; irregular forms come from running the sound changes over whole words (inflect.js).
    const affixes = { ...converted, classMap: assignClasses(lexicon, converted.classOverlays, spec), suppletion: buildSuppletion(lexicon, spec, !!converted.verb) };
    Object.defineProperty(affixes, 'history', { value: { proto: protoAffixes, convert: daughter.convertWord, trace: daughter.traceWord, survive: 45 }, enumerable: false });
    Object.freeze(affixes);
    const lang = { spec, model, affixes, lexicon, numerals: daughter.numerals };
    const calendar = buildCalendar(calendarPlan, lang);
    const generated = generateSamples(templates, lang);
    const { samples } = generated;
    // Sentences counting beyond a restricted numeral system are not applicable by design, not a defect.
    const notApplicable = numerals.config.type === 'restricted'
        ? generated.skipped.filter(x => x.missing.startsWith('numeral')) : [];
    const skipped = generated.skipped.filter(x => !notApplicable.includes(x));
    return Object.freeze({
        version: VERSION,
        name: languageName(spec),
        genre: spec.genre ? { id: spec.genre, label: GENRES[spec.genre].label, summary: GENRES[spec.genre].summary } : null,
        spec, notes, phonology: Object.freeze({ ...phonology, used: usedLetters(lexicon, spec, phonology), stress: stressSystemFor(seededRng(`${spec.seed}|stress`)()).id }),
        morphology: { model, affixes },
        syntax: { order: spec.order, prodrop: !!affixes.verb, adpositionPosition: adpositionPosition(spec.order), adjectivePosition: spec.adjPosition, articles: spec.articles },
        numerals: daughter.numerals, calendar, history, derivation: { affixes: daughter.derivationAffixes, stats: derivationStats, phonology: derivationPhon }, lexicon, samples, skippedSamples: skipped, notApplicableSamples: notApplicable
    });
}
