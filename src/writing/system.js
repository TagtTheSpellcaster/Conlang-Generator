// Writing systems for the language (the daughter), in four kinds: alphabet, abjad, abugida and syllabary.
// Logographic systems are not offered. Spelling is mostly phonemic; a language may keep the spelling of an older
// sound (k before i or e written k and read ʃ, as Italian writes gn or Italian "c" before e/i): those are the reading rules,
// each valid for nearly every word; the words that do not follow them carry an exception mark.
import { rng } from '../core/rng.js';
import { makeGlyphs, makeMarks, cellSvg, ligature, MARK_SHAPES } from './glyphs.js';

export const WRITING_TYPES = ['alphabet', 'abjad', 'abugida', 'syllabary'];
export const WRITING_LABELS = { alphabet: 'Alphabet', abjad: 'Abjad', abugida: 'Abugida', syllabary: 'Syllabary' };
const STYLES = ['angular', 'curvy', 'mixed', 'geometric'];

// default kind and style of letters by genre (the culture)
const BY_GENRE = {
    dwarven: ['alphabet', 'angular'], orcish: ['alphabet', 'angular'], giant: ['alphabet', 'angular'], war: ['alphabet', 'angular'], machine: ['alphabet', 'geometric'],
    merchant: ['alphabet', 'mixed'], women: ['alphabet', 'curvy'], artisan: ['alphabet', 'mixed'], fey: ['abugida', 'curvy'], infernal: ['abugida', 'angular'],
    draconic: ['abugida', 'mixed'], sacred: ['abjad', 'curvy'], arcane: ['abjad', 'mixed'], nomad: ['abjad', 'mixed'], undead: ['abjad', 'angular'],
    marine: ['syllabary', 'curvy'], thieves: ['syllabary', 'mixed'], hive: ['syllabary', 'geometric']
};

const VOWEL_LETTERS = new Set([...'aeiouyøæ']);
const words = lexicon => [...new Set(lexicon.flatMap(e => e.form.split(' ')))].filter(Boolean);

// ---- spelling rules that keep an older sound -------------------------------------------------------------------
// Each is built from a rule of the language's own history; read(written) -> spoken, write(spoken) -> written.
function conservativeRules(history, isV) {
    const out = [];
    const mapRule = (rule, from, to, context) => {
        const f = new Map(from.map((x, i) => [x, to[i]])), inv = new Map(to.map((x, i) => [x, from[i]]));
        const inside = (s, i) => isV(s[i - 1] ?? '') && isV(s[i + 1] ?? '');
        return { id: rule.id, label: `${from.join(' ')} → ${to.join(' ')} ${context}`, read: s => [...s].map((ch, i) => f.has(ch) && inside(s, i) ? f.get(ch) : ch).join(''), write: s => [...s].map((ch, i) => inv.has(ch) && inside(s, i) ? inv.get(ch) : ch).join(''), text: `${from.join(' ')} between vowels are pronounced ${to.join(' ')}` };
    };
    for (const rule of history?.rules ?? []) {
        let m;
        if (rule.id === 'palatalization' && (m = rule.label.match(/^k → (\S+) before i, e$/))) {
            const to = m[1];
            out.push({ id: rule.id, text: `k before i or e is pronounced ${to}`, read: s => s.replace(/k(?=[ie])/g, to), write: s => s.replace(new RegExp(`${to}(?=[ie])`, 'g'), 'k') });
        } else if (rule.id === 'lenition' && (m = rule.label.match(/^(.+) → (.+) between vowels$/))) out.push(mapRule(rule, m[2].split(' '), m[1].split(' '), 'between vowels'));
        else if (rule.id === 'spirantization' && (m = rule.label.match(/^(.+) → (.+) between vowels$/))) out.push(mapRule(rule, m[2].split(' '), m[1].split(' '), 'between vowels'));
        else if (rule.id === 'rhotacism') out.push(mapRule(rule, ['r'], ['s'], 'between vowels'));
        else if (rule.id === 'nasal') out.push({ id: rule.id, text: 'n before p or b is pronounced m, before k or g pronounced ŋ', read: s => s.replace(/n(?=[pb])/g, 'm').replace(/n(?=[kg])/g, 'ŋ'), write: s => s.replace(/m(?=[pb])/g, 'n').replace(/ŋ(?=[kg])/g, 'n') });
    }
    // lenition and spirantization were written with (written, spoken) in the label order of the history: fix the direction
    return out;
}

