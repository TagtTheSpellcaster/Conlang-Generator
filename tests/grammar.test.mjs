import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { tokenText, realize } from '../src/syntax/realize.js';
import { inflect } from '../src/morphology/inflect.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = (input = {}) => generateLanguage({ seed: 'grammar', articles: 'none', ...input }, vocabulary, templates, derivations);
const langOf = L => ({ spec: L.spec, model: L.morphology.model, affixes: L.morphology.affixes, lexicon: L.lexicon });
const flat = ts => ts.flatMap(t => t.kind === 'alts' ? t.options.flatMap(flat) : [t]);
const ids = r => flat(r.tokens).map(t => t.id);
const P = (c, p = 'noun') => ({ head: c + ':' + p });
const YOU = { head: 'pronoun.second_person_singular' }, I = { head: 'pronoun.first_person_singular' }, HE = { head: 'pronoun.third_person_singular_male' };

const Q = { id: 'q', en: 'Do you understand?', q: 'yesno', S: YOU, V: { head: 'understand:verb' } };

for (const order of ['SOV', 'SVO', 'VSO']) {
    test(`question particle goes at the end of head-final languages and at the start otherwise (${order})`, () => {
        const L = gen({ order });
        const r = realize(Q, langOf(L));
        const finalLang = order.indexOf('V') > order.indexOf('O');
        const pos = ids(r).indexOf('grammar.question_particle');
        assert.equal(pos, finalLang ? ids(r).length - 1 : 0);
    });
}

test('optative: a suffix in agglutinative languages, the word "may" otherwise; the tense is not marked', () => {
    const t = { id: 'o', en: 'May you live.', mood: 'optative', S: YOU, V: { head: 'live:verb' } };
    const A = gen({ morphology: 'agglutinative' }), I_ = gen({ morphology: 'isolating' }), F = gen({ morphology: 'fusional' });
    const a = realize(t, langOf(A));
    assert.ok(flat(a.tokens)[0].parts.some(p => p.kind === 'mood' && p.meaning === 'optative'));
    assert.ok(!ids(a).includes('function.may'));
    assert.ok(!flat(a.tokens)[0].parts.some(p => p.kind === 'tense'));
    for (const L of [I_, F]) assert.ok(ids(realize(t, langOf(L))).includes('function.may'));
});

test('aspect: suffix between negation and tense; separate marker word elsewhere', () => {
    const t = asp => ({ id: 'a', en: 'x', S: I, V: { head: 'eat:verb', aspect: asp, neg: true } });
    const A = gen({ morphology: 'agglutinative' });
    const kinds = flat(realize(t('progressive'), langOf(A)).tokens).find(x => x.id === 'verb.eat').parts.map(p => p.kind);
    assert.deepEqual(kinds, ['stem', 'negation', 'aspect', 'tense', 'agreement'].filter(k => kinds.includes(k)));
    assert.ok(kinds.includes('aspect'));
    for (const m of ['isolating', 'fusional']) {
        const L = gen({ morphology: m });
        assert.ok(ids(realize(t('progressive'), langOf(L))).includes('grammar.progressive_marker'));
        assert.ok(ids(realize(t('perfect'), langOf(L))).includes('grammar.perfect_marker'));
    }
});

test('comparative: suffix on the adjective (agglutinative) or the word "more"; the standard uses the ablative or "than"', () => {
    const t = { id: 'c', en: 'x', S: { head: 'road:noun' }, V: { head: 'be:verb' }, O: { head: 'long:adjective', degree: 'comparative' }, A: { adp: 'than:conjunction', case: 'ablative', np: { head: 'river:noun' } } };
    const A = gen({ morphology: 'agglutinative', relations: 'prepositions' });
    const a = realize(t, langOf(A));
    assert.ok(flat(a.tokens).find(x => x.id === 'adjective.long').parts.some(p => p.kind === 'degree'));
    assert.ok(ids(a).includes('function.than'));
    const I_ = realize(t, langOf(gen({ morphology: 'isolating' })));
    assert.ok(ids(I_).includes('grammar.more'));
    const C = gen({ morphology: 'agglutinative', relations: 'cases', caseSystem: 'extensive' });
    const c = realize(t, langOf(C));
    assert.ok(!ids(c).includes('function.than'), 'ablative languages mark the standard with the case');
});

