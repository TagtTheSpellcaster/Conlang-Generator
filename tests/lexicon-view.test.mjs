import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { lexiconHtml, derivationHtml, calendarHtml, LEXICON_TOPICS } from '../src/ui/render.js';
import { DOMAINS } from '../src/lexicon/schema.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const L = generateLanguage({ seed: 'view' }, vocabulary, templates, derivations);

test('lexicon view: every domain has a topic title; every word appears once, under its topic', () => {
    assert.deepEqual([...LEXICON_TOPICS.map(t => t[0])].sort(), [...DOMAINS].sort());
    const html = lexiconHtml(L.lexicon);
    assert.equal((html.match(/class="lex-row"/g) ?? []).length, L.lexicon.length);
    const sections = [...html.matchAll(/<details class="lex-section" id="lex-(\w+)">/g)].map(m => m[1]);
    assert.equal(new Set(sections).size, sections.length);
    for (const d of new Set(L.lexicon.map(e => e.domain))) assert.ok(sections.includes(d), d);
});

test('word formation and calendar tables use the full width of their card', () => {
    assert.match(derivationHtml(L), /class="names-table full-table"/);
    assert.match(calendarHtml(L), /class="names-table full-table"/);
});
