import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLanguage } from '../src/engine.js';
import { resolveSpec, OPTIONS } from '../src/spec.js';
import { GENRES, GENRE_IDS, genreDefaults } from '../src/genres.js';
import { MODEL, VOWELS, CLUSTER_SETS, SOUND_CLASSES } from '../src/phonology/models.js';
import { genreBonus } from '../src/lexicon/select.js';
import { createWordFactory } from '../src/phonology/words.js';
import { vocabulary, templates } from './helpers.mjs';

const gen = (input = {}) => generateLanguage({ seed: 'gt', ...input }, vocabulary, templates);
const lemmas = L => new Set(L.lexicon.map(e => e.lemma));
const forms = L => L.lexicon.filter(e => e.tier !== 'core').map(e => e.form);
const VOWEL_SET = new Set(['a', 'e', 'i', 'o', 'u', 'y', 'ø', 'æ']);
const share = (words, pred) => words.filter(pred).length / words.length;

test('genre definitions only use valid options, models, cluster sets and phonetic classes', () => {
    assert.equal(GENRE_IDS.length, 18);
    for (const g of Object.values(GENRES)) {
        for (const [k, v] of Object.entries(g.grammar)) assert.ok(OPTIONS[k]?.includes(v), `${g.id}.grammar.${k}=${v}`);
        assert.ok(MODEL[g.sound.consonants], `${g.id} consonants`);
        assert.ok(VOWELS[g.sound.vowels], `${g.id} vowels`);
        for (const [position, list] of [['onset', g.sound.onsetClusters], ['coda', g.sound.codaClusters]])
            for (const k of list) assert.ok(k === 'none' || CLUSTER_SETS[position][k], `${g.id} ${position} cluster ${k}`);
        for (const table of [g.sound.bias.c, g.sound.bias.v]) for (const key of Object.keys(table ?? {})) assert.ok(SOUND_CLASSES.includes(key) || key.length === 1, `${g.id} bias key ${key}`);
        assert.ok(g.label && g.summary.length > 40, `${g.id} label/summary`);
    }
});

test('genre semantic weights only name domains, groups, tags, cultures, biomes and eras that exist in the dictionary', () => {
    const has = { domain: new Set(), group: new Set(), tag: new Set(), culture: new Set(), biome: new Set(), era: new Set() };
    for (const e of vocabulary) { has.domain.add(e.domain); has.group.add(`${e.domain}/${e.group}`); e.tags.forEach(t => has.tag.add(t)); e.culture.forEach(t => has.culture.add(t)); e.biome.forEach(t => has.biome.add(t)); e.era.forEach(t => has.era.add(t)); }
    for (const g of Object.values(GENRES)) {
        const s = g.semantics, miss = [];
        for (const k of [...Object.keys(s.domains), ...Object.keys(s.domainsAvoid ?? {}), ...s.exclude.domains]) if (!has.domain.has(k)) miss.push(`domain ${k}`);
        for (const k of Object.keys(s.groups)) if (!has.group.has(k)) miss.push(`group ${k}`);
        for (const k of [...Object.keys(s.tags), ...s.exclude.tags]) if (!has.tag.has(k)) miss.push(`tag ${k}`);
        for (const k of Object.keys(s.cultures)) if (!has.culture.has(k)) miss.push(`culture ${k}`);
        for (const k of Object.keys(s.biomes)) if (!has.biome.has(k)) miss.push(`biome ${k}`);
        for (const k of Object.keys(s.eras)) if (!has.era.has(k)) miss.push(`era ${k}`);
        assert.deepEqual(miss, [], g.id);
    }
});

test('a genre supplies defaults for unset options; explicit options win; an unknown genre is reported', () => {
    const a = resolveSpec({ genre: 'war' });
    assert.equal(a.spec.genre, 'war');
    assert.equal(a.spec.morphology, 'isolating');
    assert.equal(a.spec.order, 'VSO');
    assert.equal(a.spec.vowels, 'minimal');
    assert.deepEqual(a.spec.onsetClusters, ['sibilant_stop']);
    assert.deepEqual(a.notes, [], 'genre grammar must be self-consistent, so it triggers no adjustment notes');
    const b = resolveSpec({ genre: 'war', order: 'SOV', morphology: 'agglutinative', onsetClusters: ['liquids'] });
    assert.equal(b.spec.order, 'SOV');
    assert.equal(b.spec.morphology, 'agglutinative');
    assert.deepEqual(b.spec.onsetClusters, ['liquids']);
    assert.ok(resolveSpec({ genre: 'klingon' }).notes.some(n => /klingon/.test(n)));
    assert.equal(resolveSpec({ genre: 'klingon' }).spec.genre, null);
    assert.deepEqual(genreDefaults('nope'), {});
});

