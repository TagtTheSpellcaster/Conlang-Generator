import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { inflect, attach } from '../src/morphology/inflect.js';
import { personCells } from '../src/morphology/affixes.js';
import { tokenText, realize } from '../src/syntax/realize.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = (input = {}) => generateLanguage({ seed: 'agg', articles: 'none', relations: 'cases', ...input }, vocabulary, templates, derivations);
const morphOf = L => ({ spec: L.spec, model: L.morphology.model, affixes: L.morphology.affixes });
const word = (L, id) => L.lexicon.find(e => e.id === id);

const flat = ts => ts.flatMap(t => t.kind === 'alts' ? t.options.flatMap(flat) : [t]);
const verbTokens = s => flat(s.tokens).filter(t => t.id?.startsWith('verb.'));
const verbToken = s => verbTokens(s)[0];
const kinds = t => t.parts.map(p => p.kind);
const langOf = L => ({ spec: L.spec, model: L.morphology.model, affixes: L.morphology.affixes, lexicon: L.lexicon });
const P1 = 'pronoun.first_person_singular', P2O = 'pronoun.second_person_singular_object';
// fixed sentence frames (the shipped sentences use alternatives, which these checks do not want)
const FRAMES = {
    'You cannot enter.': { S: { head: 'pronoun.second_person_singular' }, V: { head: 'enter:verb', neg: true, aux: 'can:particle' } },
    'Come here.': { mood: 'imperative', seq: ['V', 'O'], V: { head: 'come:verb' }, O: { head: 'here:adverb' } },
    'Yesterday I came.': { tense: 'past', seq: ['initial', 'S', 'V'], initial: [{ head: 'yesterday:noun' }], S: { head: P1 }, V: { head: 'come:verb' } },
    'Tomorrow we travel.': { tense: 'future', seq: ['initial', 'S', 'V'], initial: [{ head: 'tomorrow:noun' }], S: { head: 'pronoun.first_person_plural' }, V: { head: 'travel:verb' } },
    'I hear you.': { S: { head: P1 }, V: { head: 'hear:verb' }, O: { head: P2O } },
    'The good dog sees the small bird.': { S: { head: 'dog:noun', det: 'definite', adj: 'good:adjective' }, V: { head: 'see:verb' }, O: { head: 'bird:noun', det: 'definite', adj: 'small:adjective' } }
};
const sample = (L, en) => realize({ id: 'x', en, ...FRAMES[en] }, langOf(L));
const mySisterIsGood = { id: 'x', en: 'My sister is good.', S: { head: 'sister:noun', poss: 'my:determiner' }, V: { head: 'be:verb' }, O: { head: 'good:adjective' } };

test('agglutinative verbs are inflected: person, number and tense each have their own suffix', () => {
    const L = gen({ morphology: 'agglutinative' }), m = morphOf(L), see = word(L, 'verb.see');
    const forms = new Set();
    for (const tense of ['present', 'past', 'future']) for (const cell of personCells(L.spec)) {
        const [person, number] = cell.split('.');
        forms.add(inflect(see, { tense, person: Number(person), number }, m).form);
    }
    assert.equal(forms.size, 3 * personCells(L.spec).length, 'every tense x person x number cell is distinct');
    const v = L.morphology.affixes.verb;
    assert.equal(v.mode, 'agglutinative');
    assert.equal(v.tense.present, '');
    assert.equal(v.agreement['3.singular'], '');
});

test('suffix order is stem - potential - negation - tense - agreement, and the form is the plain concatenation', () => {
    const L = gen({ morphology: 'agglutinative' }), m = morphOf(L), enter = word(L, 'verb.enter');
    const r = inflect(enter, { tense: 'past', person: 1, number: 'plural', negative: true, potential: true }, m);
    assert.deepEqual(r.parts.map(p => p.kind), ['stem', 'potential', 'negation', 'tense', 'agreement']);
    assert.equal(r.form, r.parts.map(p => p.text).join(''));
    assert.ok(r.form.startsWith(enter.form));
    const imp = inflect(enter, { imperative: true, negative: true }, m);
    assert.deepEqual(imp.parts.map(p => p.kind), ['stem', 'negation', 'mood']);
});

test('agglutinative negation, ability and mood are suffixes, not separate words', () => {
    const L = gen({ morphology: 'agglutinative' });
    const neg = sample(L, 'You cannot enter.'), tokens = neg.tokens.map(t => t.id);
    assert.deepEqual(tokens.filter(Boolean), ['verb.enter']);
    assert.deepEqual(kinds(verbToken(neg)).slice(0, 3), ['stem', 'potential', 'negation']);
    assert.ok(kinds(verbToken(sample(L, 'Come here.'))).includes('mood'));
    assert.ok(kinds(verbToken(sample(L, 'Yesterday I came.'))).includes('tense'));
    assert.ok(verbToken(sample(L, 'Tomorrow we travel.')).parts.some(p => p.kind === 'tense' && p.meaning === 'future'));
});

