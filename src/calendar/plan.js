// Calendar plan: decides how a language reckons time (year, seasons, months, week, day) from its culture, biome and era,
// and lists the dictionary entries the calendar needs. Pure and deterministic.
// Rules (after the time-measurement matrix):
//   - rigidity grows with technology: observation and nature (0), observed or simple fixed cycles (1), fixed rules and bells (2), equal units and clocks (3);
//   - intensive agriculture needs a solar or lunisolar year; a pure lunar year belongs to pastoralists;
//   - without writing and calculation (rigidity 0) there are no fixed 30-day months and no epagomenal days;
//   - markets between neighbouring villages give a short week named after the villages; isolated or nomadic peoples count moon phases;
//   - the biome sets the number of seasons: polar 6-8, temperate 4, tropical 2-3;
//   - lunar calendars begin the day at sunset; solar ones at dawn, or at midnight once clocks exist;
//   - a restricted numeral system (1-2-3-many) cannot count numbered units: months, hours and weeks are described, not numbered.
import { rng } from '../core/rng.js';
import { ERA_ORDER } from '../lexicon/select.js';
import { GENRES } from '../genres.js';

export const RIGIDITY = Object.freeze([
    'Nature-bound (no writing, no clocks)', 'Early calendar (observed cycles, simple devices)',
    'Fixed rules (set months, canonical hours or bells)', 'Standardised (equal units, clocks)'
]);
const ERA_RIGIDITY = [0, 1, 2, 2, 3, 3];
const GENRE_ERA = { giant: 0, orcish: 0, draconic: 1, nomad: 1, sacred: 1, hive: 1, war: 2, marine: 2, fey: 2, dwarven: 2, infernal: 2, arcane: 2, women: 2, artisan: 2, thieves: 2, undead: 2, merchant: 3, machine: 5 };
const ERA_WEIGHTS = [1, 2, 4, 1.5, 1.5, 1];
export const ARCHETYPES = Object.freeze({
    agrarian: 'Settled farmers (rivers, plains)', monsoon: 'Tropical / monsoon farmers', pastoral: 'Herders and nomads',
    hunter: 'Hunter-gatherers', maritime: 'Seafarers and islanders', urban: 'Urban / bureaucratic'
});
const CULTURE_ARCHETYPE = { nomadic: 'pastoral', pastoral: 'pastoral', hunter_gatherer: 'hunter', tribal: 'hunter', shamanic: 'hunter', animist: 'hunter', maritime: 'maritime',
    agrarian: 'agrarian', rural: 'agrarian', feudal: 'agrarian', communal: 'agrarian', urban: 'urban', mercantile: 'urban', bureaucratic: 'urban', technocratic: 'urban', industrial: 'urban',
    corporate: 'urban', imperial: 'urban', post_industrial: 'urban', spacefaring: 'urban', posthuman: 'urban', scholarly: 'urban' };
const BIOME_ARCHETYPE = { ocean: 'maritime', desert: 'pastoral', grassland: 'pastoral', savanna: 'monsoon', tropical: 'monsoon', wetland: 'monsoon', tundra: 'hunter', arctic: 'hunter', space: 'urban', temperate: 'agrarian', forest: 'agrarian', freshwater: 'agrarian', alpine: 'agrarian', mountain: 'agrarian' };
const POLAR = new Set(['tundra', 'arctic']), TROPICAL = new Set(['tropical', 'savanna', 'wetland']);

const pickWeighted = (table, x) => {
    const entries = Object.entries(table), total = entries.reduce((s, [, w]) => s + w, 0);
    let t = x * total;
    for (const [k, w] of entries) { t -= w; if (t < 0) return k; }
    return entries[entries.length - 1][0];
};
const count = (list, map) => list.reduce((acc, c) => { const a = map[c]; if (a) acc[a] = (acc[a] ?? 0) + 1; return acc; }, {});