test('genre "none" changes nothing compared with no genre at all', () => {
    const plain = gen({ morphology: 'fusional' }), none = gen({ morphology: 'fusional', genre: 'none' });
    assert.deepEqual(none.lexicon.map(e => e.form), plain.lexicon.map(e => e.form));
    assert.deepEqual(none.samples.map(s => s.tokens), plain.samples.map(s => s.tokens));
});

test('every genre generates a complete language: unique forms, no skipped sample sentences, no adjustment notes', () => {
    for (const id of GENRE_IDS) for (const seed of ['a', 'b', 'c']) {
        const L = gen({ genre: id, seed });
        assert.equal(L.genre.id, id);
        assert.equal(new Set(L.lexicon.map(e => e.form)).size, L.lexicon.length, `${id}/${seed} unique forms`);
        assert.deepEqual(L.skippedSamples, [], `${id}/${seed} skipped samples`);
        assert.deepEqual(L.notes, [], `${id}/${seed} notes`);
        assert.ok(L.lexicon.length >= 590, `${id}/${seed} lexicon size ${L.lexicon.length}`);
    }
});

test('genres are deterministic', () => {
    for (const id of ['marine', 'women', 'war']) assert.deepEqual(gen({ genre: id }).lexicon.map(e => e.form), gen({ genre: id }).lexicon.map(e => e.form));
});

test('semantics: each genre selects its own specialised vocabulary', () => {
    const expect = {
        war: ['war of position', 'war of movement', 'shield wall', 'flanking maneuver', 'trench', 'pincer movement'],
        orcish: ['warband', 'berserker', 'raider'],
        giant: ['boulder', 'avalanche', 'stomp', 'aeon'],
        marine: ['tide', 'anchor', 'keel', 'kelp', 'maelstrom', 'harpoon'],
        fey: ['fairy ring', 'glamour', 'gossamer', 'dew'],
        draconic: ['hoard', 'wyrm', 'covet', 'dominion'],
        dwarven: ['anvil', 'forge', 'mortise', 'ashlar'],
        infernal: ['devil', 'brimstone', 'infernal contract', 'loophole'],
        arcane: ['spell', 'incantation', 'grimoire', 'scry'],
        machine: ['checksum', 'handshake', 'subroutine', 'initialize'],
        hive: ['hive', 'brood', 'pheromone', 'mandible'],
        women: ['sworn sister', 'third-day letter', 'bridal lament', 'embroider'],
        artisan: ['dovetail', 'quench', 'weft', 'chisel'],
        thieves: ['pickpocket', 'fence', 'heist', 'lockpick'],
        nomad: ['yurt', 'migrate', 'steppe', 'mare\'s milk'],
        sacred: ['altar', 'litany', 'pilgrimage', 'absolve'],
        undead: ['crypt', 'wraith', 'exhume', 'sarcophagus'],
        merchant: ['tariff', 'haggle', 'ledger', 'caravanserai']
    };
    assert.deepEqual(Object.keys(expect).sort(), [...GENRE_IDS].sort());
    for (const [id, words] of Object.entries(expect)) {
        const have = lemmas(gen({ genre: id }));
        for (const w of words) assert.ok(have.has(w), `${id} should contain "${w}"`);
    }
});

test('semantics: a genre pushes its own domain well above the free language', () => {
    const count = (L, domains) => L.lexicon.filter(e => domains.includes(e.domain)).length;
    const base = gen();
    const cases = { war: ['war'], marine: ['maritime'], artisan: ['craft'], arcane: ['magic'], sacred: ['faith'], machine: ['technology'], women: ['family', 'household'] };
    for (const [id, domains] of Object.entries(cases)) assert.ok(count(gen({ genre: id }), domains) >= count(base, domains) + 50, `${id}: ${count(gen({ genre: id }), domains)} vs ${count(base, domains)}`);
});

test('semantics: genres that do not know war leave out non-core war and weapon vocabulary', () => {
    for (const id of ['fey']) {
        const L = gen({ genre: id });
        const stray = L.lexicon.filter(e => e.tier !== 'core' && ['war', 'weapon', 'technology'].includes(e.domain));
        assert.deepEqual(stray.map(e => e.id), []);
    }
    const women = gen({ genre: 'women' });
    assert.deepEqual(women.lexicon.filter(e => e.tier !== 'core' && e.domain === 'war').map(e => e.id), []);
    assert.ok(gen({ genre: 'war' }).lexicon.filter(e => e.domain === 'war').length > 100);
});

