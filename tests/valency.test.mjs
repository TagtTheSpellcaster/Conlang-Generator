import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { realize, tokenText } from '../src/syntax/realize.js';
import { chooseValency, VOICES } from '../src/syntax/valency.js';
import { toTemplate } from '../src/syntax/frame.js';
import { realizeStories } from '../src/discourse/texts.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = (seed, extra = {}) => generateLanguage({ seed, ...extra }, vocabulary, templates, derivations);
const langOf = L => ({ spec: L.spec, model: L.morphology.model, affixes: L.morphology.affixes, lexicon: L.lexicon, numerals: L.numerals, info: L.syntax.information, valency: L.syntax.valency });
// the first language that satisfies the condition
function find(pred, extra = {}) {
    for (let i = 0; i < 60; i++) { const L = gen(`val${i}`, extra); if (pred(L)) return L; }
    throw new Error('no language found');
}
const sentence = (L, topic, en) => L.samples.find(s => s.topic === topic && s.english === en);
const has = (r, kind, meaning) => r.tokens.some(t => t.parts?.some(p => p.kind === kind && (!meaning || p.meaning === meaning)));
const ids = r => r.tokens.map(t => t.id);

test('valency: strategies are deterministic; antipassive only in ergative languages; affixes only in agglutinative ones', () => {
    const seen = { affix: new Set(), particle: new Set(), none: new Set() };
    for (let i = 0; i < 120; i++) {
        const spec = { seed: `c${i}`, relations: i % 3 ? 'cases' : 'ergative', morphology: ['isolating', 'agglutinative', 'fusional'][i % 3 === 0 ? 1 : i % 2] };
        const a = chooseValency(spec), b = chooseValency(spec);
        assert.deepEqual(a, b);
        assert.ok(VOICES.some(v => a[v]), 'at least one voice');
        if (spec.relations !== 'ergative') assert.equal(a.antipassive, null);
        for (const v of VOICES) {
            if (a[v] === 'affix') assert.equal(spec.morphology, 'agglutinative');
            (a[v] ?? 'none') === 'affix' ? seen.affix.add(v) : a[v] ? seen.particle.add(v) : seen.none.add(v);
        }
    }
    for (const v of VOICES) assert.ok(seen.particle.has(v) || seen.affix.has(v), v);
    assert.ok(seen.affix.size > 0 && seen.particle.size > 0 && seen.none.size > 0);
});

test('valency: a language with the voice as a suffix has the affix, and only then', () => {
    for (let i = 0; i < 30; i++) {
        const L = gen(`aff${i}`, { morphology: 'agglutinative' });
        for (const v of VOICES) assert.equal(!!L.morphology.affixes.voice?.[v], L.syntax.valency[v] === 'affix', `${L.spec.seed} ${v}`);
    }
    assert.ok(!gen('aff-iso', { morphology: 'isolating' }).morphology.affixes.voice);
});

test('valency: the frame maps roles to the clause by voice', () => {
    const pred = { head: 'eat:verb' }, a = { head: 'man:noun' }, p = { head: 'bread:noun' }, k = { head: 'knife:noun' };
    const pas = toTemplate({ voice: 'passive', pred, roles: { agent: a, patient: p } });
    assert.deepEqual([pas.S, pas.V.voice, pas.O, pas.A.adp, pas.A.np], [p, 'passive', undefined, 'by:adposition', a]);
    const agentless = toTemplate({ voice: 'passive', pred, roles: { patient: p } });
    assert.deepEqual([agentless.S, agentless.A], [p, undefined]);
    const anti = toTemplate({ voice: 'antipassive', pred, roles: { agent: a, patient: p } });
    assert.deepEqual([anti.S, anti.O, anti.A.adp, anti.V.voice], [a, undefined, 'to:adposition', 'antipassive']);
    const caus = toTemplate({ voice: 'causative', pred, roles: { causer: { head: 'king:noun' }, agent: a, patient: p } });
    assert.deepEqual([caus.S.head, caus.O, caus.A.np], ['king:noun', p, a]);
    const causIntr = toTemplate({ voice: 'causative', pred: { head: 'sleep:verb' }, roles: { causer: a, agent: p } });
    assert.deepEqual([causIntr.S, causIntr.O, causIntr.A], [a, p, undefined]);
    const appl = toTemplate({ voice: 'applicative', pred, roles: { agent: a, patient: p, oblique: k } });
    assert.deepEqual([appl.S, appl.O, appl.A.np, appl.A.adp], [a, k, p, 'to:adposition']);
    assert.throws(() => toTemplate({ voice: 'passive', pred, roles: { agent: a } }), /needs a patient/);
    assert.throws(() => toTemplate({ voice: 'antipassive', pred, roles: { agent: a } }), /agent and a patient/);
    assert.throws(() => toTemplate({ voice: 'causative', pred, roles: { agent: a } }), /causer/);
    assert.throws(() => toTemplate({ voice: 'applicative', pred, roles: { agent: a } }), /oblique/);
    assert.throws(() => toTemplate({ pred, roles: { causer: a, agent: p } }), /causative/);
});

