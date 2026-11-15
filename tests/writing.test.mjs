import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { buildWriting, WRITING_TYPES } from '../src/writing/system.js';
import { writingHtml } from '../src/ui/render.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = (input = {}) => generateLanguage({ seed: 'wr', ...input }, vocabulary, templates, derivations);
const LANGS = [['w1', undefined], ['w2', 'fey'], ['w3', 'sacred'], ['w4', 'marine'], ['w5', 'dwarven'], ['w6', 'merchant']].map(([seed, genre]) => gen({ seed, genre }));

test('writing: only alphabet, abjad, abugida and syllabary; every word reads back as written', () => {
    assert.deepEqual(WRITING_TYPES, ['alphabet', 'abjad', 'abugida', 'syllabary']);
    for (const L of LANGS) for (const type of WRITING_TYPES) {
        const W = buildWriting(L, type);
        assert.equal(W.type, type);
        assert.equal(W.failures, 0, `${L.spec.seed} ${type}: ${W.failures} words do not read back`);
        assert.ok(W.direction === 'ltr' || type === 'abjad', 'only an abjad may run right to left');
    }
});

test('writing: signs are distinct and complete; spelling rules are few and nearly regular', () => {
    for (const L of LANGS) for (const type of WRITING_TYPES) {
        const W = buildWriting(L, type);
        const paths = [...W.glyph.values()];
        assert.equal(new Set(paths).size, paths.length, `${type}: distinct glyphs`);
        assert.ok(W.rules.length <= 2);
        assert.ok(W.exceptionShare <= 0.04, `exceptions ${W.exceptionShare}`);
        for (const w of L.lexicon.flatMap(e => e.form.split(' '))) {
            for (const c of W.cellsOf(w)) {
                if (c.x) continue;
                if (type !== 'syllabary') assert.ok((c.b.startsWith('L:') ? [...c.b.slice(2)].every(x => W.glyph.has(x)) : W.glyph.has(c.b)), `${type}: no glyph for ${c.b} in ${w}`);
                for (const m of c.marks ?? []) assert.ok(m === '0' || W.mark.has(m), `${type}: no mark ${m}`);
            }
        }
    }
});

test('writing: an abjad leaves some words ambiguous, the other systems none; automatic choice follows the culture and the sounds', () => {
    for (const L of LANGS) {
        assert.ok(buildWriting(L, 'abjad').homographs < L.lexicon.length * 0.6);
        for (const t of ['alphabet', 'abugida', 'syllabary']) assert.equal(buildWriting(L, t).homographs, 0);
        const auto = buildWriting(L);
        if (auto.type === 'syllabary') assert.ok(auto.openShare >= 0.7);
    }
    const kinds = new Set(Array.from({ length: 40 }, (_, i) => buildWriting(gen({ seed: `k${i}` })).type));
    assert.ok(kinds.size >= 3, [...kinds].join());
});

test('writing: deterministic, and the tab renders every kind', () => {
    const L = LANGS[0];
    assert.equal(writingHtml(L, 'abugida'), writingHtml(L, 'abugida'));
    for (const t of ['auto', ...WRITING_TYPES]) {
        const html = writingHtml(L, t);
        assert.ok(html.includes('<svg') && html.includes('Reading rules') && html.includes('Sample sentences'), t);
    }
});