test('genreBonus is bounded and zero without a profile', () => {
    assert.equal(genreBonus(vocabulary[0], null), 0);
    for (const g of Object.values(GENRES)) for (const e of vocabulary.slice(0, 1500)) { const b = genreBonus(e, g.semantics); assert.ok(b >= -6 && b <= 12); }
});

test('sound: sea-folk use open syllables, war tongue closed ones and shorter words', () => {
    const marine = gen({ genre: 'marine' }), war = gen({ genre: 'war' }), free = gen();
    const ends = L => forms(L).map(w => VOWEL_SET.has(w.at(-1)));
    assert.ok(share(ends(marine), x => x) > 0.9, `marine vowel-final ${share(ends(marine), x => x)}`);
    assert.ok(share(ends(war), x => !x) > share(ends(free), x => !x), 'war has more consonant-final words');
    const mean = L => forms(L).reduce((n, w) => n + w.length, 0) / forms(L).length;
    assert.ok(mean(war) < mean(free) && mean(free) < mean(marine), `${mean(war)} < ${mean(free)} < ${mean(marine)}`);
    const affixes = L => [...Object.values(L.morphology.affixes.caseEndings), L.morphology.affixes.numberMarkers.plural].filter(Boolean);
    assert.ok(share(affixes(marine), a => VOWEL_SET.has(a.at(-1))) >= 0.9, 'sea-folk affixes are open too');
});

test('sound: consonant and vowel bias shape the inventory of use', () => {
    const count = (L, set) => forms(L).join('').split('').filter(ch => set.includes(ch)).length;
    const orc = gen({ genre: 'orcish' }), free = gen({ morphology: 'agglutinative', consonants: 'english' });
    const back = ['o', 'u'], front = ['e', 'i'];
    assert.ok(count(orc, back) / count(orc, front) > 1.5 * (count(free, back) / count(free, front)), 'orcs favour back vowels');
    const hive = gen({ genre: 'hive' });
    assert.ok(count(hive, ['s', 'z', 'ʃ']) / forms(hive).join('').length > count(free, ['s', 'z', 'ʃ']) / forms(free).join('').length, 'hive favours sibilants');
    const fey = gen({ genre: 'fey' });
    assert.ok(count(fey, ['l', 'r', 'j', 'w']) / forms(fey).join('').length > count(free, ['l', 'r', 'j', 'w']) / forms(free).join('').length, 'fey favour liquids and glides');
});

test('a bias weight of 0 removes a class completely', () => {
    const make = createWordFactory({ seed: 'z', consonants: 'european', mean: 2.5, onsetClusters: [], codaClusters: [], soundBias: { c: { stop: 0 }, v: {} } });
    for (let i = 0; i < 300; i++) assert.ok(!/[ptkbdg]/.test(make()), 'no stops');
});

test('user overrides still apply on top of a genre', () => {
    const L = gen({ genre: 'marine', morphology: 'isolating' });
    assert.equal(L.spec.morphology, 'isolating');
    assert.equal(L.genre.id, 'marine');
    assert.equal(L.syntax.prodrop, false);
});

test('option sweep over genres x morphology x order keeps every sample sentence', () => {
    let i = 0;
    for (const id of GENRE_IDS) for (const morphology of ['isolating', 'agglutinative', 'fusional']) {
        const order = OPTIONS.order[i++ % 6];
        const L = gen({ genre: id, morphology, order, seed: `sw${i}` });
        assert.deepEqual(L.skippedSamples, [], `${id}/${morphology}/${order}`);
    }
});

test('genre profile: the culture / biome / era a genre selects exist in the dictionary and agree with the genre weights', () => {
    const dims = { culture: 'cultures', biome: 'biomes', era: 'eras' };
    for (const g of Object.values(GENRES)) {
        assert.ok(g.profile && Object.keys(g.profile).every(k => k in dims), `${g.id}: profile keys`);
        for (const [k, v] of Object.entries(g.profile)) {
            assert.ok(vocabulary.filter(e => e[k].includes(v)).length >= 20, `${g.id}: ${k} "${v}" has too few entries`);
            assert.ok((g.semantics[dims[k]]?.[v] ?? 0) > 0, `${g.id}: ${k} "${v}" is not weighted by the genre`);
        }
    }
    // only where the genre has an identity: no genre selects all three dimensions
    assert.ok(Object.values(GENRES).every(g => Object.keys(g.profile).length < 3));
});
