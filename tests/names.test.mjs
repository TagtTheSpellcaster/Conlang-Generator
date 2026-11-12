import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { generateNames, NAME_KINDS, PERSON_SCHEMES, nameStyle } from '../src/names.js';
import { GENRE_IDS } from '../src/genres.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = (input = {}) => generateLanguage({ seed: 'names', ...input }, vocabulary, templates, derivations);

test('names are deterministic, unique and as many as requested', () => {
    const L = gen();
    for (const { id } of NAME_KINDS) {
        const a = generateNames(L, { kind: id, count: 20 }), b = generateNames(L, { kind: id, count: 20 });
        assert.deepEqual(a, b, id);
        assert.equal(a.length, 20, id);
        assert.equal(new Set(a.map(n => n.name)).size, 20, `${id}: unique`);
    }
});

test('a different salt or seed gives different names; the language itself is untouched', () => {
    const L = gen();
    const before = JSON.stringify(L.lexicon.map(e => e.form));
    const a = generateNames(L, { kind: 'person', count: 10, salt: 0 }).map(n => n.name);
    const b = generateNames(L, { kind: 'person', count: 10, salt: 1 }).map(n => n.name);
    assert.notDeepEqual(a, b);
    assert.notDeepEqual(a, generateNames(gen({ seed: 'other' }), { kind: 'person', count: 10 }).map(n => n.name));
    assert.equal(JSON.stringify(L.lexicon.map(e => e.form)), before);
});

test('every genre yields all four kinds; letters belong to the language and meanings to its lexicon', () => {
    for (const genre of ['', ...GENRE_IDS]) {
        const L = gen(genre ? { genre } : {});
        const alphabet = new Set([...L.phonology.vowels, ...L.phonology.consonants, ...L.phonology.extraVowels, ...L.phonology.extraConsonants].join('').toLowerCase());
        const lemmas = new Set(L.lexicon.map(e => e.lemma));
        for (const { id } of NAME_KINDS) {
            const names = generateNames(L, { kind: id, count: 12 });
            assert.ok(names.length >= 10, `${genre || 'none'}/${id}: ${names.length}`);
            for (const n of names) {
                assert.ok(!/undefined|null|NaN/.test(n.name), n.name);
                assert.ok(n.name.length <= 40, n.name);
                for (const ch of n.name.toLowerCase()) assert.ok(ch === ' ' || alphabet.has(ch), `${genre}: "${ch}" in ${n.name}`);
                for (const p of n.parts.filter(p => p.meaning)) for (const w of p.meaning.split('-')) assert.ok(lemmas.has(w), `${genre}: ${w} not in the lexicon`);
            }
        }
    }
});

test('the genre decides the custom of personal names', () => {
    const shape = genre => generateNames(gen({ genre }), { kind: 'person', count: 8 })[0].parts.map(p => p.role).join('+');
    assert.equal(nameStyle('machine').person, 'single');
    assert.equal(shape('machine'), 'given');
    assert.match(shape('sacred'), /^title\+given$/);
    assert.match(shape('war'), /^given\+epithet\+epithet$/);
    assert.match(shape('orcish'), /^given\+family$/);
});

test('place names are compounds and epithets follow the adjective position of the language', () => {
    const before = gen({ adjPosition: 'before' }), after = gen({ adjPosition: 'after' });
    const first = (L, kind) => generateNames(L, { kind, count: 1 })[0];
    assert.equal(first(before, 'place').parts.length, 1);
    const eb = first(before, 'epithet'), ea = first(after, 'epithet');
    const adj = L => new Set(L.lexicon.filter(e => e.pos === 'adjective').map(e => e.lemma));
    assert.ok(adj(before).has(eb.parts[0].meaning), 'adjective first');
    assert.ok(adj(after).has(ea.parts[1].meaning), 'adjective last');
});

test('unknown kinds are rejected', () => {
    assert.throws(() => generateNames(gen(), { kind: 'dragon' }), /Unknown name kind/);
});

const startsUpper = w => { const c = [...w][0]; return c === c.toUpperCase() && c !== c.toLowerCase(); };

test('every word of every name starts with a capital letter, in every kind, genre and naming custom', () => {
    const bad = [];
    const check = (L, opts, tag) => { for (const n of generateNames(L, { count: 15, ...opts })) for (const w of n.name.split(/[ -]/).filter(Boolean)) {
        // letters that have no capital form (a few phonetic symbols) are the only allowed exception
        const c = [...w][0]; if (c !== c.toUpperCase() || (c === c.toLowerCase() && /\p{L}/u.test(c) && c.toUpperCase() !== c)) bad.push(`${tag}: ${n.name}`); } };
    for (const genre of ['', ...GENRE_IDS]) { const L = gen(genre ? { genre } : {}); for (const { id } of NAME_KINDS) check(L, { kind: id }, `${genre}/${id}`); }
    for (const { id } of PERSON_SCHEMES) check(gen({ seed: 'caps' }), { kind: 'person', scheme: id }, id);
    assert.deepEqual(bad.slice(0, 5), []);
});

test('naming customs: every scheme gives unique, deterministic names with a meaning where the system has one', () => {
    const L = gen({ seed: 'schemes' });
    for (const { id } of PERSON_SCHEMES) {
        const a = generateNames(L, { kind: 'person', count: 20, scheme: id }), b = generateNames(L, { kind: 'person', count: 20, scheme: id });
        assert.deepEqual(a, b, id);
        assert.equal(a.length, 20, id);
        assert.equal(new Set(a.map(n => n.name)).size, 20, id);
        for (const n of a) assert.ok(!/undefined|null|NaN/.test(n.name + (n.meaning ?? '')), `${id}: ${n.name}`);
    }
    assert.throws(() => generateNames(L, { scheme: 'nope' }));
});

test('naming customs: structure of the main systems', () => {
    const L = gen({ seed: 'structure' });
    const roles = scheme => generateNames(L, { kind: 'person', count: 10, scheme }).map(n => n.parts.map(p => p.role).join('+'));
    assert.ok(roles('tria').every(r => r === 'given+family+cognomen'));
    assert.ok(roles('welsh').every(r => /^given(\+marker\+patronymic)+$/.test(r)));
    assert.ok(roles('ethiopian').every(r => r === 'given+patronymic+patronymic'));
    assert.ok(roles('spanish').every(r => /^given(\+given)?\+family\+family$/.test(r)));
    assert.ok(roles('eastasian').every(r => /^family\+given$/.test(r)));
    // markers are fixed words of the language: the same Mac-type prefix for every name, whatever the salt
    const prefix = salt => new Set(generateNames(L, { kind: 'person', count: 12, scheme: 'fitz', salt }).map(n => n.parts[1].text.match(/^[^A-ZƩ]*[A-ZƩ][^A-ZƩ]*/)?.[0])).size;
    assert.equal(prefix(0), 1);
    assert.equal(generateNames(L, { kind: 'person', count: 12, scheme: 'sikh' }).filter(n => n.meaning.startsWith('lion')).every(n => n.parts[1].text === generateNames(L, { kind: 'person', count: 1, scheme: 'sikh', salt: 9 }).concat(generateNames(L, { kind: 'person', count: 40, scheme: 'sikh', salt: 9 })).find(m => m.meaning.startsWith('lion')).parts[1].text), true);
});
