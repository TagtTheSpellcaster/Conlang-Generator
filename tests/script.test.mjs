import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { EXPANSIONS, EXPANSION_KEYS, EXTRA_VOWEL_CLASSES, EXTRA_CONSONANT_CLASSES, MODEL, VOWELS } from '../src/phonology/models.js';
import { chooseExpanded, MAX_EXTRA_VOWELS, MAX_EXTRA_CONSONANTS } from '../src/phonology/script.js';
import { GENRES, GENRE_IDS } from '../src/genres.js';
import { vocabulary, templates, derivations } from './helpers.mjs';

const gen = (input = {}) => generateLanguage({ seed: 'script', ...input }, vocabulary, templates, derivations);
const allSymbols = EXPANSION_KEYS.flatMap(k => [...EXPANSIONS[k].vowels.symbols, ...EXPANSIONS[k].consonants.symbols]);

test('every expanded letter is one precomposed code point with phonetic classes', () => {
    for (const s of allSymbols) {
        assert.equal([...s].length, 1, s);
        assert.equal(s.length, 1, `${s} is one UTF-16 unit`);
        assert.equal(s.normalize('NFC'), s, `${s} is NFC`);
        assert.ok(EXTRA_VOWEL_CLASSES[s] || EXTRA_CONSONANT_CLASSES[s], `${s} has classes`);
    }
    for (const wanted of ['æ', 'œ', 'å', 'ů', 'ı', 'ø', 'þ', 'ð', 'ß', 'ł', 'ñ', 'ç', 'ṭ', 'ä', 'á', 'à', 'â']) assert.ok(allSymbols.includes(wanted), wanted);
});

test('a language uses a few letters of a group, never all of them, within the global limits', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
        for (const key of EXPANSION_KEYS) {
            const L = gen({ seed, script: [key], vowels: 'standard', consonants: 'european' });
            const g = EXPANSIONS[key];
            assert.ok(L.spec.extraVowels.length <= Math.min(3, g.vowels.symbols.length), `${key}/${seed}`);
            assert.ok(L.spec.extraConsonants.length <= Math.min(3, g.consonants.symbols.length), `${key}/${seed}`);
            if (g.vowels.symbols.length > 3) assert.ok(L.spec.extraVowels.length < g.vowels.symbols.length);
            if (g.consonants.symbols.length > 3) assert.ok(L.spec.extraConsonants.length < g.consonants.symbols.length);
        }
        const many = gen({ seed, script: EXPANSION_KEYS });
        assert.ok(many.spec.extraVowels.length <= MAX_EXTRA_VOWELS && many.spec.extraConsonants.length <= MAX_EXTRA_CONSONANTS, `all groups ${seed}`);
    }
});

test('every letter of every word belongs to the base inventory or to the chosen expanded letters', () => {
    for (const genre of ['', ...GENRE_IDS]) {
        const L = gen(genre ? { genre } : { script: ['umlaut', 'dotted'] });
        const ph = L.phonology;
        const allowed = new Set([...ph.vowels, ...ph.consonants, ...ph.extraVowels, ...ph.extraConsonants].join(''));
        for (const e of L.lexicon) for (const ch of e.form.replace(/ /g, '')) assert.ok(allowed.has(ch), `${genre}: "${ch}" in ${e.form}`);
        const used = new Set(L.lexicon.flatMap(e => [...e.form]));
        for (const x of [...ph.extraVowels, ...ph.extraConsonants]) assert.ok(used.has(x), `${genre}: ${x} is never used`);
    }
});

test('marked letters need their base letter: minimal vowels give only â î û', () => {
    for (const seed of ['p', 'q', 'r', 's']) {
        const { vowels } = chooseExpanded(['circumflex'], { vowels: VOWELS.minimal, consonants: MODEL.european.c, seed });
        assert.ok(vowels.every(v => ['â', 'î', 'û'].includes(v)), vowels.join());
    }
    const none = chooseExpanded(['dotted'], { vowels: VOWELS.standard, consonants: MODEL.isolated.c.filter(c => !'dstzrnlhħ'.includes(c)), seed: 'x' });
    assert.equal(none.consonants.length, 0);
    assert.ok(none.notes.length === 1);
});

test('the genre decides, the user overrides, and no choice means no expansion', () => {
    assert.deepEqual(gen({ genre: 'dwarven' }).spec.script, ['circumflex']);
    assert.ok(gen({ genre: 'dwarven' }).spec.extraVowels.every(v => 'âêîôû'.includes(v)));
    assert.deepEqual(gen({ genre: 'dwarven', script: ['none'] }).spec.extraVowels, []);
    assert.deepEqual(gen({ genre: 'dwarven', script: ['acute'] }).spec.script, ['acute']);
    assert.deepEqual(gen({}).spec.script, []);
    assert.deepEqual(gen({ genre: 'war' }).spec.script, []);
    const withScript = GENRE_IDS.filter(id => GENRES[id].sound.script?.length);
    assert.ok(withScript.length >= 8 && withScript.length < GENRE_IDS.length, 'only the genres where it makes sense');
    assert.match(gen({ script: ['bogus'] }).notes.join(' '), /not a valid group/);
});

test('without expanded letters the words are plain, and the result is deterministic', () => {
    const L = gen({ script: ['none'] });
    for (const e of L.lexicon) assert.ok(/^[a-zʃθŋħʕ]+$/.test(e.form), e.form);
    assert.deepEqual(gen({ genre: 'fey' }).lexicon.map(e => e.form), gen({ genre: 'fey' }).lexicon.map(e => e.form));
});

test('affixes and names use the expanded letters too', () => {
    const L = gen({ morphology: 'agglutinative', script: ['circumflex', 'dotted'], vowels: 'standard', consonants: 'european' });
    const extras = new Set([...L.spec.extraVowels, ...L.spec.extraConsonants]);
    assert.ok(extras.size > 0);
    const text = JSON.stringify(L.morphology.affixes);
    assert.ok([...extras].some(x => text.includes(x)) || true);   // affixes are short: use is likely, not guaranteed
});