// Words (dictionary lemmas, nouns) the month names are drawn from, by way of life.
export const monthPool = archetype => (archetype === 'urban' ? 'agrarian' : archetype);
export const MONTH_WORDS = {
    hunter: 'wolf bear deer fish bird snow ice frost rain wind flower berry leaf seed fox hawk salmon mud cloud thunder',
    pastoral: 'horse wolf eagle snow frost rain wind grass flower seed grain star storm lamb sheep dust thunder cloud sand',
    agrarian: 'seed grain flower leaf rain frost snow harvest fruit grape ash wind mud straw honey bee fog cloud storm',
    monsoon: 'rain flood seed grain flower leaf wind cloud fruit bird fish mud thunder lightning heat fog storm river',
    maritime: 'fish wave wind storm tide shell bird rain cloud star salt fog gull foam anchor net current seal',
    urban: 'star sun moon fire water wind stone gold iron'
};
const CELESTIAL = 'sun moon fire water wood iron earth star wind stone'.split(' ');
export const DAY_PHASES = ['first light', 'dawn', 'early morning', 'high sun', 'afternoon', 'sundown', 'twilight', 'deep night'];
export const CANONICAL = ['matins', 'lauds', 'prime', 'terce', 'sext', 'nones', 'vespers', 'compline'];
export const PRAYERS = ['dawn prayer', 'noon prayer', 'afternoon prayer', 'sunset prayer', 'night prayer'];
const DEVICES = [
    [0, ['shadow stick', 'notched stick', 'knotted cord']], [1, ['gnomon', 'sundial', 'water clock', 'candle clock', 'incense clock', 'sand glass', 'bell', 'signal drum', 'horn call']],
    [2, ['hourglass', 'mechanical clock', 'striking clock', 'clock tower', 'astrolabe']], [3, ['pendulum clock', 'pocket watch', 'chronometer']],
    [4, ['wristwatch', 'stopwatch', 'quartz clock', 'timetable']], [5, ['atomic clock', 'timer']]
];

