import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { selectEntries, tabooEntries, MAX_LEXICON } from '../src/lexicon/select.js';
import { resolveSpec } from '../src/spec.js';
import { lexiconHtml } from '../src/ui/render.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = input => generateLanguage(input, vocabulary, templates, derivations);
const taboo = vocabulary.filter(e => e.domain === 'taboo');

test('the dictionary has the three kinds of taboo vocabulary', () => {
    assert.ok(taboo.length >= 250);
    for (const prefix of ['insult', 'vulgar', 'taboo', 'rude']) assert.ok(taboo.some(e => e.group.startsWith(prefix)), prefix);
    assert.ok(taboo.every(e => e.tags.includes('taboo') || e.tags.includes('insult') || e.tags.includes('vulgar') || e.tags.includes('rude') || e.tags.includes('oath')));
    assert.ok(taboo.some(e => e.lemma === 'fuck off') && taboo.some(e => e.pos === 'particle'));
});

test('every language has the basic taboo words; the rest depends on the seed and genre', () => {
    const basic = taboo.filter(e => e.group.endsWith('_basic')).map(e => e.id);
    const sizes = [];
    for (const input of [{ seed: 'tb1' }, { seed: 'tb2', genre: 'orcish' }, { seed: 'tb3', genre: 'sacred' }, { seed: 'tb4', era: ['ancient'], biome: ['desert'] }]) {
        const L = gen(input), ids = new Set(L.lexicon.map(e => e.id));
        for (const id of basic) assert.ok(ids.has(id), `${input.seed} ${id}`);
        sizes.push(L.lexicon.filter(e => e.domain === 'taboo').length);
    }
    assert.ok(sizes[1] > sizes[2], `orcish ${sizes[1]} against sacred ${sizes[2]}`);
});

test('taboo words do not displace the ordinary vocabulary', () => {
    const { spec } = resolveSpec({ seed: 'tb5' });
    const chosen = selectEntries(vocabulary, spec);
    const ordinary = chosen.filter(e => e.domain !== 'taboo');
    assert.ok(ordinary.length <= MAX_LEXICON + 400);
    const without = selectEntries(vocabulary.filter(e => e.domain !== 'taboo'), spec);
    assert.deepEqual(ordinary.map(e => e.id), without.map(e => e.id));
    assert.deepEqual(tabooEntries(vocabulary, spec).map(e => e.id), tabooEntries(vocabulary, spec).map(e => e.id));
});

test('the Lexicon has a section for them, split by kind', () => {
    const html = lexiconHtml(gen({ seed: 'tb6' }).lexicon);
    assert.match(html, /id="lex-taboo"/);
    for (const t of ['Insults', 'Vulgar words (body and sex)', 'Taboo words and euphemisms', 'Rude words, oaths and interjections']) assert.ok(html.includes(t), t);
});
