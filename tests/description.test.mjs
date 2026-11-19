import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { describeLanguage, plainText } from '../src/description/describe.js';
import { descriptionHtml, descriptionWikitext, descriptionMarkdown, termTargets } from '../src/description/render.js';
import { languageDocument, languageJson } from '../src/export.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const make = input => generateLanguage({ articles: 'both', ...input }, vocabulary, templates, derivations);
const SEEDS = [{ seed: 'd1' }, { seed: 'd2', genre: 'sacred' }, { seed: 'd3', genre: 'undead' }, { seed: 'd4', genre: 'thieves', relations: 'ergative' }, { seed: 'd5', era: ['futuristic'], genre: 'machine' }, { seed: 'd6', era: ['modern'], morphology: 'isolating' }, { seed: 'd7', genre: 'merchant' }];

test('every language has a word for "language"', () => {
    for (const input of SEEDS) assert.ok(make(input).lexicon.some(e => e.id === 'society.language'), input.seed);
});

test('the description is deterministic and complete', () => {
    for (const input of SEEDS) {
        const L = make(input), a = describeLanguage(L), b = describeLanguage(make(input));
        assert.deepEqual(a, b, input.seed);
        const ids = a.sections.map(s => s.id);
        for (const id of ['history', 'distribution', 'phonology', 'writing', 'grammar', 'vocabulary']) assert.ok(ids.includes(id), `${input.seed} ${id}`);
        assert.match(a.code, /^q[a-t][a-z]$/);
        assert.ok(a.infobox.length >= 10 && a.lead.length >= 3);
        const text = JSON.stringify([a.lead, a.sections, a.infobox]);
        assert.ok(!/undefined|NaN|\[object|null\b/.test(plainText(text)), `${input.seed}: ${plainText(text).match(/.{30}(undefined|NaN|\[object|null\b).{30}/)?.[0]}`);
    }
});

test('invented facts respect genre and status', () => {
    assert.equal(describeLanguage(make({ seed: 'd2', genre: 'sacred' })).facts.nativeSpeakers, 0);
    assert.equal(describeLanguage(make({ seed: 'd3', genre: 'undead' })).facts.vitality, 'Extinct');
    const f = describeLanguage(make({ seed: 'd6', era: ['modern'] })).facts;
    assert.ok(f.nativeSpeakers >= 20 && f.vitality);
});

test('section links point to existing sections and markers are resolved in every output', () => {
    for (const input of SEEDS) {
        const d = describeLanguage(make(input)), ids = new Set(d.sections.map(s => s.id));
        const all = JSON.stringify([d.infobox, d.lead, d.sections]);
        for (const m of all.matchAll(/⟦s\|([^|⟧]*)\|/g)) assert.ok(ids.has(m[1]), `${input.seed}: ${m[1]}`);
        for (const out of [descriptionHtml(d), descriptionMarkdown(d), descriptionWikitext(d, { pageLinks: true, termLinks: true })]) assert.ok(!out.includes('⟦') && !out.includes('⟧'));
        assert.ok(!descriptionHtml(d).includes('undefined'));
    }
});

test('MediaWiki export: structure, headings and link options', () => {
    const d = describeLanguage(make({ seed: 'd1' }));
    const plain = descriptionWikitext(d, { pageLinks: false, termLinks: false });
    assert.match(plain, /^\{\| class="infobox"/);
    assert.match(plain, new RegExp(`'''${d.title}'''`));
    for (const s of d.sections) assert.ok(plain.includes(`== ${s.title} ==`), s.title);
    assert.ok(plain.includes('[[#Classification and history|'));
    assert.ok(!plain.includes('https://en.wikipedia.org') && !/\[\[(?!#|Category)/.test(plain));
    const linked = descriptionWikitext(d, { pageLinks: true, termLinks: true });
    assert.ok(linked.includes(`[[Proto-${d.title}]]`) || linked.includes(`[[Proto-${d.title}|`));
    assert.match(linked, /\[https:\/\/en\.wikipedia\.org\/wiki\/[^ \]]+ [^\]]+\]/);
    assert.match(linked, /\[\[Category:Constructed languages\]\]/);
    const tpl = descriptionWikitext(d, { infobox: 'template' });
    assert.match(tpl, /^\{\{Infobox language/);
    assert.ok(tpl.includes(`| name = ${d.title}`));
    // balanced table and template markup
    assert.equal((plain.match(/^\{\|/gm) ?? []).length, (plain.match(/^\|\}/gm) ?? []).length);
    assert.equal((tpl.match(/\{\{/g) ?? []).length, (tpl.match(/\}\}/g) ?? []).length);
});

test('linguistic terms used by the description have a Wikipedia title without spaces problems', () => {
    const titles = new Set();
    for (const input of SEEDS) termTargets(describeLanguage(make(input))).forEach(t => titles.add(t));
    assert.ok(titles.size >= 8);
    for (const t of titles) assert.match(t, /^[A-Z][^\[\]|{}<>#]*$/, t);
});

test('the description is part of the HTML/Markdown document and of the JSON export', () => {
    const L = make({ seed: 'd1' });
    assert.equal(languageDocument(L).sections[0].title, 'Description');
    const j = JSON.parse(languageJson(L));
    assert.ok(j.description.infobox['Native name'] && j.description.sections.length >= 6);
});
