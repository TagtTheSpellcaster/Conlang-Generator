// Pure engine: generateLanguage(input, vocabulary, templates) -> everything the UI needs.
// No DOM, no globals, no I/O. Same input + same seed => identical output.
import { VERSION } from './version.js';
import { resolveSpec } from './spec.js';
import { selectEntries, assignForms } from './lexicon/select.js';
import { describePhonology, createWordFactory } from './phonology/words.js';
import { buildMorphologyModel, generateAffixes } from './morphology/affixes.js';
import { buildNumerals } from './numerals/system.js';
import { resolveCalendar, calendarLemmas } from './calendar/plan.js';
import { buildCalendar } from './calendar/build.js';
import { deriveAffixes, applyDerivation } from './derivation/derive.js';
import { adpositionPosition, generateSamples, requiredEntries, templateSets } from './syntax/realize.js';
import { GENRES } from './genres.js';

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
    const { lexicon, stats: derivationStats } = applyDerivation(rooted, rules, spec, derivationAffixes, numeralForms);
    // Inflectional affixes must not collide with any root form or derivational affix.
    const affixes = generateAffixes(spec, model, new Set([...lexicon.map(e => e.form), ...Object.values(derivationAffixes).map(a => a.form)]));
    const lang = { spec, model, affixes, lexicon, numerals };
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
        spec, notes, phonology,
        morphology: { model, affixes },
        syntax: { order: spec.order, prodrop: !!affixes.verb, adpositionPosition: adpositionPosition(spec.order), adjectivePosition: spec.adjPosition, articles: spec.articles },
        numerals, calendar, derivation: { affixes: derivationAffixes, stats: derivationStats }, lexicon, samples, skippedSamples: skipped, notApplicableSamples: notApplicable
    });
}
