import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { resolveSpec } from '../src/spec.js';
import { MODEL, CLUSTER_SETS, resolveClusters } from '../src/phonology/models.js';
import { resolvePhonotactics, validWord, createWordFactory } from '../src/phonology/words.js';
import { vocabulary, templates } from './helpers.mjs';

const gen = (input = {}) => generateLanguage({ seed: 'ph', ...input }, vocabulary, templates);
const forms = L => L.lexicon.map(e => e.form);
const vowelsOf = L => L.phonology.vowels;
const runs = (w, vowels) => w.match(new RegExp(`[^${vowels.join('')}]+`, 'g')) ?? [];
const initialRun = (w, vowels) => (vowels.includes(w[0]) ? '' : runs(w, vowels)[0]);
const finalRun = (w, vowels) => (vowels.includes(w[w.length - 1]) ? '' : runs(w, vowels).at(-1));

test('resolveSpec: cluster choices are validated; unknown sets are ignored with a note', () => {
    const a = resolveSpec({ onsetClusters: ['liquids', 'nope'], codaClusters: 'none' });
    assert.deepEqual(a.spec.onsetClusters, ['liquids']);
    assert.deepEqual(a.spec.codaClusters, []);
    assert.ok(a.notes.some(n => /"nope"/.test(n)));
    assert.equal(resolveSpec({}).spec.onsetClusters, null);
    assert.equal(resolveSpec({ onsetClusters: ['default'] }).spec.onsetClusters, null);
    assert.equal(resolveSpec({ maxCluster: 7 }).spec.maxCluster, 3);
});

test('a set that fits no consonant of the model is reported', () => {
    const { notes } = resolveSpec({ consonants: 'isolated', onsetClusters: ['sibilant_stop'] });
    assert.ok(notes.some(n => /sibilant_stop/.test(n) && /no cluster/.test(n)), JSON.stringify(notes));
});

test('chosen onset clusters appear, and only those clusters start a word', () => {
    const L = gen({ consonants: 'european', onsetClusters: ['nasal_stop'], mean: 2.5 });
    const allowed = new Set(resolveClusters('european', 'onset', ['nasal_stop'], 3));
    const v = vowelsOf(L);
    const initial = forms(L).map(w => initialRun(w, v)).filter(r => r && r.length > 1);
    assert.ok(initial.length >= 5, `only ${initial.length} words start with a cluster`);
    for (const r of initial) assert.ok(allowed.has(r), `${r} is not in the chosen set`);
});

test('"none" removes every onset and coda cluster', () => {
    const L = gen({ consonants: 'english', onsetClusters: ['none'], codaClusters: ['none'] });
    const v = vowelsOf(L);
    for (const w of forms(L)) {
        assert.ok((initialRun(w, v) ?? '').length <= 1, w);
        assert.ok((finalRun(w, v) ?? '').length <= 1, w);
    }
});

test('chosen coda clusters can close words, and only those', () => {
    const L = gen({ consonants: 'european', codaClusters: ['liquid_stop'], mean: 2.5 });
    const allowed = new Set(resolveClusters('european', 'coda', ['liquid_stop'], 3));
    const v = vowelsOf(L);
    const finals = forms(L).map(w => finalRun(w, v)).filter(r => r && r.length > 1);
    assert.ok(finals.length >= 5, `only ${finals.length} words end with a cluster`);
    for (const r of finals) assert.ok(allowed.has(r), `${r} is not in the chosen set`);
});

test('coda clusters work even for models that have no closed syllables', () => {
    const L = gen({ consonants: 'japanese', codaClusters: ['nasal_stop'] });
    const v = vowelsOf(L);
    assert.ok(forms(L).some(w => (finalRun(w, v) ?? '').length > 1));
});

test('maximum cluster length 2 excludes three-consonant clusters', () => {
    const L = gen({ consonants: 'european', onsetClusters: ['liquids', 'sibilant_stop'], maxCluster: 2, mean: 3 });
    const v = vowelsOf(L);
    assert.ok(forms(L).every(w => (initialRun(w, v) ?? '').length <= 2));
    assert.ok(resolvePhonotactics({ consonants: 'european', onsetClusters: ['sibilant_stop'], maxCluster: 2 }).onset.every(c => c.length <= 2));
});

test('cluster sets only use consonants of the chosen model', () => {
    for (const key of Object.keys(MODEL)) for (const position of ['onset', 'coda']) {
        const inventory = new Set(MODEL[key].c);
        for (const set of Object.keys(CLUSTER_SETS[position]))
            for (const cl of resolveClusters(key, position, [set], 3)) for (const ch of cl) assert.ok(inventory.has(ch), `${key}/${position}/${set}: ${cl}`);
    }
});

test('every generated word is valid under the effective phonotactics, with clusters or without', () => {
    for (const [consonants, onsetClusters, codaClusters] of [['european', ['harsh'], ['harsh']], ['slavic', ['slavic'], ['liquid_stop', 'sibilant_stop']], ['english', ['liquids'], ['none']], ['isolated', ['liquids'], null], ['semitic', null, ['nasal_stop']], ['japanese', ['nasal_stop'], ['nasal_stop']]]) {
        const spec = resolveSpec({ consonants, onsetClusters, codaClusters, seed: 'v' }).spec;
        const ph = resolvePhonotactics(spec), make = createWordFactory(spec);
        for (let i = 0; i < 300; i++) { const w = make(); assert.ok(validWord(w, ph.modelKey, ph.vowels, ph), `${consonants}: ${w}`); }
    }
});

test('same seed and clusters give the same language; a different cluster choice changes the forms', () => {
    const a = gen({ onsetClusters: ['greek'] }), b = gen({ onsetClusters: ['greek'] }), c = gen({ onsetClusters: ['slavic'] });
    assert.deepEqual(forms(a), forms(b));
    assert.notDeepEqual(forms(a), forms(c));
});

test('without a cluster choice the previous default behaviour is kept for cluster-free models', () => {
    const v = ['a', 'e', 'i', 'o', 'u'];
    for (const consonants of ['isolated', 'japanese', 'semitic']) for (const w of forms(gen({ consonants }))) assert.ok(runs(w, v).every(r => r.length === 1), `${consonants}: ${w}`);
});

test('option sweep with clusters: unique forms, nothing skipped', () => {
    const pick = (a, i) => a[(i * 7 + 3) % a.length];
    const onset = [null, ['liquids'], ['nasal_stop', 'harsh'], ['none'], ['slavic', 'greek']], coda = [null, ['none'], ['liquid_stop'], ['harsh', 'fricative_stop']];
    for (let i = 0; i < 60; i++) {
        const input = { seed: `cs-${i}`, consonants: pick(Object.keys(MODEL), i), onsetClusters: pick(onset, i), codaClusters: pick(coda, i + 1), maxCluster: i % 2 ? 2 : 3, morphology: pick(['agglutinative', 'fusional', 'isolating'], i), mean: 1 + (i % 4) };
        const L = generateLanguage(input, vocabulary, templates);
        assert.equal(new Set(forms(L)).size, L.lexicon.length, JSON.stringify(input));
        assert.deepEqual(L.skippedSamples, [], JSON.stringify(input));
    }
});