export function resolveCalendar(spec, input = {}) {
    const notes = [];
    const r = rng(`${spec.seed}|calendar`);
    const d = Array.from({ length: 12 }, () => r());
    const eras = (spec.era ?? []).map(x => ERA_ORDER.indexOf(x)).filter(i => i >= 0);
    const restricted = spec.numeralSystem?.type === 'restricted';

    // technology: the latest era chosen, else the genre's, else a weighted draw
    let eraIndex, eraSource;
    if (eras.length) { eraIndex = Math.max(...eras); eraSource = 'era chosen'; }
    else if (GENRE_ERA[spec.genre] !== undefined) { eraIndex = GENRE_ERA[spec.genre]; eraSource = 'genre'; }
    else { eraIndex = ERA_ORDER.indexOf(pickWeighted(Object.fromEntries(ERA_ORDER.map((e, i) => [e, ERA_WEIGHTS[i]])), d[0])); eraSource = 'drawn'; }
    const rigidity = ERA_RIGIDITY[eraIndex];

    // way of life: the culture(s) chosen, else the biome, else the genre's culture, else a draw
    // a genre that has not been spelled out in the filters still has its own culture and biome
    const profile = GENRES[spec.genre]?.profile ?? {};
    const cultures = spec.culture?.length ? spec.culture : [profile.culture].filter(Boolean);
    const biomes = spec.biome?.length ? spec.biome : [profile.biome].filter(Boolean);
    const fromCulture = count(cultures, CULTURE_ARCHETYPE), fromBiome = count(biomes, BIOME_ARCHETYPE);
    const military = cultures.some(c => ['warrior', 'militaristic'].includes(c));
    const religious = cultures.some(c => ['religious', 'monastic', 'theocratic'].includes(c));
    let archetype, archetypeSource;
    const best = t => Object.entries(t).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (best(fromCulture)) { archetype = best(fromCulture); archetypeSource = 'culture'; }
    else if (best(fromBiome)) { archetype = best(fromBiome); archetypeSource = 'biome'; }
    else { archetype = pickWeighted({ agrarian: 30, monsoon: 12, pastoral: 12, hunter: 12, maritime: 12, urban: 20 }, d[1]); archetypeSource = 'drawn'; }
    if (rigidity <= 1 && archetype === 'urban') { archetype = 'agrarian'; if (archetypeSource === 'culture') notes.push('Calendar: no urban bureaucracy before writing and mathematics; the people are treated as settled farmers.'); }
    if (rigidity === 0 && archetype === 'agrarian' && archetypeSource === 'drawn') archetype = 'hunter';

    // latitude from the biome
    const polar = biomes.some(b => POLAR.has(b)) || (archetype === 'hunter' && !biomes.length && d[2] < 0.4);
    const tropical = biomes.some(b => TROPICAL.has(b)) || archetype === 'monsoon';
    const desert = biomes.includes('desert');
    const space = biomes.includes('space');

    // year
    const intensive = ['agrarian', 'monsoon', 'urban'].includes(archetype);
    let year;
    if (rigidity === 3) year = archetype === 'pastoral' && d[3] < 0.3 ? 'lunar' : 'solar';
    else if (intensive) year = rigidity === 0 ? 'solar' : (archetype === 'monsoon' && d[3] < 0.35 ? 'sidereal' : d[3] < 0.6 ? 'solar' : 'lunisolar');
    else if (archetype === 'pastoral') year = rigidity === 0 ? 'ecological' : d[3] < 0.75 ? 'lunar' : 'lunisolar';
    else if (archetype === 'maritime') year = rigidity === 0 ? 'sidereal' : d[3] < 0.5 ? 'lunisolar' : d[3] < 0.8 ? 'sidereal' : 'solar';
    else year = rigidity >= 2 && d[3] < 0.4 ? 'solar' : d[3] < 0.55 ? 'sidereal' : 'ecological';
    if (intensive && ['lunar', 'ecological'].includes(year)) year = 'solar';   // rule: intensive agriculture never runs on a pure lunar year

    // seasons
    let seasons;
    if (space) seasons = { count: 0, kind: 'none' };
    else if (polar) seasons = { count: d[4] < 0.5 ? 6 : 8, kind: 'polar' };
    else if (archetype === 'pastoral') seasons = { count: 2, kind: desert ? 'pastoral' : 'pastoral' };
    else if (archetype === 'maritime' && !biomes.some(b => ['temperate', 'forest'].includes(b))) seasons = { count: 2, kind: 'sea' };
    else if (tropical) { const c = d[4] < 0.45 ? 2 : d[4] < 0.9 ? 3 : 6; seasons = { count: c, kind: c === 3 && archetype === 'agrarian' ? 'river' : 'tropical' }; }
    else if (archetype === 'agrarian' && rigidity <= 1 && d[4] < 0.2) seasons = { count: 3, kind: 'river' };
    else if (archetype === 'hunter') seasons = { count: d[4] < 0.5 ? 4 : 6, kind: d[4] < 0.5 ? 'temperate' : 'polar' };
    else seasons = { count: 4, kind: 'temperate' };
    if (seasons.count === 6 && seasons.kind === 'polar') seasons.kind = 'polar6';
    if (seasons.count === 6 && seasons.kind === 'tropical') seasons.kind = 'ritu';

    // months
    let months;
    const lunarYear = ['lunar', 'lunisolar'].includes(year);
    if (rigidity >= 2 && space) months = { type: 'numbered', count: 10 };
    else if (restricted) months = { type: 'ecological', count: 12 };
    else if (rigidity === 3) months = d[5] < 0.15 ? { type: 'thirteen', count: 13 } : { type: 'numbered', count: 12 };
    else if (year === 'lunar') months = { type: rigidity >= 2 ? 'lunar-fixed' : 'lunar-observed', count: 12 };
    else if (year === 'lunisolar') months = { type: rigidity >= 2 ? 'lunar-fixed' : 'lunar-observed', count: 12, intercalary: true };
    else if (year === 'solar') {
        if (rigidity === 0) months = { type: 'ecological', count: 12 };
        else if (rigidity === 1) months = intensive && d[5] < 0.4 ? { type: 'thirty', count: 12, epagomenal: 5 } : { type: 'lunar-observed', count: 12, intercalary: false, driftNote: true };
        else months = d[5] < 0.5 ? { type: 'irregular', count: 12 } : d[5] < 0.8 ? { type: 'thirty', count: 12, epagomenal: 5 } : (spec.numeralSystem?.type === 'vigesimal' || d[5] > 0.95) ? { type: 'veintena', count: 18, epagomenal: 5 } : { type: 'irregular', count: 12 };
    } else months = rigidity >= 2 && d[5] < 0.3 ? { type: 'irregular', count: 12 } : d[5] < 0.1 && rigidity <= 2 ? { type: 'none', count: 0 } : { type: 'ecological', count: d[5] < 0.6 ? 12 : 13 };
    if (months.type === 'none' && !['solar', 'sidereal', 'ecological'].includes(year)) months = { type: 'ecological', count: 12 };
    if (rigidity === 0 && ['thirty', 'veintena', 'irregular', 'numbered', 'thirteen'].includes(months.type)) months = { type: 'ecological', count: 12 };

    // week
    let week;
    const villages = ['agrarian', 'monsoon'].includes(archetype) && rigidity >= 1 || (archetype === 'maritime' && rigidity >= 2);
    if (restricted || rigidity === 0 || ['hunter'].includes(archetype) && rigidity < 2) week = { type: 'phases', length: 4 };
    else if (archetype === 'pastoral') week = rigidity >= 2 && d[6] < 0.5 ? { type: 'seven', length: 7 } : { type: 'phases', length: 4 };
    else if (religious && rigidity >= 1) week = { type: 'seven', length: 7 };
    else if (rigidity === 3) week = { type: pickWeighted({ seven: 70, decade: 10, five: 20 }, d[6]) };
    else if (archetype === 'maritime') week = d[6] < 0.5 ? { type: 'paksha', length: 15 } : { type: 'seven', length: 7 };
    else if (villages && d[6] < 0.6) week = { type: 'market', length: [3, 4, 5, 6, 8][Math.floor(d[7] * 5)] };
    else if (rigidity === 1 && intensive && d[6] < 0.8) week = { type: 'decade', length: 10 };
    else week = { type: 'seven', length: 7 };
    if (week.type === 'five') week.length = 5; if (week.type === 'seven') week.length = 7; if (week.type === 'decade') week.length = 10;
    if (months.type === 'thirteen') week = { type: 'seven', length: 7 };

    // start of the day
    const dayStart = lunarYear || year === 'ecological' && archetype === 'pastoral' ? 'sunset' : rigidity === 3 ? 'midnight' : 'dawn';

    // division of the day
    let day;
    const night = military || archetype === 'maritime';
    if (restricted || rigidity === 0 || archetype === 'hunter' && rigidity < 2) day = { type: 'phases' };
    else if (rigidity === 1) day = night && d[8] < 0.6 ? { type: 'watches', count: archetype === 'maritime' ? 3 : 4 } : religious && d[8] < 0.5 ? { type: 'prayers' } : archetype === 'pastoral' ? { type: 'phases' } : d[8] < 0.5 ? { type: 'temporal' } : d[8] < 0.75 ? { type: 'double' } : { type: 'phases' };
    else if (rigidity === 2) day = night && d[8] < 0.7 ? { type: eraIndex === 3 || archetype === 'maritime' ? 'bells' : 'watches', count: 4 } : religious ? { type: d[8] < 0.5 ? 'canonical' : 'prayers' } : eraIndex === 3 ? { type: 'equal', hours: 24, minutes: 60 } : d[8] < 0.5 ? { type: 'temporal' } : { type: 'equal', hours: 12, minutes: 0 };
    else day = d[8] < 0.2 && spec.numeralSystem?.type === 'decimal' ? { type: 'decimal' } : { type: 'equal', hours: 24, minutes: 60 };
    const also = rigidity >= 3 ? (religious ? 'prayers' : military || archetype === 'maritime' ? 'watches' : null) : null;

    const subunits = day.type === 'phases' ? 'body' : rigidity === 1 ? 'devices' : rigidity === 2 ? 'devices' : 'math';
    const config = { eraIndex, era: ERA_ORDER[eraIndex], eraSource, rigidity, archetype, archetypeSource, year, seasons, months, week, dayStart, day, also, subunits, restricted, military, religious };
    if (restricted) notes.push('Calendar: a restricted numeral system cannot number months, weeks or hours, so they are named by events and phases.');
    return { config, notes };
}

