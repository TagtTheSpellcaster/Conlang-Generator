import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { languageDocument, languageJson } from '../src/export.js';
import { GENRE_IDS } from '../src/genres.js';
import { vocabulary, templates } from './helpers.mjs';

const gen = (input = {}) => generateLanguage({ seed: 'cal', ...input }, vocabulary, templates);
const ERAS = ['prehistoric', 'ancient', 'medieval', 'renaissance', 'modern', 'futuristic'];

test('calendar: deterministic, with logic table and the expected sections', () => {
    const a = gen(), b = gen();
    assert.deepEqual(a.calendar, b.calendar);
    assert.ok(a.calendar.logic.length >= 9);
    assert.ok(a.calendar.vocabulary.length > 20);
    assert.ok(a.calendar.logic.every(x => x.dimension && x.choice && x.rule));
});

test('calendar: rigidity follows the era chosen and never decreases with it', () => {
    for (let i = 0; i < 40; i++) {
        let last = -1;
        for (const era of ERAS) {
            const r = gen({ seed: `r${i}`, era: [era] }).calendar.config.rigidity;
            assert.ok(r >= last, `${era} ${i}`);
            last = r;
        }
    }
    assert.equal(gen({ era: ['prehistoric'] }).calendar.config.rigidity, 0);
    assert.equal(gen({ era: ['modern'] }).calendar.config.rigidity, 3);
});

test('calendar: no fixed months, hours or clocks before writing; no ancient words in the future-only rules', () => {
    for (let i = 0; i < 80; i++) {
        const c = gen({ seed: `p${i}`, era: ['prehistoric'] }).calendar;
        assert.ok(['ecological', 'none', 'lunar-observed'].includes(c.config.months.type), c.config.months.type);
        assert.ok(!c.config.months.epagomenal);
        assert.equal(c.config.day.type, 'phases');
        assert.ok(c.instruments.every(x => ['shadow stick', 'notched stick', 'knotted cord'].includes(x.gloss)), JSON.stringify(c.instruments.map(x => x.gloss)));
    }
    for (let i = 0; i < 40; i++) {
        const c = gen({ seed: `m${i}`, era: ['modern'] }).calendar;
        if (c.config.restricted) continue;
        assert.ok(['equal', 'decimal'].includes(c.config.day.type));
        assert.ok(c.config.months.type === 'numbered' || c.config.months.type === 'thirteen' || c.config.restricted);
    }
});

test('calendar: agricultural societies never use a pure lunar year', () => {
    for (let i = 0; i < 150; i++) {
        const c = gen({ seed: `a${i}`, culture: ['agrarian'] }).calendar.config;
        assert.ok(!['lunar', 'ecological'].includes(c.year), `${i} ${c.year}`);
    }
});

test('calendar: restricted numeral systems do not number months, hours or days', () => {
    let seen = 0;
    for (let i = 0; i < 700 && seen < 5; i++) {
        const l = gen({ seed: `x${i}`, numerals: 'restricted', era: ['modern'] });
        seen++;
        const gl = [...l.calendar.months, ...l.calendar.day, ...l.calendar.week].map(x => x.gloss);
        assert.ok(gl.every(g => !/\b(month|hour|watch|day) \d/.test(g)), gl.join('|'));
    }
});

test('calendar: tables are filled and names capitalised, for every genre', () => {
    for (const g of GENRE_IDS) {
        const c = gen({ seed: `g-${g}`, genre: g }).calendar;
        assert.ok(c.day.length > 0 || c.dayNote, g);
        for (const x of [...c.months, ...c.week]) for (const w of x.name.split(' ')) assert.match(w, /^\P{Ll}/u, `${g}: ${x.name}`);
        const names = [...c.months, ...c.week, ...c.day, ...c.seasons].map(x => x.name);
        assert.ok(names.every(n => n && !/undefined|null/.test(n)), g);
    }
});

test('calendar: exported in the language sheet and in the JSON', () => {
    const l = gen();
    assert.ok(languageDocument(l).sections.some(s => s.title === 'Calendar and time'));
    assert.ok(JSON.parse(languageJson(l)).calendar.logic.length >= 9);
});
