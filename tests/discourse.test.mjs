import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { STORIES, compileStory } from '../src/discourse/texts.js';
import { textsHtml, historyHtml } from '../src/ui/render.js';
import { historyStory } from '../src/history/story.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = (seed, extra = {}) => generateLanguage({ seed, ...extra }, vocabulary, templates, derivations);

test('texts: every language gets a dialogue and three more texts (three of them planned), all lines realised, deterministic', () => {
    for (const seed of ['dx1', 'dx2', 'dx3', 'dx4']) {
        const L = gen(seed), again = gen(seed);
        assert.equal(L.texts.length, 4, seed);
        assert.ok(L.texts.some(t => t.kind === 'dialogue'));
        assert.deepEqual(L.texts.map(t => t.title), again.texts.map(t => t.title));
        for (const t of L.texts) for (const l of t.lines) assert.ok(l.tokens.length >= 1 && l.en, `${t.id}: ${l.en}`);
    }
});

test('texts: referring expressions follow the discourse (indefinite, then definite, then pronoun)', () => {
    const lines = compileStory(STORIES.find(s => s.id === 'hunter-wolf')).map(l => l.en);
    assert.equal(lines[0], 'Once a hunter went into the forest.');
    assert.equal(lines[1], 'He saw a wolf.');
    assert.equal(lines[2], 'It was hungry.');
    assert.equal(lines[3], 'The hunter was afraid, but he did not run.');
    assert.equal(lines[4], 'Then the wolf went away.');
    for (const s of STORIES) for (const l of compileStory(s)) assert.ok(!/[{}$]/.test(l.en), l.en);
});

test('texts: pro-drop languages leave out the pronoun subject, others keep it; the card renders', () => {
    for (const seed of ['dx1', 'dx2', 'dx3', 'dx4', 'dx5', 'dx6']) {
        const L = gen(seed), story = L.texts.find(t => t.id === 'hunter-wolf'), hunter = story?.lines[1];
        if (!hunter) continue;
        const words = hunter.tokens.filter(t => t.kind === 'word').length;
        assert.ok(L.syntax.prodrop ? words === 2 : words >= 3, `${seed} prodrop=${L.syntax.prodrop} words=${words}`);
    }
    assert.ok(textsHtml(gen('dx1')).includes('Connected texts'));
});

test('history story and the loans the sister did not take', () => {
    const L = gen('hs1', { genre: 'marine' }), story = historyStory(L);
    assert.ok(story.events.length >= 4 && story.intro && story.outro);
    for (let i = 1; i < story.events.length; i++) assert.ok(story.events[i - 1].years >= story.events[i].years);
    const c = L.history.sister.loanContrast;
    assert.ok(c.length >= 3);
    for (const x of c) assert.ok(x.sister !== x.daughter && x.mother && x.donor);
    const html = historyHtml(L);
    assert.ok(html.includes('History of the language') && html.includes('Loanwords this language took and') && html.includes('did not'));
});