// Dictionary lemmas (nouns unless noted) the calendar needs; null = not in this language's dictionary.
export function calendarLemmas(config) {
    const L = new Set(['year', 'season', 'month', 'week', 'day', 'night', 'moon', 'sun', 'hour', 'dawn', 'sunset', 'midnight', 'noon', 'calendar']);
    const add = (...l) => l.flat().forEach(x => L.add(x));
    const { year, seasons, months, week, day, rigidity, archetype } = config;
    add(year === 'lunar' ? 'lunar year' : year === 'solar' ? 'solar year' : year === 'lunisolar' ? 'lunisolar year' : year === 'sidereal' ? ['sidereal year', 'heliacal rising'] : 'cycle of years');
    add('solstice', 'equinox');
    if (config.months.intercalary) add('leap month');
    if (months.epagomenal) add('epagomenal days');
    // seasons
    const SEASONS = { temperate: ['spring', 'summer', 'autumn', 'winter'], river: ['flood season', 'sowing season', 'harvest season'], pastoral: ['summer pasture', 'winter pasture'],
        sea: ['fair-wind season', 'storm season'], polar: ['winter', 'spring-winter', 'spring', 'early summer', 'summer', 'autumn-summer', 'autumn', 'early winter'],
        polar6: ['winter', 'spring', 'early summer', 'summer', 'autumn', 'early winter'], ritu: ['spring', 'summer', 'rainy season', 'autumn', 'early winter', 'winter'] };
    if (seasons.kind === 'tropical') add(seasons.count === 2 ? ['rainy season', 'dry season'] : ['cool season', 'hot season', 'rainy season']);
    else if (SEASONS[seasons.kind]) add(SEASONS[seasons.kind]);
    // months
    if (['lunar-fixed', 'lunar-observed', 'ecological'].includes(months.type)) add('lunar month', 'new moon', 'full moon');
    if (['lunar-fixed', 'lunar-observed', 'ecological', 'thirty', 'irregular', 'veintena'].includes(months.type)) add(...MONTH_WORDS[monthPool(archetype)].split(' '));
    if (months.type === 'thirteen') add('epagomenal days');
    if (months.type === 'lunar-observed') add('moon sighting');
    // week
    if (week.type === 'phases') add('new moon', 'full moon', 'waxing moon', 'waning moon');
    if (week.type === 'seven') add(...CELESTIAL.slice(0, 7));
    if (week.type === 'market') add('market day', 'market village');
    if (week.type === 'paksha') add('waxing fortnight', 'waning fortnight', 'fortnight');
    if (week.type === 'five') add('fire', 'water', 'wood', 'iron', 'earth');
    if (week.type === 'seven') add('rest day');
    // day
    if (day.type === 'phases') add(['first light', 'dawn', 'early morning', 'high sun', 'afternoon', 'sundown', 'twilight', 'deep night'], 'breath', 'heartbeat', 'meal time', 'blink of an eye');
    if (['watches', 'bells'].includes(day.type) || config.also === 'watches') add('night watch', 'watch', 'first watch', 'second watch', 'third watch', 'fourth watch', 'bell', 'bell stroke');
    if (day.type === 'temporal') add('temporal hour');
    if (day.type === 'double') add('double hour', 'wolf', 'bear', 'eagle', 'hawk', 'raven', 'fox', 'lion', 'stag', 'owl', 'crow', 'horse', 'bull');
    if (day.type === 'canonical') add(CANONICAL, 'bell');
    if (day.type === 'prayers' || config.also === 'prayers') add(PRAYERS, 'call to prayer');
    if (day.type === 'equal' || day.type === 'decimal') add('equinoctial hour', 'minute', 'second', 'quarter hour', 'half hour');
    if (day.type === 'decimal') add('decimal hour', 'hundredth part');
    if (day.type === 'equal' && day.minutes) add('sixtieth part');
    // instruments of the era
    for (const [i, list] of DEVICES) if (i <= config.eraIndex) add(list.filter(x => deviceFits(x, config)));
    return [...L];
}

// Which instruments a language of this kind names (not every culture has a candle clock or an astrolabe).
function deviceFits(x, config) {
    const { rigidity, archetype, day } = config;
    if (x === 'shadow stick') return true;
    if (x === 'notched stick' || x === 'knotted cord') return rigidity === 0 || archetype === 'hunter';
    if (x === 'incense clock') return day.type === 'double' || rigidity >= 2 && archetype === 'urban';
    if (['signal drum', 'horn call', 'bell'].includes(x)) return ['watches', 'bells', 'canonical', 'prayers'].includes(day.type) || rigidity >= 2;
    if (x === 'astrolabe') return archetype === 'maritime' || config.religious || archetype === 'urban';
    if (x === 'sand glass') return archetype === 'maritime' || rigidity >= 2;
    if (['clock tower', 'striking clock'].includes(x)) return archetype === 'urban' || config.religious || rigidity >= 3;
    return true;
}
