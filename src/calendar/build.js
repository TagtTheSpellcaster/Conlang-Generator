// Builds the words and tables of a language's calendar from its plan, its lexicon and its numeral system.
// Pure and deterministic. Names are made of the language's own words (month names are "wolf moon"-type compounds, week days
// are numbered or named after the sky, hours take numerals) in the language's modifier-head order.
import { rng } from '../core/rng.js';
import { attach } from '../morphology/inflect.js';
import { ordinalForm, numeralForm, isDefined } from '../numerals/system.js';
import { generateNames, capWords } from '../names.js';
import { ARCHETYPES, RIGIDITY, DAY_PHASES, CANONICAL, PRAYERS, MONTH_WORDS as POOLS, monthPool } from './plan.js';

const CELESTIAL = 'sun moon fire water wood iron earth star wind stone'.split(' ');
const FIVE = ['fire', 'water', 'wood', 'iron', 'earth'];
const ANIMALS12 = ['wolf', 'bear', 'eagle', 'hawk', 'raven', 'fox', 'lion', 'stag', 'owl', 'crow', 'horse', 'bull'];
const SEASON_LISTS = {
    temperate: ['spring', 'summer', 'autumn', 'winter'], river: ['flood season', 'sowing season', 'harvest season'], pastoral: ['summer pasture', 'winter pasture'],
    sea: ['fair-wind season', 'storm season'], polar: ['winter', 'spring-winter', 'spring', 'early summer', 'summer', 'autumn-summer', 'autumn', 'early winter'],
    polar6: ['winter', 'spring', 'early summer', 'summer', 'autumn', 'early winter'], ritu: ['spring', 'summer', 'rainy season', 'autumn', 'early winter', 'winter']
};
const SEASON_CUES = {
    temperate: ['spring equinox', 'summer solstice', 'autumn equinox', 'winter solstice'], river: ['the river rises', 'the waters withdraw: sowing', 'the crops ripen'],
    pastoral: ['herds go to the high pastures', 'herds return to the winter camp'], sea: ['steady winds: voyages', 'storms: ships stay in harbour'],
    polar: ['deep cold', 'light returns', 'thaw', 'first green', 'midsummer, long light', 'light shortens', 'first frost', 'ice forms'],
    polar6: ['deep cold and darkness', 'thaw', 'long light', 'midsummer', 'first frost', 'ice forms'], ritu: ['spring', 'heat', 'rains', 'clear skies', 'first cold', 'deep cold']
};
const DEVICE_USE = {
    'shadow stick': 'length of the shadow tells the part of the day', 'notched stick': 'tally of days and moons', 'knotted cord': 'tally of days and moons', gnomon: 'noon and the solstices',
    sundial: 'hours of daylight', 'water clock': 'fixed intervals, day or night', 'candle clock': 'hours indoors and at night', 'incense clock': 'hours and quarter hours', 'sand glass': 'short fixed intervals',
    bell: 'announces the hours', 'signal drum': 'announces the hours and the watches', 'horn call': 'announces the watches', hourglass: 'short fixed intervals, ship watches', 'mechanical clock': 'equal hours by day and night',
    'striking clock': 'strikes the hours', 'clock tower': 'public time for the town', astrolabe: 'time from the stars and the sun', 'pendulum clock': 'precise hours and minutes', 'pocket watch': 'personal time',
    chronometer: 'precise time at sea', wristwatch: 'personal time', stopwatch: 'short intervals', 'quartz clock': 'accurate time', timetable: 'schedules for transport and work', 'atomic clock': 'reference time', timer: 'short intervals'
};
const DEVICE_ERA = [[0, ['shadow stick', 'notched stick', 'knotted cord']], [1, ['gnomon', 'sundial', 'water clock', 'candle clock', 'incense clock', 'sand glass', 'bell', 'signal drum', 'horn call']],
    [2, ['hourglass', 'mechanical clock', 'striking clock', 'clock tower', 'astrolabe']], [3, ['pendulum clock', 'pocket watch', 'chronometer']], [4, ['wristwatch', 'stopwatch', 'quartz clock', 'timetable']], [5, ['atomic clock', 'timer']]];

