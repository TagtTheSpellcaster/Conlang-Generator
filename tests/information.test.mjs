import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { realize } from '../src/syntax/realize.js';
import { chooseInformation, reflexiveRef, REFLEXIVE_REFS } from '../src/discourse/info.js';
import { STORIES, compileStory } from '../src/discourse/texts.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const langOf = L => ({ spec: L.spec, model: L.morphology.model, affixes: L.morphology.affixes, lexicon: L.lexicon, numerals: L.numerals, info: L.syntax.information });
// a language whose texts include the story, found by scanning seeds
function find(storyId) {
    for (let i = 0; i < 40; i++) {
        const L = generateLanguage({ seed: `info${i}` }, vocabulary, templates, derivations);
        if (L.texts.some(t => t.id === storyId)) return L;
    }
    throw new Error(`no language with ${storyId}`);
}
const line = (id, n) => compileStory(STORIES.find(s => s.id === id))[n - 1].template;
const ids = r => r.tokens.map(t => t.id);

test('information: strategies are deterministic, drawn from the allowed values, and all of them occur', () => {
    const seen = { topic: new Set(), focus: new Set(), reflexive: new Set(), position: new Set(), terms: new Set() };
    for (let i = 0; i < 60; i++) {
        const spec = { seed: `s${i}`, order: ['SVO', 'SOV', 'VSO'][i % 3], adjPosition: i % 2 ? 'before' : 'after' };
        const a = chooseInformation(spec), b = chooseInformation(spec);
        assert.deepEqual(a, b);
        seen.topic.add(a.topic); seen.focus.add(a.focus); seen.reflexive.add(a.reflexive); seen.position.add(a.demonstrative.position); seen.terms.add(a.demonstrative.terms);
    }
    assert.deepEqual([...seen.topic].sort(), ['front', 'none', 'particle']);
    assert.deepEqual([...seen.focus].sort(), ['front', 'none', 'particle']);
    assert.deepEqual([...seen.reflexive].sort(), ['invariant', 'person']);
    assert.deepEqual([...seen.position].sort(), ['after', 'before']);
    assert.deepEqual([...seen.terms].sort(), ['one', 'two']);
});

test('information: the reflexive follows person and number, or is a single word', () => {
    assert.equal(reflexiveRef({ reflexive: 'person' }, 1, 'singular'), 'function.myself');
    assert.equal(reflexiveRef({ reflexive: 'person' }, 1, 'plural'), 'function.ourselves');
    assert.equal(reflexiveRef({ reflexive: 'person' }, 3, 'singular', 'female'), 'function.herself');
    assert.equal(reflexiveRef({ reflexive: 'person' }, 3, 'plural', 'plural'), 'function.themselves');
    for (const p of [1, 2, 3]) assert.equal(reflexiveRef({ reflexive: 'invariant' }, p, 'singular'), 'function.himself');
    for (const r of REFLEXIVE_REFS) assert.ok(vocabulary.some(e => e.id === r), r);
});

test('information: a topic is fronted, and followed by a marker when the language has one', () => {
    const L = find('man-and-dog'), lang = langOf(L), t = line('man-and-dog', 6);
    const none = realize(t, { ...lang, info: { ...lang.info, topic: 'none' } }), front = realize(t, { ...lang, info: { ...lang.info, topic: 'front' } }), part = realize(t, { ...lang, info: { ...lang.info, topic: 'particle' } });
    for (const r of [none, front, part]) assert.ok(!r.skipped, r.missing);
    assert.deepEqual([...ids(front)].sort(), [...ids(none)].sort());
    assert.ok(['nature.dog', 'demonstrative.that', 'demonstrative.this'].includes(ids(front)[0]), 'object phrase first');
    const k = ids(part).indexOf('grammar.topic_marker');
    assert.ok(k > 0 && ['nature.dog', 'demonstrative.that', 'demonstrative.this'].includes(ids(part)[k - 1]), 'marker follows the topic');
    assert.equal(ids(none).includes('grammar.topic_marker'), false);
});

