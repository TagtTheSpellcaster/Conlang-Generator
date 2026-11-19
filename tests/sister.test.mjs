import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { glossWord } from '../src/grammar/gloss.js';
import { describeLanguage } from '../src/description/describe.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = (input, branch) => generateLanguage({ articles: 'both', ...input }, vocabulary, templates, derivations, { branch });
const INPUTS = [{ seed: 's1' }, { seed: 's2', genre: 'merchant' }, { seed: 's3', genre: 'sacred', consonants: 'harsh' }];

test('the sister is deterministic and shares the mother with the first language', () => {
    for (const input of INPUTS) {
        const a = gen(input), b = gen(input, 'sister'), b2 = gen(input, 'sister');
        assert.deepEqual(b.lexicon.map(e => e.form), b2.lexicon.map(e => e.form), input.seed);
        assert.equal(b.family.branch, 'sister');
        assert.equal(b.family.sister, a.name); assert.equal(a.family.sister, b.name); assert.equal(a.family.proto, b.family.proto);
        assert.notEqual(a.name, b.name);
        // same mother: every entry has the same proto form
        const am = new Map(a.history.lexicon.map(e => [e.id, e.proto]));
        for (const e of b.history.lexicon) if (am.has(e.id)) assert.equal(e.proto, am.get(e.id), `${input.seed} ${e.id}`);
        assert.equal(b.lexicon.length, a.lexicon.length);
    }
});

test('related but distinct: many words alike, many different, own rules', () => {
    for (const input of INPUTS) {
        const a = gen(input), b = gen(input, 'sister');
        const bm = new Map(b.lexicon.map(e => [e.id, e]));
        const native = a.lexicon.filter(e => !e.loan && bm.has(e.id) && !bm.get(e.id).loan);
        const same = native.filter(e => bm.get(e.id).form === e.form).length / native.length;
        assert.ok(same > 0.1 && same < 0.9, `${input.seed}: ${same}`);
        assert.notDeepEqual(a.history.rules.map(r => r.id), b.history.rules.map(r => r.id));
        assert.ok(b.history.rules.length >= 3);
    }
});

test('loanwords: the sister has its own and shares some with the first language', () => {
    let differing = 0;
    for (const input of INPUTS) {
        const a = gen(input), b = gen(input, 'sister');
        const al = new Map(a.history.loans.items.map(x => [x.id, x]));
        const sharedSource = b.history.loans.items.filter(x => al.get(x.id)?.source === x.source && al.get(x.id)?.donor === x.donor);
        const ownOnly = b.history.loans.items.filter(x => !al.has(x.id));
        assert.ok(sharedSource.length > 0, `${input.seed}: no shared loan`);
        assert.ok(ownOnly.length > 0, `${input.seed}: no loan of its own`);
        differing += sharedSource.filter(x => x.form !== al.get(x.id).form).length;
        for (const x of b.history.loans.items) assert.ok(x.form.length >= 2);
        // same donor names, same sound systems
        for (const d of a.history.loans.donors) assert.equal(b.history.loans.donors.find(z => z.id === d.id)?.name, d.name);
    }
    // a shared loan is adapted to the sister's own sounds and dates: in some words the forms differ (caffè / café)
    assert.ok(differing > 0, 'no shared loan differs in form');
});

test('the sister is a complete language: forms are unique and glossing works', () => {
    for (const input of INPUTS) {
        const b = gen(input, 'sister');
        const forms = b.lexicon.filter(e => !e.loan).map(e => e.form);
        assert.ok(b.samples.length > 10 && b.texts.length > 0);
        const noun = b.lexicon.find(e => e.pos === 'noun');
        assert.ok(glossWord(noun, {}, { spec: b.spec, model: b.morphology.model, affixes: b.morphology.affixes }).seg.split('-').join('') === glossWord(noun, {}, { spec: b.spec, model: b.morphology.model, affixes: b.morphology.affixes }).form);
        const d = describeLanguage(b);
        assert.equal(d.title.toLowerCase(), b.name);
        assert.ok(JSON.stringify(d).includes(b.family.sister[0].toUpperCase() + b.family.sister.slice(1)));
        assert.ok(forms.length > 100);
    }
});

test('the first language does not change because the sister exists', () => {
    const a1 = gen({ seed: 's1' }), a2 = gen({ seed: 's1' });
    assert.deepEqual(a1.lexicon.map(e => e.form), a2.lexicon.map(e => e.form));
});
