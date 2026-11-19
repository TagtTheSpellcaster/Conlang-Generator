import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { glossWord, glossOf, ABBREVIATIONS, codesIn } from '../src/grammar/gloss.js';
import { buildGuide } from '../src/grammar/guide.js';
import { GUIDE_TEXTS } from '../src/grammar/texts.js';
import { grammarGuideHtml, grammarTocHtml, abbreviationsHtml } from '../src/ui/render.js';
import { personCells } from '../src/morphology/affixes.js';
import { inflect } from '../src/morphology/inflect.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const make = input => generateLanguage({ articles: 'both', ...input }, vocabulary, templates, derivations);
const SETS = [
    { seed: 'k1', relations: 'cases', morphology: 'agglutinative' },
    { seed: 'k2', relations: 'ergative', morphology: 'agglutinative', gender: 'masculine-feminine-neuter' },
    { seed: 'k3', relations: 'cases', morphology: 'fusional' },
    { seed: 'k4', relations: 'ergative', morphology: 'fusional' },
    { seed: 'k5', morphology: 'isolating' },
    { seed: 'k6', relations: 'prepositions', morphology: 'agglutinative' },
    { seed: 'k7', relations: 'cases', morphology: 'agglutinative', genre: 'sacred' }
];
const morph = L => ({ spec: L.spec, model: L.morphology.model, affixes: L.morphology.affixes });

test('every part that inflect() produces has a gloss, and the segments rebuild the word', () => {
    for (const input of SETS) {
        const L = make(input), m = morph(L);
        const entries = [['noun', 12], ['adjective', 8], ['verb', 12], ['pronoun', 4]].flatMap(([pos, n]) => L.lexicon.filter(e => e.pos === pos).slice(0, n));
        const cells = personCells(L.spec).map(c => { const [p, n] = c.split('.'); return { person: Number(p), number: n }; });
        const featureSets = e => e.pos === 'verb'
            ? [...['present', 'past', 'future'].flatMap(tense => cells.map(c => ({ tense, ...c }))),
                ...['progressive', 'perfect'].map(aspect => ({ tense: 'past', person: 1, number: 'singular', aspect })), { negative: true, potential: true, person: 2, number: 'plural' },
                ...['passive', 'antipassive', 'causative', 'applicative'].map(voice => ({ voice, person: 3, number: 'singular' })), { imperative: true }, { optative: true, person: 3, number: 'singular' }, { converb: true },
                { negative: true, imperative: true, prohibitive: true }, ...['direct', 'reported', 'inferred'].map(evidential => ({ evidential, person: 3, number: 'singular' })),
                ...['reason', 'condition', 'time', 'concession', 'simultaneous'].map(subordinator => ({ subordinator, person: 1, number: 'singular' }))]
            : [{}, ...L.spec.numbers.map(number => ({ number })), ...(L.morphology.model.cases.length ? L.morphology.model.cases.map(c => ({ case: c, number: 'plural' })) : []), { possessor: '1.singular', number: 'plural' }, { additive: true }, { degree: 'comparative' }, ...L.spec.genders.map(gender => ({ gender }))];
        for (const e of entries) for (const f of featureSets(e)) {
            const g = glossWord(e, f, m);
            assert.equal(g.seg.split('-').join(''), g.form, `${input.seed} ${e.id} ${JSON.stringify(f)}`);
            assert.equal(g.gloss.split('-').length, g.parts.length, `${input.seed} ${e.id} ${JSON.stringify(f)}: ${g.gloss}`);
            assert.ok(!/undefined|\?/.test(g.gloss), g.gloss);
            for (const p of g.parts.filter(x => x.kind !== 'stem' && x.kind !== 'stem-alt')) for (const c of codesIn(glossOf(p, e).replace(e.lemma, ''))) assert.ok(ABBREVIATIONS[c], `${p.kind}: ${c}`);
        }
    }
});