test('pro-drop: a personal pronoun subject is carried by the verb ending, a noun subject stays', () => {
    const L = gen({ morphology: 'agglutinative' }), I = word(L, 'pronoun.first_person_singular').form;
    const s = sample(L, 'I hear you.');
    assert.ok(!s.tokens.some(t => t.id === 'pronoun.first_person_singular'));
    assert.ok(verbToken(s).parts.some(p => p.kind === 'agreement' && p.meaning === '1.singular'));
    assert.ok(!tokenText(s.tokens).split(' ').includes(I));
    const noun = sample(L, 'The good dog sees the small bird.');
    assert.ok(noun.tokens.some(t => t.kind === 'alts' || t.id?.startsWith('nature.dog')));
    assert.equal(L.syntax.prodrop, true);
    // isolating languages keep the pronoun
    const I2 = gen({ morphology: 'isolating' });
    assert.ok(sample(I2, 'I hear you.').tokens.some(t => t.id === 'pronoun.first_person_singular'));
    assert.equal(I2.syntax.prodrop, false);
});

test('possessors are suffixes on the noun in agglutinative languages, separate words in fusional ones', () => {
    const A = gen({ morphology: 'agglutinative' }), F = gen({ morphology: 'fusional' });
    const a = realize(mySisterIsGood, langOf(A)), f = realize(mySisterIsGood, langOf(F));
    const sister = a.tokens.find(t => t.id === 'family.sister');
    assert.ok(sister.parts.some(p => p.kind === 'possessor' && p.meaning === 'poss.1.singular'));
    assert.ok(!a.tokens.some(t => t.id === 'function.my'));
    assert.ok(f.tokens.some(t => t.id === 'function.my'));
    const order = sister.parts.map(p => p.kind);
    assert.ok(order.indexOf('possessor') < order.indexOf('case') || !order.includes('case'));
});

test('fusional verbs: one portmanteau ending per tense x person x number; negation stays a particle', () => {
    const L = gen({ morphology: 'fusional' }), v = L.morphology.affixes.verb;
    assert.equal(v.mode, 'fusional');
    const cells = Object.values(v.fused).flatMap(t => Object.values(t));
    assert.equal(cells.length, 3 * personCells(L.spec).length);
    assert.equal(new Set(cells).size, cells.length, 'all cells distinct (one of them is the empty, unmarked ending)');
    assert.equal(cells.filter(c => c === '').length, 1);
    const neg = sample(L, 'You cannot enter.');
    assert.ok(neg.tokens.some(t => t.id === 'logic.not'));
    assert.ok(verbToken(sample(L, 'I hear you.')).parts.some(p => p.kind === 'fused'));
});

test('dual adds dual agreement cells', () => {
    const L = gen({ morphology: 'agglutinative', number: 'singular-plural-dual' });
    assert.ok(Object.keys(L.morphology.affixes.verb.agreement).includes('1.dual'));
    assert.equal(personCells(L.spec).length, 9);
});

test('verbs in agglutinative sentences carry suffix chains; isolating verbs stay bare', () => {
    const A = gen({ morphology: 'agglutinative' }), I = gen({ morphology: 'isolating' });
    const verbs = L => L.samples.flatMap(verbTokens);
    const va = verbs(A), vi = verbs(I);
    const affixed = va.filter(t => t.parts.length > 1).length;
    assert.ok(affixed >= va.length / 2, `${affixed} of ${va.length} verbs carry suffixes`);
    assert.ok(va.some(t => t.parts.length >= 4), 'at least one verb with three or more suffixes');
    assert.ok(vi.every(t => t.parts.length === 1));
    const total = ts => ts.reduce((n, t) => n + t.form.length, 0);
    assert.ok(total(va) > total(vi));
});

test('all affixes (nominal, possessive, verbal) are unique and never collide with roots', () => {
    for (const morphology of ['agglutinative', 'fusional']) for (const consonants of ['isolated', 'european', 'semitic']) {
        const L = gen({ morphology, consonants, number: 'singular-plural-dual', gender: 'masculine-feminine-neuter', caseSystem: 'extensive' });
        const a = L.morphology.affixes, all = [];
        const collect = x => { if (typeof x === 'string') { if (x) all.push(x); } else if (x && typeof x === 'object') Object.values(x).forEach(collect); };
        collect({ ...a, numberMarkers: { plural: a.numberMarkers.plural, dual: a.numberMarkers.dual } });
        const roots = new Set(L.lexicon.map(e => e.form));
        assert.equal(new Set(all).size, all.length, `${morphology} ${consonants}`);
        for (const x of all) assert.ok(!roots.has(x), `${x} collides with a root`);
    }
});

test('junction: a linking vowel is inserted only when the consonant run would be illegal', () => {
    const { spec } = generateLanguage({ seed: 'j', consonants: 'european', morphology: 'agglutinative' }, vocabulary, templates, derivations);
    assert.equal(attach('kar', 'ta', spec), 'ta');        // r+t is a legal coda+onset
    assert.equal(attach('karkt', 'ta', spec), 'ata');     // rkt+t is not
    assert.equal(attach('kara', 'ta', spec), 'ta');       // vowel-final stems never need a linker
    assert.equal(attach('kar', 'a', spec), 'a');
});
