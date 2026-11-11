import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateLanguage } from '../src/engine.js';
import { languageDocument, toMarkdown, toHtml, lexiconCsv, languageJson, safeName } from '../src/export.js';

const vocab = JSON.parse(readFileSync(new URL('../data/vocabulary.json', import.meta.url))).vocabulary;
const templates = JSON.parse(readFileSync(new URL('../data/sentence-templates.json', import.meta.url)));
const make = o => generateLanguage({ seed: 'export', ...o }, vocab, templates);

for (const morphology of ['isolating', 'agglutinative', 'fusional']) {
    test(`export is complete for ${morphology}`, () => {
        const lang = make({ morphology, genre: 'war' });
        const doc = languageDocument(lang, '9.9.9');
        const titles = doc.sections.map(s => s.title);
        for (const t of ['Overview', 'Phonology', 'Universal sentences', 'Lexicon']) assert.ok(titles.includes(t), t);
        const md = toMarkdown(doc);
        assert.match(md, /^# /);
        assert.ok(md.includes('v9.9.9'));
        assert.ok(!md.includes('undefined') && !md.includes('[object'));
        const html = toHtml(doc);
        assert.ok(html.startsWith('<!doctype html>') && !html.includes('undefined'));
        const rows = lexiconCsv(lang).trim().split('\r\n');
        assert.equal(rows.length, lang.lexicon.length + 1);
        const json = JSON.parse(languageJson(lang, '9.9.9'));
        assert.equal(json.lexicon.length, lang.lexicon.length);
        assert.equal(json.sentences.length, lang.samples.length);
    });
}

test('html escapes text and file names are safe', () => {
    const lang = { ...make({}), name: '<b>x&y' };
    assert.ok(!toHtml(languageDocument(lang)).includes('<b>x'));
    assert.match(safeName(lang), /^[a-z0-9-]+$/);
});
