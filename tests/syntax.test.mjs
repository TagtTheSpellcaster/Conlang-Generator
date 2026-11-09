import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { realize, tokenText, buildIndex, adpositionPosition } from '../src/syntax/realize.js';
import { inflect, genderOf } from '../src/morphology/inflect.js';
import { vocabulary, templates, refsOf } from './helpers.mjs';

const byId = new Map(vocabulary.map(e => [e.id, e]));
const gen = (input = {}) => generateLanguage({ seed: 'syn', articles: 'both', ...input }, vocabulary, templates);
const lang = L => ({ spec: L.spec, model: L.morphology.model, affixes: L.morphology.affixes, lexicon: L.lexicon });
const T = (en, o) => ({ id: 'x', en, ...o });
const word = (L, id) => L.lexicon.find(e => e.id === id);
const I = 'pronoun.first_person_singular', YOU_O = 'pronoun.second_person_singular_object';
const see = { S: { head: I }, V: { head: 'see:verb' }, O: { head: 'wolf:noun', det: 'definite' } };

test('template coverage: every referenced sense exists, is unambiguous and belongs to the core tier', () => {
    const index = buildIndex(vocabulary);
    const problems = [];
    for (const t of templates) {
        assert.ok(t.en && t.id, 'template needs id and english');
        const refs = refsOf(t);
        assert.ok(refs.length, `${t.id} has no word references`);
        for (const ref of refs) {
            const e = index.resolve(ref);
            if (!e) { problems.push(`${t.id}: ${ref} not found`); continue; }
            if (e.tier !== 'core') problems.push(`${t.id}: ${ref} (${e.id}) is ${e.tier}, not core`);
            if (!ref.includes('.')) {
                const [lemma, pos] = ref.split(':');
                const same = vocabulary.filter(x => x.lemma.toLowerCase() === lemma && x.pos === pos && !x.gloss && x.tier === 'core');
                if (same.length > 1) problems.push(`${t.id}: ${ref} is ambiguous (${same.map(x => x.id).join(', ')}) — use the sense id`);
            }
        }
        for (const d of ['definite', 'indefinite']) JSON.stringify(t).includes(`"det":"${d}"`) && assert.ok(index.resolve(d === 'definite' ? 'the:determiner' : 'a:determiner'));
    }
    assert.deepEqual(problems, []);
});

test('template ids are unique and english sentences do not repeat', () => {
    assert.equal(new Set(templates.map(t => t.id)).size, templates.length);
    assert.equal(new Set(templates.map(t => t.en)).size, templates.length);
});

test('default language realises every template that applies (none skipped)', () => {
    const L = gen({ number: 'singular-plural-dual', gender: 'masculine-feminine' });
    assert.deepEqual(L.skippedSamples, []);
    assert.equal(L.samples.length, templates.length);
});

test('number-dependent templates are only used when the language has that number', () => {
    assert.equal(gen({ number: 'singular' }).samples.length, templates.length - 2);
    assert.equal(gen({ number: 'singular-plural' }).samples.length, templates.length - 1);
});

test('a template with a missing concept is skipped and reported, never emitted with holes', () => {
    const L = gen();
    const t = T('The unicorn runs.', { S: { head: 'unicorn:noun' }, V: { head: 'go:verb' } });
    const r = realize(t, lang(L));
    assert.equal(r.skipped, 'missing'); assert.equal(r.missing, 'unicorn:noun');
    const partial = realize(T('x', { S: { head: I }, V: { head: 'see:verb' }, O: { head: ['wolf:noun', 'unicorn:noun'] } }), lang(L));
    assert.ok(!partial.skipped); assert.deepEqual(partial.partial, ['unicorn:noun']);
    assert.ok(!tokenText(partial.tokens).includes('undefined'));
});

test('word order follows the language for the S, V, O slots', () => {
    const forms = order => {
        const L = gen({ order }); const r = realize(T('x', { S: { head: I }, V: { head: 'see:verb' }, O: { head: YOU_O } }), lang(L));
        const f = id => word(L, id).form;
        return { text: tokenText(r.tokens), s: f(I), v: f('verb.see'), o: f(YOU_O) };
    };
    for (const order of ['SVO', 'SOV', 'VSO', 'VOS', 'OSV', 'OVS']) {
        const { text, s, v, o } = forms(order);
        assert.equal(text, order.split('').map(k => ({ S: s, V: v, O: o }[k])).join(' '), order);
    }
});

