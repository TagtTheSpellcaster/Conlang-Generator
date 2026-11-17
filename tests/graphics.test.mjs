import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { buildWriting, WRITING_TYPES } from '../src/writing/system.js';
import { buildNumberSigns } from '../src/writing/numerals.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = seed => generateLanguage({ seed }, vocabulary, templates, derivations);
const LANGS = ['g1', 'g2', 'g3'].map(gen);

test('graphics: every script type draws one svg per word, deterministic, with a tradition', () => {
    for (const L of LANGS) for (const type of WRITING_TYPES) {
        const W = buildWriting(L, type), W2 = buildWriting(L, type);
        const w = L.lexicon.find(e => e.form.length >= 4).form;
        const a = W.wordSvg(w);
        assert.ok(a.includes('<svg') && a.includes('<path'), `${type} svg`);
        assert.equal(a, W2.wordSvg(w), 'deterministic');
        assert.ok(['stone', 'clay', 'brush', 'pen', 'print'].includes(W.graphics.tech));
        assert.ok(W.graphicsQuality.close <= 3, `${type}: nearly indistinguishable signs: ${W.graphicsQuality.close}`);
    }
});

test('graphics: cursive abjad has four contextual forms; syllabary has a model', () => {
    let cursive = 0;
    for (let i = 0; i < 12; i++) {
        const W = buildWriting(gen(`cu${i}`), 'abjad');
        if (W.joined) { cursive++; const all = W.letters.consonants.map(c => W.forms(c)); assert.deepEqual(all[0].map(x => x.form), ['isolated', 'initial', 'medial', 'final']); assert.ok(all.some(f => new Set(f.map(x => x.svg)).size === 4), 'a joining letter has four distinct forms'); assert.ok(all.some(f => new Set(f.map(x => x.svg)).size < 4), 'a non-joining letter has fewer'); }
        assert.ok(['orientation', 'block', null].includes(buildWriting(gen(`cu${i}`), 'syllabary').graphics.model));
    }
    assert.ok(cursive > 0);
});

test('numeral glyphs: one distinct digit per base value, positional numbers read back, mode is declared', () => {
    const modes = new Set();
    for (let i = 0; i < 16; i++) {
        const L = gen(`nm${i}`), W = buildWriting(L, 'alphabet'), N = buildNumberSigns(L, W);
        modes.add(N.mode);
        assert.equal(N.failures, 0);
        if (N.cistercian) assert.equal(N.digits.length, 0);   // composite signs: one per group of four digits, not one per digit
        else if (!N.restricted) { assert.equal(N.digits.length, N.base); assert.equal(new Set(N.digits.map(d => d.svg)).size, N.base); }
        assert.ok(N.write(2026).includes('<svg'));
    }
    assert.ok(modes.size >= 2);
});
