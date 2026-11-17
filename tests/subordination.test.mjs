import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { chooseSubordination, SUBORDINATOR_KEYS } from '../src/syntax/subordination.js';
import { toTemplate } from '../src/syntax/frame.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = (seed, extra = {}) => generateLanguage({ seed, ...extra }, vocabulary, templates, derivations);
function find(pred, extra = { morphology: 'agglutinative' }) {
    for (let i = 0; i < 80; i++) { const L = gen(`sub${i}`, extra); if (pred(L)) return L; }
    throw new Error('no language found');
}
const sample = (L, re) => L.samples.find(s => re.test(s.english));
const ids = s => s.tokens.map(t => t.id);
const has = (s, kind) => s.tokens.some(t => t.parts?.some(p => p.kind === kind));

test('subordination: strategies are deterministic, always drawn from the allowed values, and every value occurs', () => {
    const seen = { comp: new Set(), advMode: new Set(), converb: new Set(), reported: new Set(), quotative: new Set() };
    for (let i = 0; i < 150; i++) {
        const spec = { seed: `c${i}`, order: ['SVO', 'SOV', 'VSO'][i % 3], morphology: ['isolating', 'agglutinative', 'fusional'][i % 3 === 0 ? 1 : i % 2] };
        const a = chooseSubordination(spec);
        assert.deepEqual(a, chooseSubordination(spec));
        if (spec.morphology !== 'agglutinative') { assert.equal(a.adverbial.mode, 'word'); assert.equal(a.converb, false); }
        if (a.reported === 'indirect') assert.equal(a.quotative, 'none');
        seen.comp.add(a.complement.mode); seen.advMode.add(a.adverbial.mode); seen.converb.add(a.converb); seen.reported.add(a.reported); seen.quotative.add(a.quotative);
    }
    assert.deepEqual([...seen.comp].sort(), ['none', 'word']);
    assert.deepEqual([...seen.advMode].sort(), ['suffix', 'word']);
    assert.equal(seen.converb.size, 2);
    assert.deepEqual([...seen.reported].sort(), ['both', 'direct', 'indirect']);
    assert.deepEqual([...seen.quotative].sort(), ['none', 'particle']);
});

test('subordination: the suffixes exist exactly when the language uses them', () => {
    for (let i = 0; i < 25; i++) {
        const L = gen(`aff${i}`, { morphology: 'agglutinative' }), sub = L.syntax.subordination, a = L.morphology.affixes.subordinators;
        for (const k of SUBORDINATOR_KEYS) assert.equal(!!a[k], sub.adverbial.mode === 'suffix', `${L.spec.seed} ${k}`);
        assert.equal(!!a.converb, sub.converb);
    }
    assert.equal(gen('aff-fus', { morphology: 'fusional' }).morphology.affixes.subordinators, undefined);
});

test('subordination: an adverbial clause is a verb suffix or a conjunction, as the language decides', () => {
    const suffix = find(L => L.syntax.subordination.adverbial.mode === 'suffix'), s = sample(suffix, /because/);
    assert.ok(s && has(s, 'subordinator'));
    assert.equal(ids(s).includes('logic.because'), false);
    const word = find(L => L.syntax.subordination.adverbial.mode === 'word'), w = sample(word, /because/);
    assert.ok(w && ids(w).includes('logic.because') && !has(w, 'subordinator'));
    // a conjunction without a suffix keeps its word in every language
    const u = sample(suffix, /unless/);
    assert.ok(ids(u).includes('function.unless'));
});

test('subordination: the complementizer is a word or absent, and a control complement has none', () => {
    const none = find(L => L.syntax.subordination.complement.mode === 'none'), yes = find(L => L.syntax.subordination.complement.mode === 'word');
    assert.equal(ids(sample(none, /^I know that/)).includes('grammar.that'), false);
    const k = sample(yes, /^I know that/), idx = ids(k).indexOf('grammar.that');
    assert.ok(idx >= 0);
    for (const L of [none, yes]) {
        const want = sample(L, /^I want to eat/);
        assert.equal(ids(want).includes('grammar.that'), false);
        // the verb of the complement agrees with the subject of "want": same person and number
        const agr = want.tokens.map(t => t.parts?.find(p => p.kind === 'agreement')?.meaning);
        if (agr.some(Boolean)) assert.equal(new Set(agr.filter(Boolean)).size, 1);
    }
});