test('adposition position follows verb-object order (prepositions with VO, postpositions with OV)', () => {
    assert.equal(adpositionPosition('SVO'), 'before'); assert.equal(adpositionPosition('VSO'), 'before'); assert.equal(adpositionPosition('VOS'), 'before');
    assert.equal(adpositionPosition('SOV'), 'after'); assert.equal(adpositionPosition('OSV'), 'after'); assert.equal(adpositionPosition('OVS'), 'after');
    const pp = { S: { head: I }, V: { head: 'go:verb' }, O: { adp: 'to:adposition', case: 'dative', np: { head: 'village:noun' } } };
    for (const [order, pos] of [['SVO', 'before'], ['SOV', 'after']]) {
        const L = gen({ order, articles: 'none' }); const r = realize(T('x', pp), lang(L));
        const to = word(L, 'function.to').form, village = word(L, 'settlement.village').form;
        const pair = tokenText(r.tokens).split(' ').filter(w => w === to || w.startsWith(village));
        assert.equal(pair[0] === to, pos === 'before', order);
    }
});

test('case-marked languages use endings instead of adpositions; prepositional ones use the adposition', () => {
    const t = T('x', { S: { head: I }, V: { head: 'go:verb' }, O: { adp: 'to:adposition', case: 'dative', np: { head: 'village:noun' } } });
    const cases = gen({ relations: 'cases', articles: 'none' }), prep = gen({ relations: 'prepositions', articles: 'none' });
    assert.ok(!tokenText(realize(t, lang(cases)).tokens).includes(word(cases, 'function.to').form));
    assert.ok(tokenText(realize(t, lang(prep)).tokens).includes(word(prep, 'function.to').form));
    const ending = cases.morphology.affixes.caseEndings.dative;
    assert.ok(tokenText(realize(t, lang(cases)).tokens).endsWith(word(cases, 'settlement.village').form + ending));
    // minimal case systems have no dative: fall back to the adposition
    const minimal = gen({ relations: 'cases', caseSystem: 'minimal', articles: 'none' });
    assert.ok(tokenText(realize(t, lang(minimal)).tokens).includes(word(minimal, 'function.to').form));
    // mixed: oblique cases keep the adposition
    const mixed = gen({ relations: 'mixed', caseSystem: 'extensive', articles: 'none' });
    assert.ok(tokenText(realize(t, lang(mixed)).tokens).includes(word(mixed, 'function.to').form));
});

test('accusative alignment: S nominative, O accusative; intransitive S nominative', () => {
    const L = gen({ relations: 'cases', caseSystem: 'moderate', articles: 'none' });
    const acc = L.morphology.affixes.caseEndings.accusative;
    const wolf = word(L, 'animal.wolf').form;
    const tr = tokenText(realize(T('x', { S: { head: I }, V: { head: 'see:verb' }, O: { head: 'wolf:noun' } }), lang(L)).tokens);
    assert.ok(tr.endsWith(wolf + acc));
    const intr = tokenText(realize(T('x', { S: { head: 'wolf:noun' }, V: { head: 'sleep:verb' } }), lang(L)).tokens);
    assert.ok(intr.startsWith(wolf + ' ') && !intr.startsWith(wolf + acc));
});

test('ergative alignment: transitive S ergative, intransitive S and O absolutive', () => {
    const L = gen({ relations: 'ergative', caseSystem: 'moderate', articles: 'none' });
    const erg = L.morphology.affixes.caseEndings.ergative, wolf = word(L, 'animal.wolf').form;
    const tr = tokenText(realize(T('x', { S: { head: 'wolf:noun' }, V: { head: 'see:verb' }, O: { head: 'hunter:noun' } }), lang(L)).tokens);
    assert.ok(tr.startsWith(wolf + erg + ' '), tr);
    assert.ok(tr.endsWith(word(L, 'society.hunter').form), 'object is absolutive (unmarked)');
    const intr = tokenText(realize(T('x', { S: { head: 'wolf:noun' }, V: { head: 'sleep:verb' } }), lang(L)).tokens);
    assert.equal(intr.split(' ')[0], wolf);
    assert.equal(L.morphology.model.alignment, 'ergative-absolutive');
});

