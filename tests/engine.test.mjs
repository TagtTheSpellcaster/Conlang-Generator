import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { resolveSpec, OPTIONS } from '../src/spec.js';
import { tokenText } from '../src/syntax/realize.js';
import { vocabulary, templates } from './helpers.mjs';

const gen = (input = {}) => generateLanguage({ seed: 't1', articles: 'both', ...input }, vocabulary, templates);
const text = L => L.samples.map(s => `${s.english} => ${tokenText(s.tokens)}`).join('\n');

test('determinism: same input and seed give identical output', () => {
    const a = gen({ seed: 'alpha', relations: 'cases' }), b = gen({ seed: 'alpha', relations: 'cases' });
    assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test('different seeds change forms but not the selected senses', () => {
    const a = gen({ seed: 'one' }), b = gen({ seed: 'two' });
    // only the calendar's own words (and the fill they displace) depend on the seed: a seed may give a lunar or a solar calendar
    const ids = new Set(b.lexicon.map(e => e.id));
    const shared = a.lexicon.filter(e => ids.has(e.id)).length;
    assert.ok(shared >= a.lexicon.length * 0.93, `${shared} of ${a.lexicon.length} senses shared`);
    assert.ok(a.lexicon.filter(e => e.tier === 'core').every(e => ids.has(e.id)), 'core senses are always selected');
    assert.notDeepEqual(a.lexicon.map(e => e.form), b.lexicon.map(e => e.form));
});

test('seed "auto" is resolved, reported and reproducible', () => {
    const a = generateLanguage({ seed: 'auto', articles: 'both' }, vocabulary, templates);
    assert.notEqual(a.spec.seed, 'auto');
    assert.match(a.spec.seed, /^auto-/);
    const b = generateLanguage({ seed: a.spec.seed, articles: 'both' }, vocabulary, templates);
    assert.equal(JSON.stringify(b.lexicon), JSON.stringify(a.lexicon));
    assert.equal(text(b), text(a));
    const c = generateLanguage({ seed: 'auto' }, vocabulary, templates);
    assert.notEqual(c.spec.seed, a.spec.seed);
});

test('lexicon: unique non-empty forms, at most 600 entries, core senses always present', () => {
    const L = gen();
    assert.ok(L.lexicon.length <= 600);
    assert.equal(new Set(L.lexicon.map(e => e.form)).size, L.lexicon.length);
    assert.ok(L.lexicon.every(e => e.form && e.form.length >= 1));
    const ids = new Set(L.lexicon.map(e => e.id));
    for (const e of vocabulary.filter(e => e.tier === 'core' && !(e.pos === 'determiner' && ['the', 'a'].includes(e.lemma)))) assert.ok(ids.has(e.id), e.id);
});

test('articles "none" removes the articles from the lexicon', () => {
    const L = gen({ articles: 'none' });
    assert.ok(!L.lexicon.some(e => e.pos === 'determiner' && ['the', 'a', 'an'].includes(e.lemma)));
    assert.ok(L.samples.length >= 40);
});

test('filters change the selection', () => {
    const base = gen(), sci = gen({ tags: ['sci-fi'] });
    assert.notDeepEqual(base.lexicon.map(e => e.id), sci.lexicon.map(e => e.id));
    assert.ok(sci.lexicon.some(e => e.tags.includes('sci-fi')));
    assert.doesNotThrow(() => gen({ region: ['no-such-region'], tags: ['no-such-tag'] }));
});

test('invalid options fall back to defaults with a note, nothing throws', () => {
    const { spec, notes } = resolveSpec({ order: 'XYZ', vowels: 'greek', mean: 'abc', morphology: 'polysynthetic', relations: 7 });
    assert.equal(spec.order, 'SVO'); assert.equal(spec.vowels, 'standard'); assert.equal(spec.mean, 2.2);
    assert.ok(notes.length >= 4);
    assert.doesNotThrow(() => gen({ order: 'XYZ', vowels: 'greek', mean: -4, consonants: 'klingon' }));
    assert.equal(resolveSpec({ mean: 99 }).spec.mean, 5);
    assert.equal(resolveSpec({ mean: 0.1 }).spec.mean, 1);
});

test('empty vocabulary is an error, not a crash', () => {
    assert.throws(() => generateLanguage({}, [], templates), /empty/);
    assert.throws(() => generateLanguage({}, null, templates), /empty/);
});

test('isolating morphology disables every affix and says so', () => {
    const L = gen({ morphology: 'isolating', relations: 'ergative', gender: 'masculine-feminine-neuter', plural: 'suffix', number: 'singular-plural-dual' });
    assert.equal(L.spec.relations, 'prepositions');
    assert.deepEqual(L.morphology.model.cases, []);
    assert.deepEqual(L.morphology.affixes.caseEndings, {});
    assert.deepEqual(L.morphology.affixes.genderEndings, {});
    assert.equal(L.morphology.affixes.numberMarkers.plural, '');
    assert.ok(L.notes.length >= 3);
});

test('number "singular" and plural "none" disable the number marker', () => {
    assert.deepEqual(gen({ number: 'singular' }).spec.numbers, ['singular']);
    assert.equal(gen({ number: 'singular' }).morphology.affixes.numberMarkers.plural, '');
    assert.deepEqual(gen({ plural: 'none', number: 'singular-plural-dual' }).spec.numbers, ['singular']);
    assert.deepEqual(gen({ number: 'singular-plural-dual' }).spec.numbers, ['singular', 'plural', 'dual']);
});

test('case system "minimal" works with every relation model (it used to crash)', () => {
    for (const relations of ['cases', 'mixed', 'ergative']) {
        const L = gen({ relations, caseSystem: 'minimal' });
        assert.equal(L.morphology.model.cases.length, 2, relations);
    }
});

test('affixes are unique and never collide with root forms', () => {
    const L = gen({ relations: 'cases', caseSystem: 'extensive', gender: 'masculine-feminine-neuter', number: 'singular-plural-dual' });
    const a = L.morphology.affixes;
    const list = [...Object.values(a.caseEndings), a.numberMarkers.plural, a.numberMarkers.dual, ...Object.values(a.genderEndings)].filter(Boolean);
    assert.equal(new Set(list).size, list.length);
    const roots = new Set(L.lexicon.map(e => e.form));
    assert.ok(list.every(x => !roots.has(x)));
    assert.ok(list.every(x => x.length <= 4), 'single-syllable templates V, CV, VC');
});

test('fusional morphology: one distinct portmanteau per gender x number x case', () => {
    const L = gen({ morphology: 'fusional', relations: 'cases', caseSystem: 'moderate', gender: 'masculine-feminine', number: 'singular-plural-dual' });
    const cells = Object.values(L.morphology.affixes.fused).flatMap(g => Object.values(g).flatMap(n => Object.values(n)));
    assert.equal(cells.length, 2 * 3 * 4);
    const nonEmpty = cells.filter(Boolean);
    assert.equal(new Set(nonEmpty).size, nonEmpty.length);
    assert.equal(cells.length - nonEmpty.length, 2, 'only the unmarked cell of each gender is empty');
});

test('every option combination generates without error (randomised sweep + corners)', () => {
    let seed = 12345;
    const rnd = n => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % n; };
    const pickOf = k => OPTIONS[k][rnd(OPTIONS[k].length)];
    const runs = [];
    for (let i = 0; i < 250; i++) runs.push(Object.fromEntries(Object.keys(OPTIONS).map(k => [k, pickOf(k)])));
    for (const consonants of OPTIONS.consonants) for (const vowels of OPTIONS.vowels) runs.push({ consonants, vowels, mean: 1 }, { consonants, vowels, mean: 5 });
    runs.forEach((r, i) => {
        const L = generateLanguage({ ...r, seed: `sweep-${i}` }, vocabulary, templates);
        assert.equal(new Set(L.lexicon.map(e => e.form)).size, L.lexicon.length, JSON.stringify(r));
        assert.deepEqual(L.skippedSamples, [], JSON.stringify(r));
        assert.ok(L.samples.length >= 40, `${L.samples.length} ${JSON.stringify(r)}`);
        for (const s of L.samples) assert.ok(tokenText(s.tokens).trim().length > 0);
    });
});

test('phonology: forms use only the vowels and consonants of the model', () => {
    const L = gen({ consonants: 'japanese', vowels: 'minimal' });
    const allowed = new Set([...L.phonology.vowels, ...L.phonology.consonants]);
    for (const e of L.lexicon) for (const ch of e.form) assert.ok(allowed.has(ch), `${e.form} contains ${ch}`);
});
