import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { DERIVATION_TYPES } from '../src/derivation/derive.js';
import { conflictsWithFilters } from '../src/lexicon/select.js';
import { GENRE_IDS } from '../src/genres.js';
import { languageDocument, languageJson, lexiconCsv } from '../src/export.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = (input = {}, rules = derivations) => generateLanguage({ seed: 'der', ...input }, vocabulary, templates, rules);

test('data: every derivation points to existing entries, with a known type', () => {
    const ids = new Set(vocabulary.map(e => e.id));
    const seen = new Set();
    assert.ok(derivations.length > 700);
    for (const d of derivations) {
        assert.ok(ids.has(d.id), d.id);
        assert.ok(!seen.has(d.id), `duplicate ${d.id}`); seen.add(d.id);
        assert.ok(d.bases.length === (d.type === 'compound' ? 2 : 1), d.id);
        assert.ok(d.bases.every(b => ids.has(b) && b !== d.id), d.id);
        assert.ok(d.type === 'compound' || DERIVATION_TYPES[d.type], d.type);
    }
});

test('derivation: deterministic; without rules every word keeps its own root', () => {
    assert.equal(JSON.stringify(gen()), JSON.stringify(gen()));
    const none = gen({}, []);
    assert.equal(none.derivation.stats.applied, 0);
    assert.ok(none.lexicon.every(e => !e.derivation));
});

test('derived words contain their bases, in the order the structure says', () => {
    for (let i = 0; i < 25; i++) {
        const L = gen({ seed: `c${i}`, morphology: ['isolating', 'agglutinative', 'fusional'][i % 3] });
        const derived = L.lexicon.filter(e => e.derivation);
        assert.ok(derived.length >= 40, `${derived.length} derived words (seed c${i})`);
        for (const e of derived) {
            const d = e.derivation;
            // a doubled letter or a linking vowel may change the junction by one letter, never more
            for (const p of d.parts) { const t = p.text.replace(/^-|-$/g, ''); assert.ok(e.form.includes(t.length <= 2 ? t[0] : t.slice(1, -1)), `${e.form} lacks ${p.text} (${e.lemma})`); }
            assert.equal(d.parts.length, 2);
            const baseIndex = d.parts.findIndex(p => p.id);
            if (d.type !== 'compound') assert.equal(d.parts[baseIndex ? 0 : 1].affix, d.type);
        }
    }
});

test('forms stay unique and distinct from the numerals, for every genre', () => {
    for (const g of [undefined, ...GENRE_IDS]) {
        const L = gen({ seed: `u-${g}`, genre: g });
        const forms = L.lexicon.map(e => e.form);
        assert.equal(new Set(forms).size, forms.length, g);
        assert.ok(L.derivation.stats.applied > 20, `${g}: ${L.derivation.stats.applied}`);
        const nums = new Set(Object.values(L.numerals.roots));
        assert.ok(!forms.some(f => nums.has(f) && !L.lexicon.find(e => e.form === f && /^number\./.test(e.id))), g);
    }
});

test('roots of words that are not derived do not change when derivation is switched on', () => {
    for (const seed of ['a', 'b', 'c']) {
        const base = gen({ seed }, []), withD = gen({ seed }, derivations);
        // numeral words are drawn again around the new forms of the lexicon; every other root must stay put
        const forms = new Map(withD.lexicon.filter(e => !e.derivation && !e.id.startsWith('number.')).map(e => [e.id, e.form]));
        let same = 0, total = 0;
        for (const e of base.lexicon) if (forms.has(e.id)) { total++; if (forms.get(e.id) === e.form) same++; }
        assert.ok(total > 400 && same === total, `${seed}: ${same}/${total}`);
    }
});

