import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { buildIndex } from '../src/syntax/realize.js';
import { compileStory } from '../src/discourse/texts.js';
import { planStory, planStories, SCHEMAS } from '../src/discourse/planner.js';
import { VERBS, CAST, ADJECTIVES } from '../src/discourse/verbs.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const index = buildIndex(vocabulary);
const gen = seed => generateLanguage({ seed }, vocabulary, templates, derivations);
const slotOf = (line, ref) => typeof ref === 'string' && /^\$\d+$/.test(ref) ? line.slots?.[Number(ref.slice(1)) - 1] : null;

test('verb frames: 100 to 150 verbs, all in the dictionary, each with a frame kind, a past form and the classes it accepts', () => {
    assert.ok(VERBS.length >= 100 && VERBS.length <= 150, `${VERBS.length} verbs`);
    for (const v of VERBS) {
        assert.ok(index.resolve(`${v.lemma}:verb`), `${v.lemma} is not in the dictionary`);
        assert.ok('imtdcw'.includes(v.kind) && v.past, v.lemma);
        if ('tdi'.includes(v.kind)) assert.ok(v.agent, `${v.lemma}: agent`);
        if ('td'.includes(v.kind)) assert.ok(v.patient, `${v.lemma}: patient`);
        if (v.kind === 'm') assert.ok(v.goal, `${v.lemma}: goal`);
    }
    for (const kind of 'imtdcw') assert.ok(VERBS.some(v => v.kind === kind), `a verb of kind ${kind}`);
});

test('cast: every noun and adjective exists; each class has members', () => {
    for (const c of CAST) assert.ok(index.resolve(`${c.lemma}:noun`), c.lemma);
    for (const k of 'hapbdofwvn') assert.ok(CAST.some(c => c.classes.includes(k)), `class ${k}`);
    for (const a of Object.values(ADJECTIVES).flat()) assert.ok(index.resolve(`${a}:adjective`), a);
});

test('planner: deterministic, and a story for every schema', () => {
    for (const schema of SCHEMAS) {
        const a = planStory({ seed: 'p1' }, index, schema), b = planStory({ seed: 'p1' }, index, schema);
        assert.deepEqual(a, b);
        assert.ok(a && a.lines.length >= 6, schema);
    }
    assert.equal(planStories({ seed: 'p1' }, index).length, 3);
    assert.notDeepEqual(planStory({ seed: 'p1' }, index, 'quest'), planStory({ seed: 'p2' }, index, 'quest'));
});

test('planner: the cast fits the verbs (agents and patients are of the classes the verb accepts)', () => {
    for (let i = 0; i < 60; i++) for (const schema of ['quest', 'event']) {
        const story = planStory({ seed: `fit${i}` }, index, schema, i);
        for (const line of story.lines) {
            const { pred, roles = {}, comp } = line.frame, verb = VERBS.find(v => v.lemma === pred.head.split(':')[0]);
            if (pred.head === 'be:verb') continue;
            assert.ok(verb, pred.head);
            const classes = ref => story.actors[slotOf(line, ref)]?.classes;
            const agent = classes(roles.agent), patient = classes(roles.patient), recipient = classes(roles.recipient);
            if (agent && verb.kind !== 'c' && verb.agent) assert.ok([...agent].some(c => verb.agent.includes(c)), `${story.id} ${line.en}: agent`);
            if (patient && verb.patient) assert.ok([...patient].some(c => verb.patient.includes(c)), `${story.id} ${line.en}: patient`);
            if (recipient) assert.ok([...recipient].some(c => 'ha'.includes(c)), `${line.en}: recipient`);
            if (comp?.control) { const inner = VERBS.find(v => v.lemma === comp.frame.pred.head.split(':')[0]), p = classes(comp.frame.roles.patient); assert.ok([...p].some(c => inner.patient.includes(c)), `${line.en}: inner patient`); }
        }
    }
});

test('planner: the English is complete, capitalised, and mass nouns take no article', () => {
    for (let i = 0; i < 40; i++) for (const schema of SCHEMAS) {
        const story = planStory({ seed: `en${i}` }, index, schema, i);
        for (const l of compileStory(story)) {
            assert.ok(!/[{}$]/.test(l.en), l.en);
            assert.ok(/^[A-Z]/.test(l.en) && /[.?!]$/.test(l.en), l.en);
            assert.ok(!/\b(a|an) (bread|water|milk|wine|meat|cheese|fruit|gold|cloth)\b/.test(l.en), l.en);
            assert.ok(!/\ba [aeiou]/.test(l.en) && !/\ban [^aeiou]/.test(l.en), l.en);
        }
    }
});

test('planner: a language gets a meeting, a quest and an event with their words, and every line is realised', () => {
    for (const seed of ['t1', 't2', 't3', 't4', 't5', 't6']) {
        const L = gen(seed), planned = L.texts.filter(t => t.id.startsWith('plan:'));
        assert.deepEqual(planned.map(t => t.id.split(':')[1]).sort(), ['event', 'meeting', 'quest'], seed);
        assert.equal(L.texts.length, 4, seed);
        for (const t of planned) for (const l of t.lines) assert.ok(l.tokens.length, `${seed} ${l.en}`);
        const ids = new Set(L.lexicon.map(e => e.id));
        for (const s of planStories({ seed }, index)) for (const key of Object.keys(s.actors)) assert.ok(ids.has(index.resolve(`${key}:noun`).id), `${seed}: ${key} is a word of the language`);
    }
});
