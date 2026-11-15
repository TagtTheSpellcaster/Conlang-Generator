import test from 'node:test';
import assert from 'node:assert/strict';
import { vocabulary } from './helpers.mjs';
import { cloneEntry, validateVocabulary, assertVocabulary } from '../src/lexicon/schema.js';
import { diffVocabulary, applyOverlay, overlaySize, serializeVocabulary } from '../src/lexicon/store.js';

const base = vocabulary.map(cloneEntry);

test('serialized vocabulary is identical to data/vocabulary.json and round-trips', async () => {
    const fs = await import('node:fs');
    const file = fs.readFileSync(new URL('../data/vocabulary.json', import.meta.url), 'utf8');
    assert.equal(serializeVocabulary(base), file);
    assert.equal(assertVocabulary(JSON.parse(serializeVocabulary(base))).length, base.length);
});

test('identical copies have an empty overlay', () => {
    assert.equal(overlaySize(diffVocabulary(base, base.map(cloneEntry))), 0);
});

test('overlay: modified, added and removed entries are applied to the base and survive a new base', () => {
    const work = base.map(cloneEntry);
    work.find(e => e.id === 'verb.see').tags.push('edited');
    const gone = work.findIndex(e => e.id === 'animal.wolf'); const wolf = work[gone]; work.splice(gone, 1);
    const added = { ...cloneEntry(wolf), id: 'animal.dire_wolf', lemma: 'dire wolf', relations: {} };
    work.push(added);
    const overlay = diffVocabulary(base, work);
    assert.deepEqual([overlay.added.length, overlay.modified.length, overlay.removed], [1, overlay.modified.length, ['animal.wolf']]);
    const merged = applyOverlay(base, overlay);
    assert.ok(merged.find(e => e.id === 'verb.see').tags.includes('edited'));
    assert.ok(!merged.some(e => e.id === 'animal.wolf'));
    assert.ok(merged.some(e => e.id === 'animal.dire_wolf'));
    assert.deepEqual(validateVocabulary(merged), []);
    // a newer file with an extra entry keeps both the new entry and the user's edits
    const newer = [...base.map(cloneEntry), { ...cloneEntry(wolf), id: 'animal.coyote', lemma: 'coyote', relations: {} }];
    const again = applyOverlay(newer, overlay);
    assert.ok(again.some(e => e.id === 'animal.coyote') && again.some(e => e.id === 'animal.dire_wolf') && !again.some(e => e.id === 'animal.wolf'));
});

test('an unknown overlay version is ignored', () => {
    assert.equal(applyOverlay(base, { version: 99, added: [], modified: [], removed: ['verb.see'] }).length, base.length);
});

test('an old full local copy is migrated without turning newer entries into deletions', async () => {
    const { migrationOverlay, suspiciousOverlay, diffVocabulary, applyOverlay } = await import('../src/lexicon/store.js');
    const { vocabulary } = await import('./helpers.mjs');
    const old = vocabulary.filter((e, i) => i % 2 === 0);
    const bad = diffVocabulary(vocabulary, old);
    assert.ok(suspiciousOverlay(vocabulary, bad));
    const good = migrationOverlay(vocabulary, old);
    assert.equal(good.removed.length, 0);
    assert.equal(applyOverlay(vocabulary, good).length, vocabulary.length);
    assert.ok(!suspiciousOverlay(vocabulary, { removed: ['x'] }));
});
