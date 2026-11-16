import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { languageJson } from '../src/export.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = (input = {}) => generateLanguage({ seed: 'his', ...input }, vocabulary, templates, derivations);

test('loanwords: other languages, adapted, unique, never numerals or derived words', () => {
    for (const genre of [undefined, 'war', 'merchant', 'orcish', 'marine']) {
        const L = gen({ seed: `loan-${genre}`, genre });
        const lo = L.history.loans;
        assert.ok(lo.donors.length >= 1 && lo.donors.length <= 3);
        const forms = L.lexicon.filter(e => !e.colex).map(e => e.form);
        assert.equal(new Set(forms).size, forms.length, `${genre}: unique forms`);
        const native = new Set(L.lexicon.filter(e => !e.loan).flatMap(e => [...e.form.replace(/ /g, '')]));
        for (const x of lo.items) {
            const e = L.lexicon.find(y => y.id === x.id);
            assert.ok(e.loan && !e.derivation && !/^number\./.test(e.id), x.id);
            assert.equal(e.form, x.form);
            assert.ok(x.source !== e.protoForm, 'a loan is not the mother word');
            for (const ch of e.form) assert.ok(native.has(ch), `${genre}: ${e.form} has a letter the language does not have (${ch})`);
            assert.ok(x.years <= L.history.rules[0].years + 30, `${x.years}`);
        }
        assert.ok(lo.share <= 0.3, `${genre}: ${lo.share}`);
    }
});

test('loanwords: absorbent languages borrow more than closed ones, and kinds of donor favour different fields', () => {
    const share = genre => { let n = 0; for (let i = 0; i < 6; i++) n += gen({ seed: `abs${i}`, genre }).history.loans.share; return n / 6; };
    assert.ok(share('merchant') > share('orcish') * 2, 'merchant borrows much more than orcish');
    const L = gen({ seed: 'domains', genre: 'war' });
    const war = L.history.loans.items.filter(x => ['war', 'weapon'].includes(x.domain)).length / L.history.loans.items.length;
    const base = L.lexicon.filter(e => ['war', 'weapon'].includes(e.domain)).length / L.lexicon.length;
    assert.ok(war >= base * 0.8, `war fields ${war} vs ${base}`);
});

test('loanwords: deterministic, and part of the export', () => {
    const a = gen({ seed: 'det' }), b = gen({ seed: 'det' });
    assert.deepEqual(a.history.loans.items, b.history.loans.items);
    assert.ok(JSON.parse(languageJson(a)).history.loans.items.length === a.history.loans.items.length);
});

test('sister language: same mother, other changes, examples with traceable derivations', () => {
    for (let i = 0; i < 6; i++) {
        const L = gen({ seed: `sis${i}` });
        const s = L.history.sister;
        const shared = s.rules.filter(r => L.history.rules.some(d => d.id === r.id)).length;
        assert.ok(shared <= 2, `shared ${shared}`);
        assert.ok(s.rules.length >= 2);
        assert.ok(s.examples.length >= 6 && s.examples.length <= 14, `${s.examples.length}`);
        const loaned = new Set(L.history.loans.items.map(x => x.id));
        for (const e of s.examples) {
            assert.ok(!loaned.has(e.id));
            assert.equal((e.daughterSteps.at(-1)?.form ?? e.mother), e.daughter);
            assert.equal((e.sisterSteps.at(-1)?.form ?? e.mother), e.sister);
            assert.equal(L.lexicon.find(x => x.id === e.id).form, e.daughter, 'the daughter column is the language returned');
        }
    }
});
