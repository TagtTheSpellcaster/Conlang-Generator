import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { buildWriting, chooseDirection, directionOdds } from '../src/writing/system.js';
import { languageDocument, toHtml, toMarkdown, languageJson } from '../src/export.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const share = (eras, type, n = 3000) => {
    let rtl = 0, bou = 0;
    for (let i = 0; i < n; i++) { const d = chooseDirection(`d${i}`, eras, type); if (d.direction === 'rtl') rtl++; if (d.boustrophedon) bou++; }
    return { rtl: rtl / n, bou: bou / n };
};

test('direction: shares follow the census and grow with the age of the language', () => {
    const modern = share(['modern'], 'alphabet'), none = share([], 'alphabet'), ancient = share(['ancient'], 'alphabet');
    assert.ok(Math.abs(modern.rtl - 0.085) < 0.025, `modern ${modern.rtl}`);
    assert.ok(Math.abs(none.rtl - 0.21) < 0.03, `none ${none.rtl}`);
    assert.ok(Math.abs(ancient.rtl - 0.40) < 0.04, `ancient ${ancient.rtl}`);
    assert.ok(modern.rtl < none.rtl && none.rtl < ancient.rtl);
    assert.ok(share(['ancient'], 'abjad').rtl > ancient.rtl && share(['ancient'], 'syllabary').rtl < ancient.rtl);
    assert.ok(ancient.bou > 0 && ancient.bou < 0.06 && modern.bou < ancient.bou);
});

test('direction: the user can force any direction, and the choice is deterministic', () => {
    for (let i = 0; i < 30; i++) {
        assert.deepEqual(chooseDirection(`f${i}`, ['modern'], 'alphabet', 'rtl'), chooseDirection(`f${i}`, ['modern'], 'alphabet', 'rtl'));
        const l = chooseDirection(`f${i}`, ['ancient'], 'abjad', 'ltr'), r = chooseDirection(`f${i}`, ['modern'], 'alphabet', 'rtl'), b = chooseDirection(`f${i}`, ['modern'], 'alphabet', 'boustrophedon');
        assert.equal(l.direction, 'ltr'); assert.equal(l.boustrophedon, false);
        assert.equal(r.direction, 'rtl'); assert.equal(r.boustrophedon, false);
        assert.equal(b.boustrophedon, true);
    }
    assert.ok(directionOdds(['ancient'], 'abjad').rtl > 0.7);
});

test('direction: every direction reads back correctly and boustrophedon lines alternate with mirrored letters', () => {
    const L = generateLanguage({ seed: 'dir1' }, vocabulary, templates, derivations);
    for (const mode of ['ltr', 'rtl', 'boustrophedon']) {
        const W = buildWriting(L, 'alphabet', mode);
        assert.equal(W.failures, 0);
        const first = W.line(['bu', 'di'], 0), second = W.line(['bu', 'di'], 1);
        assert.match(first, /dir="(ltr|rtl)"/);
        if (mode === 'boustrophedon') {
            assert.ok(W.boustrophedon && !first.includes('mirrored') && second.includes('mirrored'));
            assert.notEqual(W.lineDirection(0), W.lineDirection(1));
        } else {
            assert.ok(!W.boustrophedon && !second.includes('mirrored'));
            assert.equal(W.lineDirection(1), mode);
        }
    }
});

test('save: the HTML and JSON exports contain the script, as chosen in the Writing tab', () => {
    const L = generateLanguage({ seed: 'dir2' }, vocabulary, templates, derivations);
    const opts = { writing: 'abjad', direction: 'rtl' };
    const html = toHtml(languageDocument(L, 'test', opts)), json = JSON.parse(languageJson(L, 'test', opts)), md = toMarkdown(languageDocument(L, 'test', opts));
    assert.ok(html.includes('script-export') && (html.match(/<svg/g) ?? []).length > 40);
    assert.match(html, /dir="rtl"/);
    assert.equal(json.writing.type, 'abjad'); assert.equal(json.writing.direction, 'rtl'); assert.equal(json.writing.boustrophedon, false);
    assert.ok(Object.keys(json.writing.signSvg).length >= 10 && Object.values(json.writing.signSvg).every(x => x.startsWith('<')));
    assert.ok(json.writing.sampleLines.length > 0 && json.writing.sampleLines.every(l => l.svg.includes('<svg')));
    assert.ok(!md.includes('<svg'));
    // another choice gives another script
    assert.notEqual(JSON.parse(languageJson(L, 'test', { writing: 'syllabary' })).writing.type, 'abjad');
});

import { label } from '../src/lexicon/schema.js';
import { writeTextHtml } from '../src/ui/render.js';
test('write: a typed text is written in the script, with numbers, dictionary lookup and a report of what cannot be written', () => {
    const L = generateLanguage({ seed: 'wt1' }, vocabulary, templates, derivations);
    const word = L.lexicon.find(e => e.form.length >= 3 && !e.form.includes(' ')), english = L.lexicon.find(e => e.pos === 'noun' && !e.form.includes(' ') && /^[a-z]+$/.test(label(e)) && [...e.form].some(c => !/[bdfgjklmnprstvwzʃaeiou]/.test(c)) === false && !new Set(L.lexicon.map(x => x.form)).has(label(e)));
    for (const type of ['alphabet', 'abjad', 'abugida', 'syllabary']) {
        const html = writeTextHtml(L, `${word.form} ${word.form}\n${label(english)} 2026 qqq`, { choice: type });
        assert.ok((html.match(/<svg/g) ?? []).length >= 4, type);
        assert.match(html, /not a letter|not letters/);
        assert.ok(html.includes(word.form));
        assert.ok(html.includes(english.form), 'English word replaced by the dictionary form');
        assert.ok((html.match(/class="script-line/g) ?? []).length >= 2);
    }
    assert.ok(!writeTextHtml(L, 'qqq', { lookup: false }).includes('<svg'));
    assert.match(writeTextHtml(L, '', {}), /Nothing to write/);
    const bou = writeTextHtml(L, Array(13).fill(word.form).join(' '), { direction: 'boustrophedon' });
    assert.equal((bou.match(/script-line mirrored/g) ?? []).length, 1);
});
