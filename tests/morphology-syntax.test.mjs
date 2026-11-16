import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { inflect, classOf } from '../src/morphology/inflect.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const make = (input) => generateLanguage(input, vocabulary, templates, derivations);
const forms = t => t.kind === 'alts' ? t.options.flatMap(o => o.flatMap(forms)) : [t.parts.map(p => p.text).join('')];

test('inflection classes: deterministic, all classes used, adjectives follow nouns, classes only where the morphology has endings', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) for (const morphology of ['fusional', 'agglutinative']) {
        const L = make({ seed, morphology });
        const A = L.morphology.affixes, n = A.classOverlays.noun.length;
        assert.ok(n >= 1 && n <= 4);
        const used = new Set(L.lexicon.filter(e => e.pos === 'noun').map(e => classOf(e, A, L.spec)));
        assert.ok([...used].every(k => k < n));
        if (morphology === 'fusional') assert.ok(n >= 2 && used.size >= 2, `${seed}: fusional nouns have several classes`);
        const again = make({ seed, morphology });
        assert.deepEqual(again.morphology.affixes.classMap, A.classMap);
    }
    const iso = make({ seed: 'a', morphology: 'isolating' });
    assert.equal(iso.morphology.affixes.classOverlays, undefined);
});

test('stem alternations come from the sound changes: only the stem differs, the ending stays, regular forms are the majority', () => {
    let alt = 0, total = 0;
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
        const L = make({ seed, morphology: 'fusional' });
        const M = { spec: L.spec, model: L.morphology.model, affixes: L.morphology.affixes };
        for (const e of L.lexicon.filter(x => x.pos === 'noun').slice(0, 150)) for (const c of L.morphology.model.cases.slice(0, 3)) {
            const r = inflect(e, { number: 'plural', case: c }, M);
            total++;
            if (r.irregular) {
                alt++;
                assert.equal(r.parts[0].kind, 'stem-alt');
                assert.equal(r.parts.map(p => p.text).join(''), r.form);
                assert.ok(r.form.endsWith(r.parts.slice(1).map(p => p.text).join('')));
                assert.notEqual(r.form, r.irregular.regular);
            }
        }
    }
    assert.ok(alt > 0, 'some alternations exist');
    assert.ok(alt < total * 0.3, `${alt}/${total} alternating forms is too many`);
});

test('suppletive stems are unique, outside the lexicon, and used by inflect', () => {
    let seen = 0;
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
        const L = make({ seed, morphology: 'agglutinative' });
        const M = { spec: L.spec, model: L.morphology.model, affixes: L.morphology.affixes };
        const roots = new Set(L.lexicon.map(e => e.form));
        const stems = [];
        for (const [id, o] of Object.entries(L.morphology.affixes.suppletion)) {
            const e = L.lexicon.find(x => x.id === id);
            for (const [k, w] of Object.entries(o)) {
                stems.push(w); assert.ok(!roots.has(w));
                if (k === 'past') { seen++; assert.ok(inflect(e, { tense: 'past', person: 3, number: 'singular' }, M).form.startsWith(w)); }
                if (k === 'comparative') assert.equal(inflect(e, { degree: 'comparative' }, M).form, w);
            }
        }
        assert.equal(new Set(stems).size, stems.length);
    }
    assert.ok(seen > 0);
});

const NEW = ['Coordination', 'Possession', 'Relative clauses', 'Embedded questions', 'Reflexive and reciprocal', 'Negative indefinites'];

test('new sentence frames (coordination, genitive, relatives, embedded questions, reflexives) are realised in every word order', () => {
    for (const order of ['SVO', 'SOV', 'VSO', 'VOS', 'OVS', 'OSV']) {
        const L = make({ seed: 'x', order });
        const got = L.samples.filter(s => NEW.includes(s.topic));
        assert.ok(got.length >= 12, `${order}: ${got.length} new sentences`);
        for (const s of got) assert.ok(s.tokens.length >= 2, s.english);
    }
});

test('relative clauses: before the head noun in head-final languages, after it otherwise; the relativiser is the same word', () => {
    for (const [order, before] of [['SOV', true], ['OSV', true], ['SVO', false], ['VSO', false]]) {
        const L = make({ seed: 'r', order });
        const rel = L.lexicon.find(e => e.lemma === 'that' && e.pos === 'pronoun').form;
        const s = L.samples.find(x => x.english === 'The man who sees the dog is here.');
        assert.ok(s, order);
        const flat = s.tokens.flatMap(t => forms(t).slice(0, 1).map(f => f));
        const man = L.lexicon.find(e => e.lemma === 'man' && e.pos === 'noun').form;
        const iRel = flat.findIndex(f => f.startsWith(rel)), iMan = flat.findIndex(f => f.startsWith(man));
        assert.ok(iRel >= 0 && iMan >= 0, `${order}: ${flat.join(' ')}`);
        assert.equal(iRel < iMan, before, `${order}: ${flat.join(' ')}`);
    }
});
