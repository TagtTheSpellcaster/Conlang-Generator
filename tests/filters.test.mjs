import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { ERA_ORDER, conflictsWithFilters } from '../src/lexicon/select.js';
import { GENRE_IDS } from '../src/genres.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = (input = {}) => generateLanguage({ seed: 'filters', ...input }, vocabulary, templates, derivations);
const earliest = e => Math.min(...e.era.map(x => ERA_ORDER.indexOf(x)));

test('a chosen era excludes entries that belong only to later eras, for every genre', () => {
    for (const genre of ['', ...GENRE_IDS]) {
        const L = gen({ genre, era: ['medieval'] });
        const late = L.lexicon.filter(e => e.tier !== 'core' && e.era.length && earliest(e) > ERA_ORDER.indexOf('medieval'));
        assert.deepEqual(late.map(e => e.id), [], `${genre || 'none'}: anachronisms`);
    }
});

test('the war tongue of a medieval language has no plasma rifle, the futuristic one may', () => {
    const ids = L => new Set(L.lexicon.map(e => e.id));
    assert.ok(!ids(gen({ genre: 'war', era: ['medieval'] })).has('weapon.plasma_rifle'));
    assert.ok(!ids(gen({ genre: 'machine', era: ['medieval'] })).has('technology.laser'));
    assert.ok(vocabulary.some(e => e.id === 'weapon.plasma_rifle' && e.era.includes('futuristic')));
});

test('earlier and timeless entries stay; no era chosen excludes nothing', () => {
    const rifle = vocabulary.find(e => e.id === 'weapon.plasma_rifle');
    assert.equal(conflictsWithFilters(rifle, { era: [], biome: [] }), false);
    assert.equal(conflictsWithFilters(rifle, { era: ['futuristic'], biome: [] }), false);
    assert.equal(conflictsWithFilters(rifle, { era: ['modern'], biome: [] }), true);
    const timeless = vocabulary.find(e => !e.era.length && e.tier !== 'core');
    assert.equal(conflictsWithFilters(timeless, { era: ['prehistoric'], biome: [] }), false);
    const ancient = vocabulary.find(e => e.era.length === 1 && e.era[0] === 'ancient' && e.tier !== 'core');
    assert.equal(conflictsWithFilters(ancient, { era: ['medieval'], biome: [] }), false);
});

test('specialised words of biomes that were not chosen are left out', () => {
    const L = gen({ biome: ['desert'] });
    assert.deepEqual(L.lexicon.filter(e => e.tier === 'domain' && e.biome.length && !e.biome.includes('desert')), []);
});

test('sentences that need excluded words are skipped, not forced into the lexicon', () => {
    const L = gen({ genre: 'machine', era: ['medieval'] });
    assert.ok(L.skippedSamples.length > 0);
    assert.equal(L.lexicon.filter(e => e.tier !== 'core' && e.era.length && earliest(e) > 2).length, 0);
});
