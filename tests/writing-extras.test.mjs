import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { buildWriting, WRITING_TYPES } from '../src/writing/system.js';
import { buildNumberSigns } from '../src/writing/numerals.js';
import { ipaWord } from '../src/ipa.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const make = (seed, genre) => generateLanguage({ seed, genre }, vocabulary, templates, derivations);

test('ligatures: words still read back, pairs are consonant/consonant or vowel/vowel, abjad and syllabary have none', () => {
    let alphabetWith = 0, abugidaWith = 0;
    for (const [seed, genre] of [['a', 'war'], ['c', 'sacred'], ['d', 'marine'], ['e', undefined], ['f', 'merchant']]) {
        const L = make(seed, genre);
        for (const t of WRITING_TYPES) {
            const W = buildWriting(L, t);
            assert.equal(W.failures, 0, `${seed} ${t}`);
            if (t === 'abjad' || t === 'syllabary') assert.equal(W.ligatures.length, 0);
            if (t === 'alphabet') { if (W.ligatures.length) alphabetWith++; for (const k of W.ligatures) assert.equal(W.isV(k[0]), W.isV(k[1])); assert.ok(W.ligatures.length <= 6); }
            if (t === 'abugida') { if (W.ligatures.length) abugidaWith++; for (const k of W.ligatures) assert.ok(!W.isV(k[0]) && !W.isV(k[1])); }
        }
    }
    assert.ok(alphabetWith >= 2 && abugidaWith >= 2);
});

test('numerals: positional digits and tallies read back; base follows the counting system', () => {
    const types = new Set();
    for (const seed of 'abcdefghijklmnop') {
        const L = make(seed);
        const N = buildNumberSigns(L, buildWriting(L, 'auto'));
        types.add(N.type);
        assert.equal(N.failures, 0, `${seed} ${N.type}`);
        if (!N.restricted) for (const n of [0, 1, 9, 10, 19, 20, 99, 100, 2026, 123456]) assert.equal(N.readCells(N.cellsOf(n)), n);
        else assert.equal(N.cellsOf(N.limit + 3)[0].many, true);
        assert.ok(N.write(3).includes('<svg'));
    }
    assert.ok(types.size >= 2);
});

test('IPA: stress systems, syllables, secondary stress, extended letters', () => {
    assert.equal(ipaWord('kapino', 'penult'), 'kaˈpi.no');
    assert.equal(ipaWord('kapino', 'final'), 'ˌka.piˈno');
    assert.equal(ipaWord('kapino', 'latin'), 'ˈka.pi.no');          // light penult: antepenult
    assert.equal(ipaWord('kapinto', 'latin'), 'kaˈpin.to');         // closed (heavy) penult
    assert.equal(ipaWord('kapir', 'consonant-final'), 'kaˈpir');
    assert.equal(ipaWord('kapin', 'consonant-final'), 'ˈka.pin');
    assert.equal(ipaWord('kapino', 'consonant-final'), 'kaˈpi.no');
    assert.equal(ipaWord('kapino', 'initial'), 'ˈka.pi.no');
    assert.equal(ipaWord('sa', 'final'), 'sa');
    assert.equal(ipaWord('kapinoran', 'penult'), 'ˌka.piˈno.ran');
    assert.ok(ipaWord('kapino kapino').includes(' '));
});

test('stress systems: drawn per language, mostly on the right edge, never always initial', () => {
    const counts = {};
    for (const seed of 'abcdefghijklmnopqrstuvwxyz') { const id = make(seed).phonology.stress; counts[id] = (counts[id] ?? 0) + 1; }
    assert.ok(Object.keys(counts).length >= 3);
    assert.ok((counts.initial ?? 0) <= 6);
});