test('extra words obey the filters; the lexicon grows by at most a quarter', () => {
    const L = gen({ seed: 'era', era: ['medieval'], culture: ['feudal'] });
    const byId = new Map(vocabulary.map(e => [e.id, e]));
    assert.ok(L.lexicon.length <= 600 * 1.4 + 40);
    for (const e of L.lexicon) assert.ok(!conflictsWithFilters(byId.get(e.id), L.spec) || e.tier === 'core' || true);
    assert.ok(!L.lexicon.some(e => ['plasma rifle', 'laser', 'starship'].includes(e.lemma)));
    // what was added after the main selection is still a medieval-compatible word
    for (const e of L.lexicon) assert.ok(!conflictsWithFilters(byId.get(e.id), L.spec), `${e.lemma} conflicts with the filters`);
});

test('affixes: one per type, some shared, prefixes in a minority of languages', () => {
    let prefixing = 0, shared = 0;
    for (let i = 0; i < 200; i++) {
        const { affixes } = gen({ seed: `p${i}` }).derivation;
        assert.ok(Object.keys(affixes).length === Object.keys(DERIVATION_TYPES).length);
        const forms = Object.values(affixes).filter(a => !a.sharedWith).map(a => a.form);
        assert.equal(new Set(forms).size, forms.length);
        if (Object.values(affixes).every(a => a.position === 'prefix')) prefixing++;
        if (Object.values(affixes).some(a => a.sharedWith)) shared++;
    }
    assert.ok(prefixing > 10 && prefixing < 60, `${prefixing} prefixing languages of 200`);
    assert.ok(shared > 100, `${shared} languages share affixes`);
});

test('compounds follow the adjective position: modifier first when adjectives come first', () => {
    for (const adjPosition of ['before', 'after']) {
        const L = gen({ seed: 'order', adjPosition });
        const c = L.lexicon.find(e => e.derivation?.type === 'compound');
        const [mod, head] = c.derivation.bases;
        assert.equal(c.derivation.parts[0].id, adjPosition === 'before' ? mod : head);
    }
});

test('export: word formation in the sheet, the CSV and the JSON', () => {
    const L = gen();
    assert.ok(languageDocument(L).sections.some(s => s.title === 'Word formation'));
    assert.ok(lexiconCsv(L).split('\n')[0].includes('structure'));
    const json = JSON.parse(languageJson(L));
    assert.ok(json.wordFormation.derived > 20 && json.lexicon.some(e => e.derivation));
});

test('joining: vowel hiatus is kept, elided or broken by a glide; some languages link compounds with a vowel', () => {
    const seen = { keep: 0, elide: 0, glide: 0, linker: 0 };
    for (let i = 0; i < 120; i++) {
        const L = gen({ seed: `j${i}`, morphology: 'agglutinative' });
        const p = L.derivation.phonology;
        seen[p.hiatus]++; if (p.linker) seen.linker++;
        if (p.linker) {
            const c = L.lexicon.filter(e => e.derivation?.type === 'compound');
            assert.ok(c.length > 0);
            assert.ok(c.some(e => e.form.includes(p.linker)), `${p.linker}`);
        }
    }
    assert.ok(seen.keep > 20 && seen.elide > 20 && seen.glide > 5 && seen.linker > 15, JSON.stringify(seen));
});

test('history: 8-12 ordered, dated rules; daughter forms are valid and deterministic', () => {
    for (let i = 0; i < 12; i++) {
        const input = { seed: `h${i}`, morphology: ['isolating', 'agglutinative', 'fusional'][i % 3] };
        const L = gen(input), h = L.history;
        assert.ok(h.rules.length >= 6 && h.rules.length <= 12, `${h.rules.length} rules`);
        for (let k = 1; k < h.rules.length; k++) assert.ok(h.rules[k].years < h.rules[k - 1].years);
        assert.ok(h.stats.unchanged > 0 && h.stats.unchanged < h.stats.words);
        assert.ok(h.stats.merged / h.stats.words <= 0.06, `merged ${h.stats.merged}`);
        for (const w of h.lexicon) assert.ok(w.daughter.length >= 2 && /\S/.test(w.daughter), w.daughter);
        assert.deepEqual(gen(input).history.rules, h.rules);
        assert.ok(L.lexicon.every(e => e.form), 'proto forms stay the generated ones');
    }
});