test('subordination: reported speech follows the language, and the English follows what was done', () => {
    const direct = find(L => L.syntax.subordination.reported === 'direct'), indirect = find(L => L.syntax.subordination.reported === 'indirect'), both = find(L => L.syntax.subordination.reported === 'both');
    assert.ok(sample(direct, /^He said: "I come\."$/) && sample(direct, /^She said: "I am hungry\."$/));
    assert.ok(sample(indirect, /^He said that he came\.$/) && sample(indirect, /^She said that she (was|is) hungry\.$/));
    assert.ok(sample(both, /^He said that he came\.$/) && sample(both, /^She said: "I am hungry\."$/), 'both: each sentence uses the form it prefers');
    const marked = find(L => L.syntax.subordination.quotative === 'particle');
    assert.ok(ids(sample(marked, /^She said: "I am hungry\."$/) ?? sample(marked, /^He said: "I come\."$/)).includes('grammar.quotative_marker'));
    assert.equal(ids(sample(indirect, /^He said that he came\.$/)).includes('grammar.quotative_marker'), false);
});

test('subordination: a converb is a verb suffix without agreement, or the clauses are joined with "and"', () => {
    const flat = s => s.tokens.flatMap(t => t.kind === 'alts' ? t.options.flat() : [t]);
    const kinds = w => (w.parts ?? []).map(p => p.kind);
    const conv = find(L => L.syntax.subordination.converb), s = sample(conv, /walk/), w = flat(s);
    assert.ok(w.some(x => kinds(x).includes('converb')) && !w.some(x => x.id === 'logic.and'));
    const first = w[0];
    assert.ok(kinds(first).includes('converb') && !kinds(first).includes('agreement') && !kinds(first).includes('tense'), 'non-finite');
    const plain = find(L => !L.syntax.subordination.converb), p = flat(sample(plain, /walk/));
    assert.ok(p.some(x => x.id === 'logic.and') && !p.some(x => kinds(x).includes('converb')));
});

test('subordination: frames nest conv, control complements and quotations', () => {
    const t = toTemplate({ pred: { head: 'say:verb' }, roles: { agent: { head: 'man:noun' } }, quote: { prefer: 'direct', indirect: { pred: { head: 'come:verb' }, roles: { agent: { head: 'man:noun' } } }, direct: { pred: { head: 'come:verb' }, roles: { agent: { head: 'pronoun.first_person_singular' } } } } });
    assert.equal(t.quote.prefer, 'direct');
    assert.equal(t.quote.indirect.S.head, 'man:noun');
    assert.equal(t.quote.direct.S.head, 'pronoun.first_person_singular');
    const c = toTemplate({ pred: { head: 'want:verb' }, roles: { agent: { head: 'man:noun' } }, comp: { control: true, frame: { pred: { head: 'eat:verb' }, roles: {} } }, conv: { frame: { pred: { head: 'sing:verb' }, roles: {} } } });
    assert.equal(c.comp.control, true);
    assert.equal(c.comp.clause.S, undefined);
    assert.equal(c.conv.clause.V.head, 'sing:verb');
});

test('subordination: the text uses the constructions and stays complete in every language', () => {
    for (const reported of ['direct', 'indirect']) {
        const L = find(l => l.syntax.subordination.reported === reported && l.texts.some(t => t.id === 'farmer-and-fox'), {});
        const t = L.texts.find(x => x.id === 'farmer-and-fox');
        assert.equal(t.lines.length, 7);
        assert.equal(t.lines[6].en, reported === 'direct' ? 'It said: "I am happy."' : `It said that it ${L.syntax.local.tenseSequence === 'absolute' ? 'is' : 'was'} happy.`);
        assert.equal(t.lines[2].en, `He thought that it ${L.syntax.local.tenseSequence === 'absolute' ? 'is' : 'was'} hungry.`);
    }
});

test('subordination: the description reaches the language', () => {
    const L = gen('desc');
    for (const k of ['complement', 'adverbial', 'converb', 'reported', 'quotative']) assert.ok(L.syntax.subordinationText[k], k);
});
