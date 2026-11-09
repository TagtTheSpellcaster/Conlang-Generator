import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { validateVocabulary, validateEntry, assertVocabulary, closeRelations, cloneEntry, label } from '../src/lexicon/schema.js';
import { vocabularyFile, vocabulary } from './helpers.mjs';

const sample = () => cloneEntry(vocabulary.find(e => e.id === 'verb.eat'));

test('shipped vocabulary is valid', () => {
    assert.deepEqual(validateVocabulary(vocabulary), []);
    assert.doesNotThrow(() => assertVocabulary(vocabularyFile));
});

test('generated JSON Schema is in sync with schema.js', () => {
    const before = readFileSync(new URL('../schema/vocabulary.schema.json', import.meta.url), 'utf8');
    execFileSync(process.execPath, [new URL('../tools/build-schema.mjs', import.meta.url).pathname]);
    assert.equal(readFileSync(new URL('../schema/vocabulary.schema.json', import.meta.url), 'utf8'), before);
});

test('CLI validator exits 0 on the shipped file', () => {
    execFileSync(process.execPath, [new URL('../tools/validate.mjs', import.meta.url).pathname]);
});

test('validator rejects malformed entries', () => {
    const bad = (mut, expect) => {
        const e = sample(); mut(e);
        const errors = validateEntry(e);
        assert.ok(errors.some(m => expect.test(m)), `expected ${expect} in ${JSON.stringify(errors)}`);
    };
    bad(e => { e.lemma = 'to eat'; }, /clean lemma/);
    bad(e => { e.lemma = 'half_of'; }, /clean lemma/);
    bad(e => { e.pos = 'gerund'; }, /"pos"/);
    bad(e => { e.domain = 'misc'; }, /"domain"/);
    bad(e => { e.tier = 'rare'; }, /"tier"/);
    bad(e => { e.era = ['stone-age']; }, /era/);
    bad(e => { e.features = { animacy: 'human' }; }, /not valid for pos/);
    bad(e => { e.features = { transitivity: 'maybe' }; }, /invalid value/);
    bad(e => { e.relations = { related_to: 'x.y' }; }, /non-empty array/);
    bad(e => { e.relations = { likes: ['x.y'] }; }, /unknown relation/);
    bad(e => { e.extra = 1; }, /unknown field/);
    bad(e => { delete e.group; }, /missing "group"/);
    bad(e => { e.id = 'Eat'; }, /"id"/);
});

test('cross-entry rules: unique ids, targets, self references, inverse closure, unique senses', () => {
    const a = sample(), b = cloneEntry(vocabulary.find(e => e.id === 'verb.drink'));
    a.relations = {}; b.relations = {};
    assert.deepEqual(validateVocabulary([a, b]), []);
    assert.ok(validateVocabulary([a, { ...cloneEntry(a) }]).some(m => /duplicate id/.test(m)));
    const c = cloneEntry(a); c.id = 'verb.eat2';
    assert.ok(validateVocabulary([a, c]).some(m => /same lemma\/pos\/gloss/.test(m)));
    a.relations = { related_to: ['verb.nowhere'] };
    assert.ok(validateVocabulary([a, b]).some(m => /unknown id/.test(m)));
    a.relations = { related_to: [a.id] };
    assert.ok(validateVocabulary([a, b]).some(m => /references itself/.test(m)));
    a.relations = { part_of: [b.id] };
    assert.ok(validateVocabulary([a, b]).some(m => /missing inverse "has_part"/.test(m)));
    closeRelations([a, b]);
    assert.deepEqual(b.relations.has_part, [a.id]);
    assert.deepEqual(validateVocabulary([a, b]), []);
});

test('assertVocabulary rejects wrong schema versions and shapes', () => {
    assert.throws(() => assertVocabulary({ schema: 1, vocabulary: [] }), /not supported/);
    assert.throws(() => assertVocabulary([]), /expected/);
});

test('label shows "to" for verbs and the gloss for homonyms', () => {
    assert.equal(label(sample()), 'to eat');
    assert.equal(label(vocabulary.find(e => e.id === 'animal.school')), 'school (of fish)');
});

test('no derived-noun leftovers and no sense appears twice', () => {
    const seen = new Set();
    for (const e of vocabulary) {
        const k = `${e.lemma.toLowerCase()}|${e.pos}|${e.gloss ?? ''}`;
        assert.ok(!seen.has(k), k); seen.add(k);
    }
});