// ---- units of a word -------------------------------------------------------------------------------------------
function consonantUnits(s, isV) {          // [{c, v}] : a consonant with the vowel that follows it, or a vowel without consonant
    const units = [];
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (isV(ch)) units.push({ c: null, v: ch });
        else if (isV(s[i + 1] ?? '')) { units.push({ c: ch, v: s[i + 1] }); i++; }
        else units.push({ c: ch, v: null });
    }
    return units;
}

export function buildWriting(lang, choice = 'auto') {
    const spec = lang.spec;
    const vset = new Set([...VOWEL_LETTERS, ...(spec.extraVowels ?? []), ...(lang.phonology?.vowels ?? [])]);
    const isV = ch => vset.has(ch);
    const lexWords = words(lang.lexicon);
    const r = rng(`${spec.seed}|writing|choice`);

    // kind and style
    const [gType, gStyle] = BY_GENRE[spec.genre] ?? [WRITING_TYPES[Math.floor(r() * 3) === 2 ? 2 : 0], STYLES[Math.floor(r() * 4)]];
    const rollType = WRITING_TYPES[Math.floor(r() * WRITING_TYPES.length)], rollStyle = STYLES[Math.floor(r() * STYLES.length)];
    const useGenre = r() < 0.75;
    const openShare = lexWords.filter(w => isV(w[w.length - 1])).length / lexWords.length;
    const clusterShare = lexWords.filter(w => /[^aeiouyøæ]{2}/.test(w)).length / lexWords.length;
    let type = choice !== 'auto' && WRITING_TYPES.includes(choice) ? choice : (useGenre ? gType : rollType);
    if (choice === 'auto') {
        if (type === 'syllabary' && (openShare < 0.7 || clusterShare > 0.35)) type = 'abugida';
        if (spec.era?.some(e => ['futuristic', 'modern'].includes(e))) type = 'alphabet';
    }
    const style = useGenre ? gStyle : rollStyle;
    const direction = type === 'abjad' && r() < 0.6 ? 'rtl' : 'ltr';

    // spelling rules: at most two, each affecting enough words and with few exceptions
    let rules = [];
    const rr = rng(`${spec.seed}|writing|rules`);
    if (type !== 'syllabary' && rr() < 0.65) {
        const candidates = conservativeRules(lang.history, isV).map(c => ({ c, k: rr() })).sort((a, b) => a.k - b.k).map(x => x.c);
        for (const c of candidates) {
            if (rules.length >= 2) break;
            const trial = [...rules, c];
            const written = w => trial.reduce((x, ru) => ru.write(x), w);
            const spoken = w => trial.reduce((x, ru) => ru.read(x), w);
            const differs = lexWords.filter(w => written(w) !== w).length, wrong = lexWords.filter(w => spoken(written(w)) !== w).length;
            const alone = c.write ? lexWords.filter(w => c.write(w) !== w).length : 0;
            if (alone / lexWords.length >= 0.03 && wrong / lexWords.length <= 0.04 && differs > 0) rules = trial;
        }
    }
    const write = w => rules.reduce((x, ru) => ru.write(x), w);
    const spokenFrom = s => rules.reduce((x, ru) => ru.read(x), s);
    const exceptions = new Set(lexWords.filter(w => spokenFrom(write(w)) !== w));
    const spelled = w => exceptions.has(w) ? w : write(w);        // what the letters say

    // inventory of signs actually needed
    const letters = new Set(lexWords.flatMap(w => [...spelled(w)]));
    const vowels = [...letters].filter(isV).sort(), consonants = [...letters].filter(c => !isV(c)).sort();
    const counts = new Map();
    for (const w of lexWords) for (const ch of spelled(w)) if (isV(ch)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    const inherent = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'a';
    // abjad: the two most useful vowels are written as letters (like Hebrew yod and waw), the others are left to the reader
    const matres = type === 'abjad' ? ['i', 'u', ...[...counts].sort((a, b) => b[1] - a[1]).map(x => x[0])].filter((v, i, a) => vowels.includes(v) && a.indexOf(v) === i).slice(0, 2) : [];
    const syllables = new Set();
    if (type === 'syllabary') for (const w of lexWords) for (const u of consonantUnits(spelled(w), isV)) syllables.add(`${u.c ?? ''}${u.v ?? ''}`);

    // ligatures: the commonest pairs become one sign (the conjuncts of an abugida, fi-like ligatures of an alphabet)
    const rl = rng(`${spec.seed}|writing|ligatures`);
    const ligRoll = rl(), joinRoll = rl();
    const pairCount = new Map();
    const countPairs = (a, b) => { const k = a + b; pairCount.set(k, (pairCount.get(k) ?? 0) + 1); };
    for (const w of lexWords) {
        const seenHere = new Set(), t = spelled(w);
        if (type === 'alphabet') for (let i = 0; i + 1 < t.length; i++) { if (isV(t[i]) === isV(t[i + 1]) && t[i] !== t[i + 1]) seenHere.add(t[i] + t[i + 1]); }
        else if (type === 'abugida') { const us = consonantUnits(t, isV); for (let i = 0; i + 1 < us.length; i++) if (us[i].c && us[i].v === null && us[i + 1].c) seenHere.add(us[i].c + us[i + 1].c); }
        for (const k of seenHere) countPairs(k[0], k[1]);
    }
    const limit = type === 'abugida' ? 14 : type === 'alphabet' && ligRoll < 0.75 ? 6 : 0;
    const minCount = Math.max(type === 'abugida' ? 6 : 8, Math.ceil(lexWords.length * (type === 'abugida' ? 0.012 : 0.006)));
    const ligPairs = new Set([...pairCount].filter(([, n]) => n >= minCount).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([k]) => k));
    const ligMode = type === 'abugida' ? 'half' : 'fused';
    const joined = (type === 'alphabet' || type === 'abjad') && (style === 'curvy' || style === 'mixed') && joinRoll < 0.5;

    // glyphs
    const seed = spec.seed;
    const sys = { type, style, direction, rules, exceptions, inherent, vowels, consonants, isV };
    const baseKeys = type === 'alphabet' ? [...letters].sort()
        : type === 'abjad' ? ['@', ...consonants, ...matres.map(v => `m:${v}`)]
            : type === 'abugida' ? [...consonants, ...vowels.map(v => `v:${v}`)]
                : consonants;
    const paths = makeGlyphs(seed, style, baseKeys.length + 1);
    const glyph = new Map(baseKeys.map((k, i) => [k, paths[i]]));
    const exceptionPath = paths[baseKeys.length];
    const markVowels = type === 'abjad' ? vowels.filter(v => !matres.includes(v)) : type === 'abugida' ? vowels.filter(v => v !== inherent) : [];
    const markList = makeMarks(seed, markVowels.length + 1);
    const mark = new Map(markVowels.map((v, i) => [v, markList[i]]));
    const zeroMark = markList[markVowels.length];                    // virama (abugida) or no-vowel sign (pointed abjad)
    const SYLLABARY_SHAPES = MARK_SHAPES.filter((d, i) => i !== 3);      // a lone dot is too faint for a component
    const shapes = type === 'syllabary' ? SYLLABARY_SHAPES : MARK_SHAPES;
    const ligGlyph = new Map([...ligPairs].map(k => [k, ligature(glyph.get(k[0]), glyph.get(k[1]), ligMode)]));
    const vowelShapes = new Map(vowels.map((v, i) => [v, shapes[(i + Math.floor(r() * 3)) % shapes.length]]));
    if (type === 'syllabary') { const used = new Set(); for (const [v] of vowelShapes) { let s = vowelShapes.get(v), k = 0; while (used.has(s) && k++ < 20) s = shapes[(shapes.indexOf(s) + 1) % shapes.length]; used.add(s); vowelShapes.set(v, s); } }

    // ---- cells (logical order) ---------------------------------------------------------------------------------
    // cell: { b: key of the base glyph, marks: [mark names], syl: 'ka' (syllabary), x: true (exception sign) }
    function cellsOf(word, pointed = true) {
        const s = spelled(word);
        const cells = exceptions.has(word) ? [{ x: true }] : [];
        if (type === 'alphabet') {
            for (let i = 0; i < s.length; i++) {
                if (i + 1 < s.length && ligPairs.has(s[i] + s[i + 1])) { cells.push({ b: `L:${s[i]}${s[i + 1]}` }); i++; } else cells.push({ b: s[i] });
            }
            return cells;
        }
        if (type === 'syllabary') return [...cells, ...consonantUnits(s, isV).map(u => ({ syl: `${u.c ?? ''}${u.v ?? ''}`, c: u.c, v: u.v }))];
        const units = consonantUnits(s, isV);
        for (let i = 0; i < units.length; i++) {
            const u = units[i], next = units[i + 1];
            if (type === 'abugida' && u.c && u.v === null && next?.c && ligPairs.has(u.c + next.c)) {
                cells.push({ b: `L:${u.c}${next.c}`, marks: next.v === null ? ['0'] : next.v === inherent ? [] : [next.v] });
                i++;
                continue;
            }
            if (u.c === null) {
                if (type === 'abugida') cells.push({ b: `v:${u.v}` });
                else if (matres.includes(u.v)) cells.push({ b: `m:${u.v}` });
                else if (pointed || i === 0) cells.push({ b: '@', marks: pointed ? [u.v] : [] });
                continue;
            }
            if (type === 'abugida') { cells.push({ b: u.c, marks: u.v === null ? ['0'] : u.v === inherent ? [] : [u.v] }); continue; }
            if (u.v && matres.includes(u.v)) { cells.push({ b: u.c, marks: [] }, { b: `m:${u.v}` }); continue; }
            cells.push({ b: u.c, marks: pointed ? [u.v ?? '0'] : [] });
        }
        return cells;
    }
    function readCells(cells) {
        let out = '', plain = false;
        for (const cell of cells) {
            if (cell.x) { plain = true; continue; }
            if (cell.b?.startsWith('L:')) out += cell.b.slice(2) + (type === 'abugida' ? (cell.marks[0] === '0' ? '' : cell.marks[0] ?? inherent) : '');
            else if (type === 'alphabet') out += cell.b;
            else if (type === 'syllabary') out += cell.syl;
            else if (cell.b === '@') out += cell.marks[0] ?? '';
            else if (cell.b.startsWith('m:')) out += cell.b.slice(2);
            else if (cell.b.startsWith('v:')) out += cell.b.slice(2);
            else if (type === 'abugida') out += cell.b + (cell.marks[0] === '0' ? '' : cell.marks[0] ?? inherent);
            else out += cell.b + (cell.marks[0] && cell.marks[0] !== '0' ? cell.marks[0] : '');
        }
        return plain ? out : spokenFrom(out);
    }

    // ---- drawing ------------------------------------------------------------------------------------------------
    function drawCell(cell, height = 38) {
        if (cell.x) return cellSvg({ base: exceptionPath, baseScale: 0.55 }, height);
        if (type === 'syllabary') {
            if (cell.c === null) return cellSvg({ vowelMark: null, base: null, marks: [] }, height).replace('</svg>', `<path d="${vowelShapes.get(cell.v)}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" transform="translate(1 6) scale(2.2)"/></svg>`).replace(/viewBox="[^"]*"/, 'viewBox="0 0 20 30"').replace(/width="[^"]*"/, `width="${Math.round(20 * height / 30)}"`);
            return cellSvg({ base: glyph.get(cell.c), baseScale: 0.8, vowelMark: cell.v ? vowelShapes.get(cell.v) : null, bar: !cell.v }, height);
        }
        const marks = (cell.marks ?? []).map(m => m === '0' ? zeroMark : mark.get(m)).filter(Boolean);
        return cellSvg({ base: cell.b.startsWith('L:') ? ligGlyph.get(cell.b.slice(2)) : glyph.get(cell.b), marks }, height);
    }
    const wordSvg = (word, height = 38, pointed = true) => `<span class="script-word${joined ? ' joined' : ''}" dir="${direction}">${cellsOf(word, pointed).map(c => drawCell(c, height)).join('')}</span>`;

    // ---- checks and statistics ------------------------------------------------------------------------------------
    const roundTrip = type === 'abjad' ? lexWords.filter(w => readCells(cellsOf(w, true)) !== w).length : lexWords.filter(w => readCells(cellsOf(w)) !== w).length;
    let homographs = 0;
    if (type === 'abjad') {
        const skeleton = new Map();
        for (const w of lexWords) { const k = cellsOf(w, false).map(c => c.b).join(''); skeleton.set(k, (skeleton.get(k) ?? 0) + 1); }
        homographs = [...skeleton.values()].filter(n => n > 1).reduce((a, b) => a + b, 0);
    }

    const ruleText = rules.map(x => x.text);
    const examplesOf = ru => lexWords.filter(w => ru.write(w) !== w && !exceptions.has(w)).slice(0, 3).map(w => ({ spoken: w, written: spelled(w) }));
    return {
        type, style, direction, inherent, ligatures: [...ligPairs], ligMode, joined, rules: rules.map(ru => ({ id: ru.id, text: ru.text, examples: examplesOf(ru) })), ruleText,
        exceptions: [...exceptions], exceptionShare: exceptions.size / lexWords.length,
        letters: { vowels, consonants, base: baseKeys, syllables: [...syllables].sort() },
        homographs: type === 'abjad' ? homographs : 0, words: lexWords.length, failures: roundTrip, openShare, clusterShare,
        spelled, cellsOf, readCells, drawCell, wordSvg, glyph, mark, zeroMark, vowelShapes, exceptionPath, isV, markVowels
    };
}
