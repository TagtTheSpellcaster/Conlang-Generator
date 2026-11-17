import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { buildIndex, realize, tokenText } from '../src/syntax/realize.js';
import { toTemplate, templateToFrame, ROLES } from '../src/syntax/frame.js';
import { DiscourseState } from '../src/discourse/state.js';
import { STORIES, compileStory } from '../src/discourse/texts.js';
import { vocabulary, templates, derivations } from './helpers.mjs';
import fixture from './fixtures/stories-templates.json' with { type: 'json' };

const ALL = [...templates.universal, ...Object.values(templates.genres).flat()];
const index = buildIndex(vocabulary);
const transitivityOf = head => index.resolve([].concat(head)[0])?.features?.transitivity ?? null;
const clean = o => Array.isArray(o) ? o.map(clean) : o && typeof o === 'object' ? Object.fromEntries(Object.keys(o).sort().filter(k => o[k] !== undefined).map(k => [k, clean(o[k])])) : o;

test('frames: every hand-written template survives template -> frame -> template unchanged', () => {
    for (const t of ALL) {
        const frame = templateToFrame(t, transitivityOf);
        for (const k of Object.keys(frame.roles)) assert.ok(ROLES.includes(k), `${t.id}: role ${k}`);
        assert.deepEqual(clean(toTemplate(frame)), clean(t), t.id);
    }
});

test('frames: the roles are assigned to subject, object and adjuncts by the rules', () => {
    const g = { head: 'give:verb' };
    const t = toTemplate({ pred: g, roles: { agent: { head: 'a' }, theme: { head: 'b' }, recipient: { head: 'c' } } });
    assert.deepEqual(clean(t), clean({ V: g, S: { head: 'a' }, O: { head: 'b' }, A: { adp: 'to:adposition', case: 'dative', np: { head: 'c' } } }));
    const c = toTemplate({ pred: { head: 'be:verb' }, roles: { theme: { head: 'x' }, attribute: { head: 'y' } } });
    assert.deepEqual(clean(c), clean({ V: { head: 'be:verb' }, S: { head: 'x' }, O: { head: 'y' } }));
    const i = toTemplate({ pred: { head: 'sleep:verb' }, roles: { agent: { head: 'x' }, oblique: { adp: 'in:adposition', np: { head: 'z' } }, adjunct: { head: 'now:adverb' } } });
    assert.deepEqual(clean(i), clean({ V: { head: 'sleep:verb' }, S: { head: 'x' }, A: { adp: 'in:adposition', np: { head: 'z' } }, B: { head: 'now:adverb' } }));
    assert.throws(() => toTemplate({ roles: { boss: {} } }), /unknown role/);
    assert.throws(() => toTemplate({ roles: {}, voice: 'passive' }), /needs a patient/);
    assert.throws(() => toTemplate({ roles: {}, voice: 'dative' }), /unknown voice/);
});

test('frames: a frame is realised exactly as its template, also in ergative and case languages', () => {
    const langs = [{ seed: 'fr1' }, { seed: 'fr2', relations: 'ergative' }, { seed: 'fr3', relations: 'cases' }].map(i => generateLanguage(i, vocabulary, templates, derivations)).map(L => ({ spec: L.spec, model: L.morphology.model, affixes: L.morphology.affixes, lexicon: L.lexicon, numerals: L.numerals }));
    const sample = ALL.filter((t, i) => i % 4 === 0 && t.V);
    let n = 0;
    for (const L of langs) for (const t of sample) {
        const direct = realize(t, L), viaFrame = realize({ id: t.id, en: t.en, ...toTemplate(templateToFrame(t, transitivityOf)) }, L);
        assert.deepEqual(direct.skipped, viaFrame.skipped);
        if (!direct.skipped) { assert.equal(tokenText(viaFrame.tokens), tokenText(direct.tokens)); n++; }
    }
    assert.ok(n >= 60, `${n} sentences compared`);
});

test('texts: stories described by frames compile to the same templates as before the frame layer', () => {
    for (const s of STORIES.filter(x => fixture[x.id])) {
        const now = compileStory(s);
        assert.equal(now.length, fixture[s.id].length);
        now.forEach((l, i) => { assert.equal(l.en, fixture[s.id][i].en); assert.deepEqual(clean(l.template), clean(fixture[s.id][i].template), `${s.id}:${i + 1}`); });
    }
});

test('discourse state: indefinite, then pronoun while in the foreground, definite when a rival of the same kind is near', () => {
    const actors = { a: { pron: 'male' }, b: { pron: 'male' }, c: { pron: 'female' } };
    const d = new DiscourseState(actors);
    assert.equal(d.refer('a', true), 'indef'); d.endClause();
    assert.equal(d.refer('a', true), 'pron'); assert.equal(d.refer('b'), 'indef'); d.endClause();
    assert.equal(d.topic, 'a');
    assert.equal(d.refer('a', true), 'def', 'two male characters in the last clause: a pronoun would be ambiguous');
    assert.equal(d.refer('c'), 'indef'); d.endClause();
    assert.equal(d.refer('c', true), 'pron');
    assert.equal(d.topic, 'a');
});
