import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { semanticsHtml, lexiconHtml, dictionaryHtml } from '../src/ui/render.js';
import { PAIRS, KINSHIP } from '../src/semantics/colex.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = (seed, extra = {}) => generateLanguage({ seed, ...extra }, vocabulary, templates, derivations);
const SEEDS = ['sm1', 'sm2', 'sm3', 'sm4', 'sm5', 'sm6'];

test('semantics: an extended sense has exactly the form (and mother form) of its original sense; both are in the lexicon', () => {
    let pairs = 0;
    for (const seed of SEEDS) {
        const L = gen(seed), byId = new Map(L.lexicon.map(e => [e.id, e]));
        for (const e of L.lexicon.filter(x => x.colex)) {
            const A = byId.get(e.colex.with);
            assert.ok(A, `${seed}: head of ${e.id} is present`);
            assert.equal(e.form, A.form);
            assert.equal(e.protoForm, A.protoForm);
            assert.ok(A.colexHeads?.includes(e.id));
            assert.ok(!A.colex, 'no chains: a head is not itself an extension');
            pairs++;
        }
        const own = L.lexicon.filter(e => !e.colex).map(e => e.form);
        assert.equal(new Set(own).size, own.length, `${seed}: all other forms stay unique`);
    }
    assert.ok(pairs >= 15, `polysemy appears: ${pairs}`);
});

test('semantics: deterministic, independent of the derivation rules, and drawn from the catalogue, colour stages and kinship types', () => {
    const a = gen('sm1'), b = gen('sm1');
    assert.deepEqual(a.semantics, b.semantics);
    const catalog = new Set(PAIRS.map(p => `${p[0]}>${p[1]}`));
    for (const seed of SEEDS) {
        const L = gen(seed), plain = generateLanguage({ seed }, vocabulary, templates, []);
        for (const p of L.semantics.pairs) assert.ok(catalog.has(`${p.original}>${p.extended}`));
        assert.ok(KINSHIP[L.semantics.kinship.id]);
        assert.ok(L.semantics.colours.terms >= 3 && L.semantics.colours.terms <= 9);
        assert.equal(L.semantics.kinship.id, plain.semantics.kinship.id);
        assert.equal(L.semantics.colours.stage, plain.semantics.colours.stage);
    }
});

test('semantics: shown in the lexicon, dictionary and semantic card; sample sentences still realise', () => {
    const L = gen('sm2');
    const html = semanticsHtml(L);
    assert.ok(html.includes('Semantic structure') && html.includes('Colour terms') && html.includes('Kinship'));
    assert.ok(lexiconHtml(L.lexicon).includes('same word as') || L.semantics.pairs.length + L.semantics.kinshipPairs.length + L.semantics.colourPairs.length === 0);
    assert.ok(dictionaryHtml(L.lexicon, 'conlang-en', '').includes('dict-row'));
    assert.equal(L.skippedSamples.length, 0);
});

test('idioms: about a dozen per language, realised in the language, deterministic, words in the lexicon', () => {
    for (const seed of SEEDS) {
        const L = gen(seed), again = gen(seed);
        const ids = L.semantics.idioms.map(i => i.id);
        assert.ok(ids.length >= 8 && ids.length <= 12, `${seed}: ${ids.length}`);
        assert.deepEqual(ids, again.semantics.idioms.map(i => i.id));
        for (const i of L.semantics.idioms) assert.ok(i.tokens.length >= 2 && i.meaning && i.en, i.id);
    }
    assert.ok(semanticsHtml(gen('sm1')).includes('Figurative expressions'));
});
