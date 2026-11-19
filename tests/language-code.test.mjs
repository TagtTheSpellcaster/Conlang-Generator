import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { encodeLanguageCode, decodeLanguageCode, CODE_KEYS } from '../src/code.js';
import { VERSION } from '../src/version.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = (input, branch) => generateLanguage(input, vocabulary, templates, derivations, { branch });
const FULL = { seed: 'ço dé-1', culture: ['nomadic'], biome: ['desert'], era: ['medieval'], vowels: 'balanced', consonants: 'harsh', mean: '2.6', order: 'SOV', morphology: 'agglutinative', articles: 'both', plural: 'suffix', number: 'dual', gender: 'two', relations: 'ergative', caseSystem: 'moderate', adjPosition: 'after', genre: 'war', numerals: 'auto', onsetClusters: ['stop_liquid'], codaClusters: ['none'], maxCluster: '2' };

test('a code round-trips every option, unicode seeds included', () => {
    const code = encodeLanguageCode(FULL);
    assert.ok(!/\s/.test(code));
    const r = decodeLanguageCode(code);
    assert.ok(r.ok && r.versionMatch && !r.warning);
    for (const k of Object.keys(FULL)) assert.deepEqual(r.input[k], FULL[k], k);
    assert.equal(r.branch, 'daughter');
    assert.equal(decodeLanguageCode(encodeLanguageCode(FULL, 'sister')).branch, 'sister');
    assert.ok(CODE_KEYS.includes('onsetClusters'));
});

test('the code recreates the same language', () => {
    const a = gen({ ...FULL, genre: '', relations: 'prepositions', caseSystem: '' });
    const code = encodeLanguageCode(a.input, a.family.branch);
    const b = gen(decodeLanguageCode(code).input);
    assert.deepEqual(b.lexicon.map(e => e.form), a.lexicon.map(e => e.form));
    assert.equal(b.name, a.name);
    // an "auto" seed is resolved: the code of the result is reproducible
    const auto = gen({ seed: 'auto' });
    assert.notEqual(auto.input.seed, 'auto');
    assert.deepEqual(gen(decodeLanguageCode(encodeLanguageCode(auto.input)).input).lexicon.map(e => e.form), auto.lexicon.map(e => e.form));
});

test('damaged, foreign and other-version codes', () => {
    const code = encodeLanguageCode({ seed: 'x' });
    assert.equal(decodeLanguageCode('').ok, false);
    assert.equal(decodeLanguageCode('hello').ok, false);
    assert.equal(decodeLanguageCode(code.slice(0, -8)).ok, false);
    const flipped = code.replace(/\.D\.(.)/, (m, c) => `.D.${c === 'e' ? 'f' : 'e'}`);
    assert.equal(decodeLanguageCode(flipped).ok, false);
    assert.equal(decodeLanguageCode(code.replace(/\.D\./, '.X.')).ok, false);
    assert.ok(decodeLanguageCode(`  ${code.slice(0, 10)}\n${code.slice(10)} `).ok, 'line breaks and spaces from a text editor are ignored');
    const old = decodeLanguageCode(encodeLanguageCode({ seed: 'x' }, 'daughter', '1.2.3'));
    assert.ok(old.ok && !old.versionMatch && /1\.2\.3/.test(old.warning) && old.warning.includes(VERSION));
});