test('information: focus is marked in place or fronted, never both', () => {
    const L = find('seen-by-whom'), lang = langOf(L), t = line('seen-by-whom', 2);
    const none = realize(t, { ...lang, info: { ...lang.info, focus: 'none' } }), part = realize(t, { ...lang, info: { ...lang.info, focus: 'particle' } }), front = realize(t, { ...lang, info: { ...lang.info, focus: 'front' } });
    for (const r of [none, part, front]) assert.ok(!r.skipped, r.missing);
    assert.equal(ids(none).includes('grammar.focus_marker'), false);
    assert.equal(ids(front).includes('grammar.focus_marker'), false);
    const k = ids(part).indexOf('grammar.focus_marker');
    const hunter = L.lexicon.find(e => e.lemma === 'hunter' && e.pos === 'noun').id;
    assert.equal(ids(part)[k - 1], hunter, 'the marker follows the focused subject');
    assert.equal(ids(part).length, ids(none).length + 1);
    // the focused subject (hunter) follows the initial particle "no" when fronted
    assert.ok(ids(front).indexOf(hunter) <= 2);
});

test('information: a reflexive object copies the subject, per the language strategy', () => {
    const L = find('man-and-dog'), lang = langOf(L);
    const base = { V: { head: 'wash:verb' }, S: { head: 'pronoun.first_person_singular' }, O: { refl: true } };
    const person = realize(base, { ...lang, info: { ...lang.info, reflexive: 'person' } }), inv = realize(base, { ...lang, info: { ...lang.info, reflexive: 'invariant' } });
    assert.ok(ids(person).includes('function.myself'));
    assert.ok(ids(inv).includes('function.himself'));
    const plural = realize({ ...base, S: { head: 'pronoun.third_person_plural' } }, { ...lang, info: { ...lang.info, reflexive: 'person' } });
    assert.ok(ids(plural).includes('function.themselves'));
});

test('information: a demonstrative replaces the article, has one or two terms, and goes on the language side', () => {
    const L = find('man-and-dog'), lang = langOf(L);
    const t = { V: { head: 'see:verb' }, S: { head: 'pronoun.first_person_singular' }, O: { head: 'dog:noun', dem: 'distal', det: 'definite' } };
    for (const [terms, position] of [['two', 'before'], ['two', 'after'], ['one', 'before']]) {
        const r = realize(t, { ...lang, info: { ...lang.info, demonstrative: { terms, position } } });
        assert.ok(!r.skipped, r.missing);
        const i = ids(r), d = i.indexOf(terms === 'two' ? 'demonstrative.that' : 'demonstrative.this'), n = i.indexOf('nature.dog');
        assert.ok(d >= 0 && n >= 0);
        assert.equal(d < n, position === 'before');
        assert.equal(i.includes('function.the'), false);
    }
});

test('information: possessives and reflexives of the stories follow the actor, and the English agrees', () => {
    const story = STORIES.find(s => s.id === 'man-and-dog'), c = compileStory(story);
    assert.equal(c[2].en, 'His dog was hungry.');
    assert.equal(c[2].template.S.poss, 'function.his');
    assert.equal(c[4].en, 'Then he washed himself in a river.');
    assert.equal(c[4].template.O.refl, 'male');
    assert.match(c[5].en, /^As for that dog, he saw it\.$/);
    assert.equal(c[5].template.O.dem, 'distal');
    assert.deepEqual(c[5].template.info, { topic: 'O' });
});

test('information: the description reaches the language and every story line that is realised stays complete', () => {
    const L = find('man-and-dog');
    assert.ok(L.syntax.informationText.topic && L.syntax.informationText.focus && L.syntax.informationText.demonstratives && L.syntax.informationText.reflexive);
    const t = L.texts.find(x => x.id === 'man-and-dog');
    assert.equal(t.lines.length, 7);
    for (const l of t.lines) assert.ok(l.tokens.length > 0);
});
