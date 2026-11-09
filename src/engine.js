// Pure engine: generateLanguage(input, vocabulary, templates) -> everything the UI needs.
// No DOM, no globals, no I/O. Same input + same seed => identical output.
import { VERSION } from './version.js';
import { resolveSpec } from './spec.js';
import { selectEntries, assignForms } from './lexicon/select.js';
import { describePhonology, createWordFactory } from './phonology/words.js';
import { buildMorphologyModel, generateAffixes } from './morphology/affixes.js';
import { adpositionPosition, generateSamples } from './syntax/realize.js';

export function languageName(spec) {
    const make = createWordFactory({
        consonants: spec.consonants, vowels: spec.vowels,
        mean: Math.max(1, Math.min(4, spec.mean * 0.8)), seed: `${spec.seed}|language-name`,
        onsetClusters: spec.onsetClusters, codaClusters: spec.codaClusters, maxCluster: spec.maxCluster
    });
    return make();
}

export function generateLanguage(input, vocabulary, templates = []) {
    if (!Array.isArray(vocabulary) || !vocabulary.length) throw new Error('Vocabulary is empty or not loaded.');
    const { spec, notes } = resolveSpec(input);
    const phonology = describePhonology(spec);
    const model = buildMorphologyModel(spec);
    const lexicon = assignForms(selectEntries(vocabulary, spec), spec);
    // Affixes must not collide with any root form.
    const affixes = generateAffixes(spec, model, new Set(lexicon.map(e => e.form)));
    const lang = { spec, model, affixes, lexicon };
    const { samples, skipped } = generateSamples(templates, lang);
    return Object.freeze({
        version: VERSION,
        name: languageName(spec),
        spec, notes, phonology,
        morphology: { model, affixes },
        syntax: { order: spec.order, prodrop: !!affixes.verb, adpositionPosition: adpositionPosition(spec.order), adjectivePosition: spec.adjPosition, articles: spec.articles },
        lexicon, samples, skippedSamples: skipped
    });
}
