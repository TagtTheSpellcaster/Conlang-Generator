import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { buildWriting } from '../src/writing/system.js';
import { buildNumberSigns } from '../src/writing/numerals.js';
import { CISTERCIAN_DIGITS, decodeDigit, decodeGroup, groupCorners, groupsOf, cistercianChoice } from '../src/graphics/cistercian.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = (seed, extra = {}) => generateLanguage({ seed, ...extra }, vocabulary, templates, derivations);
const setOf = (sys, d) => [...CISTERCIAN_DIGITS[sys][d]].sort().join('+');

test('cistercian: the nine digits of each system are distinct and every number from 0 to 9999 reads back', () => {
    for (const sys of ['standard', 'early']) {
        const forms = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => setOf(sys, d));
        assert.equal(new Set(forms).size, 9, sys);
        for (let d = 0; d <= 9; d++) assert.equal(decodeDigit(sys, CISTERCIAN_DIGITS[sys][d] ?? []), d);
        for (let v = 0; v <= 9999; v++) assert.equal(decodeGroup(sys, groupCorners(sys, v)), v, `${sys} ${v}`);
    }
});

test('cistercian: the standard system is built from lines (5 = 4 + 1, 7 = 1 + 6, 8 = 2 + 6, 9 = 1 + 2 + 6), the early one swaps 3, 4 with 7, 8 and has dots and a triangle', () => {
    const S = CISTERCIAN_DIGITS.standard, E = CISTERCIAN_DIGITS.early;
    assert.deepEqual([...S[5]].sort(), [...S[4], ...S[1]].sort());
    assert.deepEqual([...S[7]].sort(), [...S[1], ...S[6]].sort());
    assert.deepEqual([...S[8]].sort(), [...S[2], ...S[6]].sort());
    assert.deepEqual([...S[9]].sort(), [...S[1], ...S[2], ...S[6]].sort());
    assert.equal(setOf('early', 3), setOf('standard', 7)); assert.equal(setOf('early', 4), setOf('standard', 8));
    assert.equal(setOf('early', 7), setOf('standard', 3)); assert.equal(setOf('early', 8), setOf('standard', 4));
    assert.deepEqual(E[5], ['dot']); assert.deepEqual(E[6], ['dotA', 'dotB']); assert.deepEqual(E[9], ['tri']);
    for (const s of [S, E]) for (const d of [1, 2]) assert.deepEqual(s[d], d === 1 ? ['top'] : ['low']);
});

test('cistercian: groups of four digits, the largest first', () => {
    assert.deepEqual(groupsOf(0), [0]); assert.deepEqual(groupsOf(9999), [9999]); assert.deepEqual(groupsOf(12345), [1, 2345]); assert.deepEqual(groupsOf(100000), [10, 0]);
});

test('cistercian: automatic use is rare, decimal only, more frequent in sacred languages; the user can always ask for it', () => {
    let n = 0, sacred = 0, war = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
        if (cistercianChoice({ seed: `c${i}`, genre: 'sacred', era: ['medieval'] }, { restricted: false, base: 10 }, 'auto')) sacred++;
        if (cistercianChoice({ seed: `c${i}`, genre: 'war', era: ['modern'] }, { restricted: false, base: 10 }, 'auto')) war++;
        if (cistercianChoice({ seed: `c${i}` }, { restricted: false, base: 12 }, 'auto')) n++;
        assert.equal(cistercianChoice({ seed: `c${i}` }, { restricted: true, base: 0 }, 'auto'), null);
    }
    assert.equal(n, 0);
    assert.ok(sacred > war && sacred / N < 0.5 && war / N < 0.15 && sacred > 0, `${sacred} ${war}`);
    assert.equal(cistercianChoice({ seed: 'x' }, { restricted: true, base: 0 }, 'cistercian'), 'standard');
    assert.equal(cistercianChoice({ seed: 'x' }, { restricted: false, base: 20 }, 'cistercian-early'), 'early');
});

test('cistercian: forced on any language, in both orientations, every sample number reads back', () => {
    for (const seed of ['ci1', 'ci2', 'ci3']) {
        const L = gen(seed), W = buildWriting(L, 'alphabet');
        const widths = {};
        for (const system of ['cistercian', 'cistercian-early']) for (const orientation of ['vertical', 'horizontal']) {
            const N = buildNumberSigns(L, W, { system, orientation });
            assert.ok(N.cistercian, seed); assert.equal(N.failures, 0); assert.equal(N.cistercian.orientation, orientation);
            assert.equal(N.cistercian.table.length, 4); assert.ok(N.cistercian.table.every(r => r.cells.length === 9));
            const svg = N.write(5555, 40), m = svg.match(/width="([\d.]+)" height="(\d+)"/);
            assert.ok(m, 'svg');
            widths[orientation] = Number(m[1]);
            assert.ok(N.write(123456, 30).split('<svg').length === 2, 'one svg for a whole number');
            assert.ok(N.examples.length > 0);
        }
        assert.ok(widths.horizontal > widths.vertical * 1.3, `${widths.horizontal} ${widths.vertical}`);
    }
    // a language that counts only a few numbers
    const R = [...Array(40).keys()].map(i => gen(`rs${i}`)).find(l => l.numerals.config.type === 'restricted');
    if (R) assert.ok(buildNumberSigns(R, buildWriting(R, 'alphabet'), { system: 'cistercian' }).cistercian);
});

test('cistercian: the Writing tab and the exports follow the choice', async () => {
    const { writingHtml } = await import('../src/ui/render.js');
    const { languageJson } = await import('../src/export.js');
    const L = gen('ci4');
    const html = writingHtml(L, 'alphabet', 'auto', { system: 'cistercian-early', orientation: 'vertical' });
    assert.match(html, /early system/); assert.match(html, /there is no sign for the digit zero/);
    const j = JSON.parse(languageJson(L, 't', { writing: 'alphabet', numerals: { system: 'cistercian', orientation: 'horizontal' } }));
    assert.equal(j.writing.numerals.kind, 'cistercian-standard'); assert.equal(j.writing.numerals.orientation, 'horizontal');
    assert.ok(j.writing.numerals.examples.every(e => e.svg.includes('<svg')));
});