test('the additive clitic is the last element of the word and does not change the other parts', () => {
    for (const input of SETS) {
        const L = make(input), m = morph(L), noun = L.lexicon.find(e => e.pos === 'noun' && !e.gloss);
        assert.ok(L.morphology.affixes.additive, input.seed);
        const plain = inflect(noun, { number: 'singular' }, m), added = inflect(noun, { number: 'singular', additive: true }, m);
        if (L.spec.morphology === 'isolating') { assert.equal(added.form, plain.form); continue; }
        assert.equal(added.parts.at(-1).kind, 'additive');
        assert.ok(added.form.endsWith(added.parts.at(-1).text) && added.form.length > plain.form.length);
        // the same parts, one more: a sound change of the language may alter the neighbouring segment across the new boundary (k > ʃ before i),
        // and the part is then reported as an alternant (stem-alt)
        assert.equal(added.parts.length, plain.parts.length + 1);
        assert.deepEqual(added.parts.slice(0, -1).map(p => p.kind.replace('-alt', '')), plain.parts.map(p => p.kind.replace('-alt', '')));
    }
});

test('the guide is complete, deterministic and consistent for every kind of language', () => {
    for (const input of SETS) {
        const L = make(input), g = buildGuide(L), again = buildGuide(make(input));
        assert.deepEqual(g, again, input.seed);
        const ids = g.sections.flatMap(s => s.topics.map(t => t.id));
        assert.equal(new Set(ids).size, ids.length, 'unique topic ids');
        for (const id of ['morph-type', 'word-order', 'questions', 'subordination']) assert.ok(ids.includes(id), `${input.seed} ${id}`);
        if (L.spec.morphology !== 'isolating') for (const id of ['tense', 'agreement', 'additive', 'alignment']) assert.ok(ids.includes(id), `${input.seed} ${id}`);
        for (const s of g.sections) for (const t of s.topics) {
            assert.ok(t.text && t.text.length > 150, `${input.seed} ${t.id}: text`);
            for (const e of t.examples) {
                assert.ok(e.words.length && e.translation, `${input.seed} ${t.id}`);
                for (const w of e.words) {
                    assert.ok(w.form && w.seg && w.gloss, `${input.seed} ${t.id}`);
                    assert.equal(w.seg.split('-').join(''), w.form, `${input.seed} ${t.id}: ${w.seg} / ${w.form}`);
                    assert.equal(w.seg.split('-').length, w.gloss.split('-').length, `${input.seed} ${t.id}: ${w.seg} / ${w.gloss}`);
                }
            }
            if (t.box) assert.ok(t.box.calque && /English does not work this way/.test(t.box.note), `${input.seed} ${t.id}: box`);
            assert.ok(!/undefined|NaN|\[object/.test(JSON.stringify(t)), `${input.seed} ${t.id}`);
        }
        const used = new Set(g.abbreviations.map(a => a.code));
        for (const s of g.sections) for (const t of s.topics) for (const e of t.examples) for (const w of e.words) for (const c of codesIn(w.gloss)) assert.ok(used.has(c), `${input.seed}: ${c} missing from the list`);
    }
});

test('calques appear only in the "How it works" boxes, and fusional endings are one block', () => {
    const L = make({ seed: 'k3', relations: 'cases', morphology: 'fusional' }), html = grammarGuideHtml(L), g = buildGuide(L);
    const calques = [...html.matchAll(/<p class="calque"><code>([^<]*)<\/code>/g)].map(m => m[1]);
    assert.ok(calques.length >= 8);
    assert.ok(calques.some(c => /\[[A-Z0-9.]+\]/.test(c)), 'portmanteau block');
    const outside = html.replace(/<aside class="howbox">.*?<\/aside>/g, '');
    for (const c of calques) assert.ok(!outside.includes(`<code>${c}</code>`));
    const nounCase = g.sections[0].topics.find(t => t.id === 'case');
    assert.ok(nounCase.examples.some(e => /-[MFN]\.(SG|PL)\.[A-Z]+/.test(e.words[0].gloss)));
});

test('texts: every topic text exists and the HTML has the abbreviation list and an index', () => {
    for (const [k, v] of Object.entries(GUIDE_TEXTS)) { const n = v.split(/\s+/).length; assert.ok(n >= 40 && n <= 130, `${k}: ${n} words`); }
    const L = make(SETS[1]);
    assert.match(abbreviationsHtml(L), /Leipzig Glossing Rules/);
    assert.match(abbreviationsHtml(L), /<dt>ERG<\/dt>/);
    assert.match(grammarTocHtml(L), /href="#g-case"/);
    assert.ok(!grammarGuideHtml(L).includes('undefined'));
});
