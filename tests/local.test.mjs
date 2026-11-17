import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { chooseLocal, evidentialsOf } from '../src/syntax/local.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = (seed, extra = {}) => generateLanguage({ seed, ...extra }, vocabulary, templates, derivations);
function find(pred, extra = {}) {
    for (let i = 0; i < 120; i++) { const L = gen(`loc${i}`, extra); if (pred(L.syntax.local, L)) return L; }
    throw new Error('no language found');
}
const sample = (L, re) => L.samples.find(s => re.test(s.english));
const flat = s => s.tokens.flatMap(t => t.kind === 'alts' ? t.options.flat() : [t]);
const ids = s => flat(s).map(w => w.id);
const kinds = s => flat(s).flatMap(w => (w.parts ?? []).map(p => p.kind));
const AGG = { morphology: 'agglutinative' };

test('local: strategies are deterministic and drawn from the allowed values', () => {
    const seen = { proh: new Set(), pos: new Set(), sys: new Set(), seq: new Set(), part: new Set() };
    for (let i = 0; i < 200; i++) {
        const spec = { seed: `c${i}`, order: ['SVO', 'SOV', 'VSO'][i % 3], morphology: ['isolating', 'agglutinative', 'fusional'][i % 3] };
        const a = chooseLocal(spec);
        assert.deepEqual(a, chooseLocal(spec));
        if (spec.morphology !== 'agglutinative') { assert.notEqual(a.prohibitive, 'suffix'); if (a.evidentiality.system !== 'none') assert.equal(a.evidentiality.mode, 'particle'); }
        seen.proh.add(a.prohibitive); seen.pos.add(a.wh.position); seen.sys.add(a.evidentiality.system); seen.seq.add(a.tenseSequence); seen.part.add(a.register.particle);
    }
    assert.deepEqual([...seen.proh].sort(), ['negation', 'particle', 'suffix']);
    assert.deepEqual([...seen.pos].sort(), ['front', 'in-situ']);
    assert.deepEqual([...seen.sys].sort(), ['none', 'three', 'two']);
    assert.deepEqual([...seen.seq].sort(), ['absolute', 'backshift']);
    assert.deepEqual([...seen.part].sort(), ['after', 'before', 'none']);
});

test('local: prohibitive = negation, a word, or a suffix that replaces the negation', () => {
    const word = find(l => l.prohibitive === 'particle'), s = sample(word, /^Do not \[go/);
    assert.ok(ids(s).includes('grammar.prohibitive_marker') && !ids(s).includes('function.not'));
    const suffix = find(l => l.prohibitive === 'suffix', AGG), t = sample(suffix, /^Do not \[go/);
    assert.ok(kinds(t).includes('prohibitive') && !kinds(t).includes('negation') && !ids(t).includes('grammar.prohibitive_marker'));
    const plain = find(l => l.prohibitive === 'negation'), u = sample(plain, /^Do not \[go/);
    assert.ok(!ids(u).includes('grammar.prohibitive_marker') && !kinds(u).includes('prohibitive'));
});

test('local: question words move to the front or stay in place; the question particle is optional', () => {
    const front = find(l => l.wh.position === 'front' && !l.wh.particle), inSitu = find(l => l.wh.position === 'in-situ' && !l.wh.particle);
    const first = L => ids(sample(L, /^What do you/))[0], last = L => ids(sample(L, /^What do you/)).at(-1);
    assert.equal(first(front), 'interrogative.what');
    assert.notEqual(first(inSitu), 'interrogative.what');
    assert.ok(ids(sample(inSitu, /^What do you/)).includes('interrogative.what'));
    const withP = find(l => l.wh.particle), plain = find(l => !l.wh.particle);
    assert.ok(ids(sample(withP, /^What do you/)).includes('grammar.question_particle'));
    assert.ok(!ids(sample(plain, /^What do you/)).includes('grammar.question_particle'));
    // the subject question word: "Who sees you?"
    assert.ok(ids(sample(inSitu, /^Who \[sees/)).includes('interrogative.who'));
});

test('local: evidentials exist for the values of the system, as suffixes or particles', () => {
    const none = find(l => l.evidentiality.system === 'none');
    assert.equal(sample(none, /I saw it/), undefined);
    const two = find(l => l.evidentiality.system === 'two');
    assert.ok(sample(two, /I saw it/) && sample(two, /they say/) && !sample(two, /I infer/));
    assert.deepEqual(evidentialsOf(two.syntax.local), ['direct', 'reported']);
    const sfx = find(l => l.evidentiality.system === 'three' && l.evidentiality.mode === 'suffix', AGG);
    for (const re of [/I saw it/, /they say/, /I infer/]) assert.ok(kinds(sample(sfx, re)).includes('evidential'));
    assert.equal(new Set(['direct', 'reported', 'inferred'].map(k => sfx.morphology.affixes.local.evidential[k])).size, 3);
    const part = find(l => l.evidentiality.system === 'three' && l.evidentiality.mode === 'particle');
    assert.ok(ids(sample(part, /I saw it/)).includes('grammar.witnessed_marker') && ids(sample(part, /they say/)).includes('grammar.reported_marker') && ids(sample(part, /I infer/)).includes('grammar.inferred_marker'));
});

test('local: tense sequence: backshift keeps the past, absolute puts the reported clause in the present', () => {
    const back = find(l => l.tenseSequence === 'backshift'), abs = find(l => l.tenseSequence === 'absolute', AGG);
    const tenseOf = (L, re) => flat(sample(L, re)).flatMap(w => (w.parts ?? []).filter(p => p.kind === 'tense').map(p => p.meaning));
    assert.equal(sample(back, /^I knew that you/).english, 'I knew that you were [hungry|tired].');
    assert.deepEqual(tenseOf(back, /^I knew that you/), ['past', 'past'], 'both verbs are past');
    assert.equal(sample(abs, /^I knew that you/).english, 'I knew that you are [hungry|tired].');
    assert.deepEqual(tenseOf(abs, /^I knew that you/), ['past'], 'only the main verb is past');
});

test('local: polite address: plural pronoun and/or a particle, otherwise the sentence is unavailable', () => {
    const none = find(l => !l.register.pronoun && l.register.particle === 'none');
    assert.equal(sample(none, /^\(Polite\) Do you want/), undefined);
    const part = find(l => !l.register.pronoun && l.register.particle !== 'none'), s = sample(part, /^\(Polite\) Do you want/);
    assert.ok(s);
    const w = ids(s), idx = w.indexOf('grammar.polite_marker');
    assert.ok(idx === 0 || idx === w.length - 1, 'the particle is at the edge of the clause');
    const pron = find(l => l.register.pronoun, { morphology: 'isolating' }), p = sample(pron, /^\(Polite\) Do you want/);
    assert.ok(ids(p).includes('pronoun.second_person_plural') && !ids(p).includes('pronoun.second_person_singular'));
});

test('local: the description reaches the language', () => {
    const L = gen('desc5');
    for (const k of ['prohibitive', 'wh', 'evidentiality', 'tenseSequence', 'register']) assert.ok(L.syntax.localText[k], k);
});