test('subordinate clauses: complement fills the object slot; adverbial clause first in head-final, last otherwise', () => {
    const comp = { id: 's', en: 'x', S: I, V: { head: 'know:verb' }, comp: { conj: 'that:conjunction', clause: { S: HE, V: { head: 'come:verb' } } } };
    const adv = { id: 'b', en: 'x', S: I, V: { head: 'come:verb' }, adv: { conj: 'because:conjunction', clause: { S: I, V: { head: 'sleep:verb' } } } };
    const sov = langOf(gen({ order: 'SOV', morphology: 'isolating' })), svo = langOf(gen({ order: 'SVO', morphology: 'isolating' }));
    // head-final: [clause that] know ; the adverbial clause precedes the main clause
    const c1 = ids(realize(comp, sov));
    assert.deepEqual(c1.filter(x => ['grammar.that', 'verb.know', 'verb.come'].includes(x)), ['verb.come', 'grammar.that', 'verb.know']);
    const b1 = ids(realize(adv, sov));
    assert.ok(b1.indexOf('logic.because') < b1.indexOf('verb.come') && b1.indexOf('verb.sleep') < b1.indexOf('logic.because'));
    // head-initial: know that [clause] ; adverbial clause last, subordinator first
    const c2 = ids(realize(comp, svo));
    assert.deepEqual(c2.filter(x => ['grammar.that', 'verb.know', 'verb.come'].includes(x)), ['verb.know', 'grammar.that', 'verb.come']);
    const b2 = ids(realize(adv, svo));
    assert.ok(b2.indexOf('verb.come') < b2.indexOf('logic.because') && b2.indexOf('logic.because') < b2.indexOf('verb.sleep'));
});

test('the new grammar leaves the older affixes unchanged and every language carries the function words it needs', () => {
    for (const morphology of ['isolating', 'agglutinative', 'fusional']) {
        const L = gen({ morphology });
        const have = new Set(L.lexicon.map(e => e.id));
        for (const id of ['grammar.question_particle', 'grammar.progressive_marker', 'grammar.perfect_marker', 'grammar.more', 'grammar.that', 'function.may', 'function.than']) assert.ok(have.has(id), `${morphology}: ${id}`);
        assert.equal(L.skippedSamples.length, 0, `${morphology}: no skipped sentences`);
    }
});

test('shipped grammar sentences realise in every morphology', () => {
    const wanted = ['Do you understand?', 'May you live.', 'I know that [he|she] is [here|good].', 'If you come, I help you.', 'I am [eating|drinking|sleeping].', 'I have [arrived|eaten|slept].', 'This is [better|worse] than that.'];
    for (const morphology of ['isolating', 'agglutinative', 'fusional']) {
        const L = gen({ morphology });
        for (const en of wanted) {
            const s = L.samples.find(x => x.english === en);
            assert.ok(s, `${morphology}: ${en}`);
            assert.ok(tokenText(s.tokens).length > 0 && !tokenText(s.tokens).includes('undefined'));
        }
    }
});

test('inflect: optative and aspect features are ignored by morphologies without those suffixes', () => {
    const L = gen({ morphology: 'fusional' });
    const verb = L.lexicon.find(e => e.id === 'verb.eat' || e.lemma === 'eat' && e.pos === 'verb');
    const plain = inflect(verb, { person: 3 }, { spec: L.spec, model: L.morphology.model, affixes: L.morphology.affixes });
    const asp = inflect(verb, { person: 3, aspect: 'perfect', optative: true }, { spec: L.spec, model: L.morphology.model, affixes: L.morphology.affixes });
    assert.equal(plain.form, asp.form);
});
