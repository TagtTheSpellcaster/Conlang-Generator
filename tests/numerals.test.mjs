import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { NUMERAL_TYPES } from '../src/numerals/choose.js';
import { numeralForm, numeralParts, isDefined, maxDefined, MAX_NUMERAL, sampleNumbers } from '../src/numerals/system.js';
import { GENRE_IDS } from '../src/genres.js';
import { vocabulary, templates } from './helpers.mjs';

const gen = (input = {}) => generateLanguage({ seed: 'num', ...input }, vocabulary, templates);

test('numerals: deterministic and the type distribution is dominated by decimal', () => {
    assert.deepEqual(gen().numerals.config, gen().numerals.config);
    const counts = {};
    for (let i = 0; i < 300; i++) { const t = gen({ seed: `d${i}` }).numerals.config.type; counts[t] = (counts[t] ?? 0) + 1; }
    assert.ok(counts.decimal > 150 && counts.decimal < 260, JSON.stringify(counts));
    assert.ok(counts.vigesimal > 0 && counts.quinary > 0, JSON.stringify(counts));
});

test('Greenberg: every number up to the limit has a form (no gaps), all distinct', () => {
    for (const type of NUMERAL_TYPES.filter(t => t !== 'restricted')) {
        for (const seed of ['a', 'b', 'c']) {
            const L = gen({ numerals: type, seed });
            const forms = new Set();
            for (let n = 1; n <= 400; n++) {
                const f = numeralForm(L.numerals, n, L.spec);
                assert.ok(f.defined && f.form, `${type}/${seed}: ${n}`);
                forms.add(f.form);
            }
            assert.equal(forms.size, 400, `${type}/${seed}: distinct forms`);
            for (const n of [999, 1000, 12345, MAX_NUMERAL]) assert.ok(numeralForm(L.numerals, n, L.spec).form, `${type}: ${n}`);
        }
    }
});

test('restricted systems stop at their limit and answer "many" beyond it', () => {
    for (const seed of ['r1', 'r2', 'r3', 'r4']) {
        const L = gen({ numerals: 'restricted', seed });
        const max = maxDefined(L.numerals);
        assert.ok(max >= 2 && max <= 5);
        assert.equal(isDefined(L.numerals, max + 1), false);
        assert.equal(numeralParts(L.numerals, 99)[0].meaning, 'many');
        assert.ok(!L.lexicon.some(e => e.id === 'number.ten'));
        assert.ok(L.lexicon.some(e => e.id === 'number.one'));
    }
});

test('variants: subtractive uses "minus", halves uses "half", French cut reaches 70-99', () => {
    const sub = gen({ numerals: 'decimal', numeralVariant: 'subtractive' });
    assert.ok(numeralParts(sub.numerals, 19).some(p => p.meaning === '−'));
    const halves = gen({ numeralVariant: 'halves' });
    assert.equal(halves.numerals.config.type, 'hybrid');
    assert.equal(numeralParts(halves.numerals, 50)[0].meaning, '½');
    assert.deepEqual(numeralParts(gen({ numerals: 'vigesimal' }).numerals, 40).map(p => p.meaning).slice(0, 2), ['2', '20']);
});

test('classifiers: obligatory classifiers switch plural marking off and numerals take them', () => {
    const L = gen({ numerals: 'decimal', classifiers: 'obligatory', morphology: 'agglutinative', plural: 'suffix', number: 'singular-plural' });
    assert.ok(L.numerals.classifiers.length >= 2);
    assert.equal(L.spec.plural, 'none');
    assert.ok(L.notes.some(n => /classifier/i.test(n)));
    const forms = L.numerals.classifiers.map(c => c.form);
    assert.equal(new Set(forms).size, forms.length);
    const none = gen({ classifiers: 'none' });
    assert.equal(none.numerals.classifiers, null);
});

test('position: the numeral usually follows the adjective position, and can be forced', () => {
    let same = 0;
    for (let i = 0; i < 200; i++) { const L = gen({ seed: `p${i}` }); if (L.numerals.config.position === L.spec.adjPosition) same++; }
    assert.ok(same >= 140 && same <= 180, String(same));
    assert.equal(gen({ numeralPosition: 'after', adjPosition: 'before' }).numerals.config.position, 'after');
});

test('lexicon: numeral entries carry composed forms; all forms stay unique over every genre', () => {
    for (const genre of GENRE_IDS) {
        const L = gen({ genre, seed: `g-${genre}` });
        assert.equal(new Set(L.lexicon.map(e => e.form)).size, L.lexicon.length, genre);
        const twelve = L.lexicon.find(e => e.id === 'number.twelve');
        if (twelve && L.numerals.config.type !== 'restricted') assert.equal(twelve.form, numeralForm(L.numerals, 12, L.spec).form);
    }
});

test('sample sentences count with numerals; restricted languages skip only what they cannot count', () => {
    const L = gen({ numerals: 'decimal' });
    assert.ok(L.samples.some(s => s.topic === 'Counting'));
    const R = gen({ numerals: 'restricted' });
    assert.deepEqual(R.skippedSamples, []);
    assert.ok(sampleNumbers(L.numerals).length > 20);
});