test('valency: the voice is a verb suffix or a particle, as the language decides', () => {
    const affix = find(L => L.syntax.valency.passive === 'affix');
    const s = sentence(affix, 'Voice and valency', 'The bread was eaten.');
    assert.ok(s && has(s, 'voice', 'passive'), 'suffix on the verb');
    assert.equal(ids(s).includes('grammar.passive_marker'), false);
    const particle = find(L => L.syntax.valency.passive === 'particle');
    const p = sentence(particle, 'Voice and valency', 'The bread was eaten.');
    assert.ok(p && ids(p).includes('grammar.passive_marker') && !has(p, 'voice'));
});

test('valency: a language without the construction does not get the sentence', () => {
    const L = find(l => !l.syntax.valency.passive);
    assert.equal(L.samples.some(s => /was (opened|killed|eaten)/.test(s.english)), false);
    const nonErgative = find(l => l.spec.relations !== 'ergative');
    assert.equal(nonErgative.samples.some(s => s.english === 'The woman ate bread.'), false);
});

test('valency: the case of the subject follows the new valency in ergative and accusative languages', () => {
    const E = find(l => l.spec.relations === 'ergative' && l.syntax.valency.passive && l.syntax.valency.causative && l.spec.morphology !== 'isolating', { relations: 'ergative' });
    const r = realize({ en: 'x', S: { head: 'bread:noun', det: 'definite' }, V: { head: 'eat:verb', voice: 'passive' } }, langOf(E));
    const subject = r.tokens.find(t => t.parts?.some(p => p.kind === 'stem' && E.lexicon.find(e => e.id === t.id)?.lemma === 'bread'));
    assert.ok(subject && !/ergative/.test(subject.gloss), 'the patient of a passive is absolutive');
    const c = realize({ en: 'x', S: { head: 'king:noun' }, V: { head: 'eat:verb', voice: 'causative' }, O: { head: 'bread:noun' }, A: { adp: 'to:adposition', case: 'dative', np: { head: 'man:noun' } } }, langOf(E));
    assert.ok(c.tokens.some(t => /ergative/.test(t.gloss)), 'the causer of a transitive clause is ergative');
    const N = find(l => l.spec.relations === 'cases' && l.syntax.valency.causative && l.spec.morphology !== 'isolating');
    const n = realize({ en: 'x', S: { head: 'king:noun' }, V: { head: 'sleep:verb', voice: 'causative' }, O: { head: 'man:noun' } }, langOf(N));
    assert.ok(n.tokens.some(t => /accusative/.test(t.gloss)), 'the causee of an intransitive verb is an accusative object');
});

test('valency: a text line falls back to the active voice when the language lacks the construction', () => {
    const without = find(l => !l.syntax.valency.passive && l.texts.some(t => t.id === 'woman-and-bread'));
    const t = without.texts.find(x => x.id === 'woman-and-bread');
    assert.ok(t.lines.some(l => l.en === 'A child ate the bread.'));
    assert.equal(t.lines.some(l => /was eaten/.test(l.en)), false);
    const withIt = find(l => l.syntax.valency.passive && l.syntax.valency.causative && l.syntax.valency.applicative && l.texts.some(x => x.id === 'woman-and-bread'));
    const u = withIt.texts.find(x => x.id === 'woman-and-bread');
    assert.ok(u.lines.some(l => l.en === 'The bread was eaten by a child.') && u.lines.some(l => l.en === 'It made the woman laugh.'));
    assert.equal(realizeStories(langOf(withIt), ['woman-and-bread'])[0].lines.length, 6);
});

test('valency: the description reaches the language', () => {
    const L = gen('desc');
    for (const v of VOICES) assert.ok(L.syntax.valencyText[v], v);
});