test('object-form pronouns are not case-marked again', () => {
    const L = gen({ relations: 'cases', articles: 'none' });
    const r = tokenText(realize(T('x', { S: { head: 'wolf:noun' }, V: { head: 'see:verb' }, O: { head: YOU_O } }), lang(L)).tokens);
    assert.ok(r.endsWith(word(L, YOU_O).form));
});

test('adjective position and agreement with the noun', () => {
    const t = T('x', { S: { head: I }, V: { head: 'see:verb' }, O: { head: 'house:noun', adj: 'small:adjective' } });
    for (const adjPosition of ['before', 'after']) {
        const L = gen({ adjPosition, articles: 'none', gender: 'masculine-feminine' });
        const noun = word(L, 'object.house'), adj = word(L, 'adjective.small');
        const g = genderOf(noun, L.spec), ending = L.morphology.affixes.genderEndings[g];
        const out = tokenText(realize(t, lang(L)).tokens).split(' ');
        const iNoun = out.findIndex(w => w.startsWith(noun.form)), iAdj = out.findIndex(w => w === adj.form + ending);
        assert.ok(iNoun >= 0 && iAdj >= 0, out.join(' '));
        assert.equal(iAdj < iNoun, adjPosition === 'before');
    }
});

test('gender is assigned deterministically, differs between nouns, and agreement shows it', () => {
    const L = gen({ gender: 'masculine-feminine-neuter' });
    const genders = L.lexicon.filter(e => e.pos === 'noun').slice(0, 60).map(e => genderOf(e, L.spec));
    assert.ok(new Set(genders).size === 3);
    assert.deepEqual(genders, L.lexicon.filter(e => e.pos === 'noun').slice(0, 60).map(e => genderOf(e, L.spec)));
    assert.equal(genderOf(word(L, 'object.house'), gen({ gender: 'none' }).spec), null);
});

test('inflect: noun paradigm cells are all different; prefix mode puts the number marker first', () => {
    const L = gen({ relations: 'cases', caseSystem: 'extensive', number: 'singular-plural-dual', plural: 'suffix' });
    const morph = { spec: L.spec, model: L.morphology.model, affixes: L.morphology.affixes };
    const noun = word(L, 'object.house');
    const forms = [];
    for (const number of L.spec.numbers) for (const c of L.morphology.model.cases) forms.push(inflect(noun, { number, case: c }, morph).form);
    assert.equal(new Set(forms).size, forms.length);
    const P = gen({ plural: 'prefix', relations: 'prepositions' });
    const pm = { spec: P.spec, model: P.morphology.model, affixes: P.morphology.affixes };
    const f = inflect(word(P, 'object.house'), { number: 'plural' }, pm);
    assert.ok(f.form.startsWith(P.morphology.affixes.numberMarkers.plural));
    assert.equal(f.parts[0].kind, 'number');
});

test('inflect leaves uninflected parts of speech and isolating languages alone', () => {
    const L = gen({ relations: 'cases' });
    const morph = { spec: L.spec, model: L.morphology.model, affixes: L.morphology.affixes };
    const verb = word(L, 'verb.eat');
    assert.equal(inflect(verb, { number: 'plural', case: 'accusative' }, morph).form, verb.form);
    const I2 = gen({ morphology: 'isolating' });
    const noun = word(I2, 'object.house');
    assert.equal(inflect(noun, { number: 'plural' }, { spec: I2.spec, model: I2.morphology.model, affixes: I2.morphology.affixes }).form, noun.form);
});

test('negation and auxiliary come before the verb; imperatives and questions use fixed orders', () => {
    const L = gen({ order: 'SOV', articles: 'none' });
    const f = id => word(L, id).form;
    const neg = tokenText(realize(T('x', { S: { head: 'pronoun.second_person_singular' }, V: { head: 'enter:verb', neg: true, aux: 'can:particle' } }), lang(L)).tokens);
    assert.equal(neg, [f('pronoun.second_person_singular'), f('logic.not'), f('function.can'), f('verb.enter')].join(' '));
    const q = templates.find(t => t.en === 'Who are you?');
    assert.equal(tokenText(realize(q, lang(L)).tokens), [f('interrogative.who'), f('verb.be'), f('pronoun.second_person_singular')].join(' '));
    const imp = templates.find(t => t.en === 'Stay here.');
    assert.equal(tokenText(realize(imp, lang(L)).tokens), [f('verb.stay'), f('space.here')].join(' '));
});