const CATEGORY = [[/instrument/, 'Instruments'], [/year/, 'Year'], [/season/, 'Seasons'], [/month|fortnight|market|moon/, 'Months and weeks'], [/day_parts|night|canonical|prayer/, 'Parts of the day'], [/hours|body/, 'Hours and small units']];
export const categoryOf = e => CATEGORY.find(([re]) => re.test(e.group ?? ''))?.[1] ?? 'General time words';

const shuffle = (list, r) => list.map(x => [r(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
const HOURS_AT = h => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

export function buildCalendar(plan, lang) {
    const { spec, lexicon, numerals } = lang;
    const c = plan.config;
    const r = rng(`${spec.seed}|calendar|names`);
    const byLemma = new Map();
    for (const e of lexicon) if (!byLemma.has(e.lemma) || (e.pos === 'noun' && byLemma.get(e.lemma).pos !== 'noun')) byLemma.set(e.lemma, e);
    const W = l => byLemma.get(l)?.form ?? null;
    const style = numerals.config.style;
    const glue = parts => (style === 'spaced' ? parts.join(' ') : parts.reduce((a, b) => a + attach(a, b, spec)));
    // modifier + head in the language's own order
    const mh = (mod, head) => glue(spec.adjPosition === 'before' ? [mod, head] : [head, mod]);
    const ord = k => (isDefined(numerals, k) ? ordinalForm(numerals, k, spec) : null);
    const num = k => (isDefined(numerals, k) ? numeralForm(numerals, k, spec).form : null);
    const have = list => list.filter(l => W(l));
    const row = (name, gloss, extra = {}) => ({ name, gloss, ...extra });

    // ---- seasons
    let seasons = [];
    if (c.seasons.count) {
        const lemmas = c.seasons.kind === 'tropical' ? (c.seasons.count === 2 ? ['rainy season', 'dry season'] : ['cool season', 'hot season', 'rainy season']) : SEASON_LISTS[c.seasons.kind] ?? [];
        const cues = c.seasons.kind === 'tropical' ? (c.seasons.count === 2 ? ['the rains arrive', 'the rains end'] : ['the rains end', 'dry heat', 'the rains arrive']) : SEASON_CUES[c.seasons.kind] ?? [];
        seasons = lemmas.map((l, i) => W(l) ? row(W(l), l, { begins: cues[i] ?? '' }) : null).filter(Boolean);
    }

    // ---- months
    const m = c.months;
    const pool = shuffle(have(POOLS[monthPool(c.archetype)].split(' ')), r);
    const moon = W('moon'), monthWord = W('month') ?? W('lunar month');
    const lunarish = ['lunar-observed', 'lunar-fixed', 'ecological'].includes(m.type) || c.year === 'lunar' || c.year === 'lunisolar';
    const headWord = lunarish && moon ? moon : monthWord;
    const headLemma = lunarish && moon ? 'moon' : 'month';
    const named = (k) => { const l = pool[k]; return l ? row(mh(W(l), headWord), `${l} ${headLemma}`) : null; };
    let months = [], yearDays = null;
    if (['numbered', 'thirteen'].includes(m.type)) {
        for (let k = 1; k <= m.count; k++) { const o = ord(k); if (o) months.push(row(mh(o, monthWord), `month ${k}`, { days: m.type === 'thirteen' ? 28 : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][k - 1] ?? 30 })); }
        if (m.type === 'thirteen' && W('epagomenal days')) months.push(row(W('epagomenal days'), 'day out of time', { days: 1 }));
        yearDays = m.type === 'thirteen' ? 365 : 365;
    } else if (m.type !== 'none') {
        const extra = new Set();
        if (m.type === 'irregular') shuffle([...Array(12).keys()], rng(`${spec.seed}|calendar|long`)).slice(0, 5).forEach(i => extra.add(i));
        for (let k = 0; k < m.count; k++) {
            const nm = named(k); if (!nm) continue;
            nm.days = m.type === 'lunar-fixed' ? (k % 2 ? 29 : 30) : m.type === 'lunar-observed' || m.type === 'ecological' ? '29 or 30 (observed)' : m.type === 'veintena' ? 20 : m.type === 'irregular' ? (extra.has(k) ? 31 : 30) : 30;
            months.push(nm);
        }
        if (m.epagomenal && W('epagomenal days')) months.push(row(W('epagomenal days'), 'days outside the months', { days: m.epagomenal }));
        if (m.intercalary && W('leap month')) months.push(row(W('leap month'), 'leap month (added every 2 or 3 years)', { days: 29 }));
    }
    const yearLength = { solar: '365.24 days', lunar: '354 or 355 days (drifts about 11 days a year against the seasons)', lunisolar: '354 days, with a leap month every 2 or 3 years (about 384)', sidereal: '365 days, from the first dawn rising of a bright star',
        ecological: 'no fixed count: the year runs from season to season' }[c.year];

    // ---- week
    const w = c.week;
    let week = [];
    const dayW = W('day');
    if (w.type === 'seven') have(CELESTIAL.slice(0, 7)).forEach(l => week.push(row(mh(W(l), dayW), `day of the ${l}`)));
    else if (w.type === 'five') FIVE.filter(l => W(l)).forEach(l => week.push(row(mh(W(l), dayW), `day of ${l}`)));
    else if (w.type === 'decade') for (let k = 1; k <= 10; k++) { const o = ord(k); if (o) week.push(row(mh(o, dayW), `day ${k} of 10`)); }
    else if (w.type === 'market') {
        const places = generateNames({ spec, lexicon }, { kind: 'place', count: w.length, salt: 7 });
        places.forEach((p, i) => week.push(row(p.name, `market day of ${p.meaning ?? 'the village'}`, { note: `day ${i + 1}` })));
    } else if (w.type === 'paksha') { for (const l of ['waxing fortnight', 'waning fortnight']) if (W(l)) week.push(row(W(l), l, { note: '14 or 15 days' })); }
    else for (const l of ['new moon', 'waxing moon', 'full moon', 'waning moon']) if (W(l)) week.push(row(W(l), l, { note: 'about 7 days' }));
    const weekDays = { seven: 7, five: 5, decade: 10, market: w.length, paksha: 15, phases: 7.4 }[w.type];

    // ---- division of the day
    const d = c.day;
    let day = [], dayNote = '', secondary = [];
    const nightWatches = k => { const rows = []; for (let i = 1; i <= k; i++) { const o = ord(i); if (o && W('watch')) rows.push(row(mh(o, W('watch')), `watch ${i} of the night`, { time: k === 4 ? `${HOURS_AT(18 + 3 * (i - 1))}–${HOURS_AT(18 + 3 * i)}` : `${HOURS_AT(18 + 4 * (i - 1))}–${HOURS_AT(18 + 4 * i)}` })); } return rows; };
    if (d.type === 'phases') {
        const times = ['05:00–06:00', '06:00–07:30', '07:30–10:00', '10:00–14:00', '14:00–17:00', '17:00–18:30', '18:30–20:00', '20:00–05:00'];
        day = DAY_PHASES.filter(l => W(l)).map(l => row(W(l), l, { time: times[DAY_PHASES.indexOf(l)] }));
        dayNote = 'No clocks: the day has descriptive names tied to the position of the sun and the heat.';
    } else if (d.type === 'temporal') {
        for (let k = 1; k <= 12; k++) { const o = ord(k), h = W('temporal hour'); if (o && h) day.push(row(mh(o, h), `daylight hour ${k}`, { time: '75 min in summer, 45 min in winter' })); }
        for (let k = 1; k <= 12; k++) { const o = ord(k), h = W('temporal hour'), n = W('night'); if (o && h && n) day.push(row(mh(mh(o, n), h), `night hour ${k}`, { time: '45 min in summer, 75 min in winter' })); }
        dayNote = 'Twelve hours of daylight and twelve of night: their length changes with the season.';
    } else if (d.type === 'double') {
        const animals = have(ANIMALS12), dh = W('double hour');
        animals.forEach((l, i) => day.push(row(mh(W(l), dh), `double hour of the ${l}`, { time: `${HOURS_AT((23 + 2 * i) % 24)}–${HOURS_AT((25 + 2 * i) % 24)}` })));
        dayNote = 'Twelve equal double hours of two hours each, each named after an animal.';
    } else if (d.type === 'watches') {
        day = nightWatches(d.count);
        dayNote = `The night is kept in ${d.count} watches; the day has no fixed hours (${[W('dawn'), W('noon'), W('sunset')].filter(Boolean).join(', ')}: dawn, noon, sunset).`;
    } else if (d.type === 'bells') {
        for (let i = 1; i <= 6; i++) { const o = ord(i); if (o && W('watch')) day.push(row(mh(o, W('watch')), `ship's watch ${i} (4 hours)`, { time: `${HOURS_AT((4 * (i - 1) + 20) % 24)}–${HOURS_AT((4 * i + 20) % 24)}` })); }
        const bell = W('bell stroke') ?? W('bell');
        for (let i = 1; i <= 8; i++) { const n = num(i); if (n && bell) secondary.push(row(mh(n, bell), `${i} bell${i > 1 ? 's' : ''}`, { time: `${i * 30} min into the watch` })); }
        dayNote = 'Six watches of four hours; a bell is struck every half hour, up to eight.';
    } else if (d.type === 'canonical') {
        const times = ['02:00', '05:00', '06:00', '09:00', '12:00', '15:00', '18:00', '20:00'];
        day = CANONICAL.filter(l => W(l)).map(l => row(W(l), l, { time: times[CANONICAL.indexOf(l)] }));
        dayNote = 'Eight hours of prayer, announced by the bell.';
    } else if (d.type === 'prayers') {
        const times = ['dawn', 'midday', 'afternoon', 'sunset', 'night'];
        day = PRAYERS.filter(l => W(l)).map(l => row(W(l), l, { time: times[PRAYERS.indexOf(l)] }));
        dayNote = `Five prayer times, announced by the call to prayer (${W('call to prayer') ?? ''}).`;
    } else if (d.type === 'equal' || d.type === 'decimal') {
        const n = d.type === 'decimal' ? 10 : d.hours, hw = W('equinoctial hour') ?? W('hour');
        for (let k = 1; k <= n; k++) { const nn = num(k); if (nn && hw) day.push(row(mh(nn, hw), `hour ${k}`, { time: d.type === 'decimal' ? `${(k - 1) * 2.4} h` : `${(k - 1) * 24 / n} h` })); }
        dayNote = d.type === 'decimal' ? 'Decimal time: 10 hours of 100 minutes, each of 100 seconds.' : d.minutes ? `${n} equal hours of ${d.minutes} minutes; ${d.minutes} seconds to the minute.` : `${n} equal hours, each of two modern hours.`;
    }
    if (c.also === 'prayers') secondary.push(...PRAYERS.filter(l => W(l)).map(l => row(W(l), l, { time: 'fixed religious hour' })));
    if (c.also === 'watches') secondary.push(...nightWatches(4));

    // ---- short durations and instruments
    const small = [];
    if (c.subunits === 'body') for (const [l, t] of [['breath', 'about 4 seconds'], ['heartbeat', 'about 1 second'], ['blink of an eye', 'a fraction of a second'], ['meal time', 'about 20 minutes']]) if (W(l)) small.push(row(W(l), l, { time: t }));
    if (c.subunits === 'math' || ['equal', 'decimal'].includes(d.type)) for (const [l, t] of [['quarter hour', '15 minutes'], ['half hour', '30 minutes'], ['minute', '1/60 of an hour'], ['second', '1/60 of a minute'], ['sixtieth part', '1/60'], ['hundredth part', '1/100']]) if (W(l)) small.push(row(W(l), l, { time: t }));
    if (c.subunits === 'devices' && d.type === 'double' && W('quarter hour')) small.push(row(W('quarter hour'), 'quarter hour', { time: '15 minutes (the quarter of a double hour is 30)' }));
    const instruments = [];
    for (const [i, list] of DEVICE_ERA) if (i <= c.eraIndex) for (const l of list) if (W(l)) instruments.push(row(W(l), l, { use: DEVICE_USE[l] }));

    // ---- vocabulary table: every time word of the dictionary
    const vocabulary = lexicon.filter(e => e.domain === 'time' || e.tags?.includes('calendar')).map(e => ({ category: categoryOf(e), english: e.lemma, word: e.form, pos: e.pos }))
        .sort((a, b) => a.category.localeCompare(b.category) || a.english.localeCompare(b.english));

    // ---- logic table: each decision and the rule behind it
    const yearRule = c.archetype === 'pastoral' && ['lunar'].includes(c.year) ? 'herders do not depend on the harvest, so a pure lunar year is acceptable' : ['agrarian', 'monsoon', 'urban'].includes(c.archetype) ? 'intensive farming needs the seasons to stay in step: solar, lunisolar or star-timed year' : 'no crop to time: observation decides';
    const startsOn = c.dayStart;
    const logic = [
        { dimension: 'Technology', choice: `${c.era} (${RIGIDITY[c.rigidity]})`, rule: `Era ${c.eraSource === 'drawn' ? 'drawn at random' : c.eraSource === 'genre' ? 'taken from the genre' : 'chosen by the user'}; the more advanced, the more rigid and standardised the units.` },
        { dimension: 'Way of life', choice: ARCHETYPES[c.archetype], rule: `${c.archetypeSource === 'drawn' ? 'Drawn at random' : `Taken from the ${c.archetypeSource}`}${c.military ? '; military culture adds night watches' : ''}${c.religious ? '; religious culture adds fixed prayer times' : ''}.` },
        { dimension: 'Number base', choice: spec.numeralSystem.type, rule: c.restricted ? 'Restricted numbers: no numbered months, hours or days.' : 'Numbered units use the language\'s own numerals.' },
        { dimension: 'Year', choice: `${c.year[0].toUpperCase()}${c.year.slice(1)} year: ${yearLength}`, rule: yearRule },
        { dimension: 'Seasons', choice: c.seasons.count ? `${c.seasons.count} (${c.seasons.kind})` : 'none (no natural seasons)', rule: 'Latitude and biome: polar 6-8, temperate 4, tropical 2-3; herders 2 pastures; seafarers 2 wind seasons.' },
        { dimension: 'Months', choice: m.type === 'none' ? 'none: the year is counted in seasons and weeks' : `${m.type} (${m.count}${m.epagomenal ? ` + ${m.epagomenal} extra days` : ''}${m.intercalary ? ', leap month' : ''})`, rule: c.rigidity === 0 ? 'No writing or calculation: no fixed 30-day months and no epagomenal days.' : 'Fixed month lengths only where calculation exists.' },
        { dimension: 'Week', choice: { seven: '7 days', five: '5 days', decade: '10-day decade', market: `${w.length}-day market cycle`, paksha: 'two fortnights', phases: 'no week: moon phases' }[w.type], rule: w.type === 'market' ? 'Neighbouring villages trade in turn: each day is named after the village whose market it is.' : w.type === 'phases' ? 'Isolated, nomadic or pre-writing peoples count moon phases.' : 'The week has no astronomical basis and is set by custom or law.' },
        { dimension: 'Day begins', choice: startsOn === 'sunset' ? 'at sunset' : startsOn === 'midnight' ? 'at midnight' : 'at dawn', rule: startsOn === 'sunset' ? 'Lunar reckoning: the crescent appears at sunset.' : startsOn === 'midnight' ? 'Clock time of a standardised society.' : 'Solar reckoning in a pre-industrial society.' },
        { dimension: 'Division of the day', choice: ({ phases: 'descriptive phases of the day', temporal: '12 daylight + 12 night hours (unequal)', double: '12 double hours', watches: `${d.count} night watches`, bells: '6 ship watches with bells', canonical: '8 canonical hours', prayers: '5 prayer times', equal: `${d.hours} equal hours`, decimal: 'decimal time (10 × 100 × 100)' })[d.type], rule: 'Chosen by technology and way of life.' },
        { dimension: 'Short durations', choice: { body: 'body actions (a breath, a meal)', devices: 'instruments (candle, sand, water, bells)', math: 'mathematical fractions of the hour' }[c.subunits], rule: 'The more technology, the more abstract the small units.' }
    ];
    if (c.also) logic.push({ dimension: 'Also kept', choice: c.also === 'prayers' ? 'fixed prayer times' : 'night watches', rule: 'Older custom survives next to the clock.' });
    months.forEach(x => { x.name = capWords(x.name); });
    week.forEach(x => { x.name = capWords(x.name); });
    return { config: c, logic, seasons, months, yearLength, yearDays, week, weekDays, day, dayNote, secondary, small, instruments, vocabulary };
}
