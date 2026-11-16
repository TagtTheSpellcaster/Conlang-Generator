// Graphic grammar of the four kinds of writing. A tradition (core.js) fixes technology, proportions and ductus; here the
// letters are built from it by rules:
//  - alphabet: consonant letters come in families by place and manner (one radical per family, members told apart by a
//    modifier: the voiced one has a bar, and so on); vowels have their own small radicals; accented letters are the base
//    letter plus a diacritic; letters differ in height (ascenders and descenders) so words have a silhouette.
//  - abugida: a consonant body, optionally under a headline, and vowels as marks placed by vowel quality (above, below,
//    after) or as appendages grown out of the body; virama; conjuncts as reduced first members.
//  - abjad: letters in a non-joining hand, or a cursive one with bodies on a baseline that connect and change shape
//    (isolated, initial, medial, final); vowel points above and below.
//  - syllabary: a block with a consonant component and a vowel component (vowel = orientation of the consonant shape, or a
//    vowel stem beside or below it) so syllables of one consonant or one vowel look related.
import { rng } from '../core/rng.js';
import { ipaOfLetter } from '../ipa.js';
import { Y, VIEW_H, makeTradition, ductus, pathOf, skew, svgOf, bbox, place, shift, transform, mapPts, signature, distance, ink, sample } from './core.js';
import { radical, MODIFIER_NAMES, MODIFIERS, applyModifier } from './radicals.js';

const shuffle = (a, r) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const S = (pts, o = {}) => ({ pts, ...o });
export const CLASSES = ['labial', 'coronal', 'sibilant', 'dorsal', 'nasal', 'liquid', 'glide'];
export function consonantClass(letter) {
    const ipa = ipaOfLetter(letter) || letter, c = ipa[0];
    if ('mnɲŋɳ'.includes(c)) return 'nasal';
    if ('lrɾɬɹɭɽɫʎʀ'.includes(c)) return 'liquid';
    if ('szʃʒɕʑ'.includes(c) || /^(ts|dz|tʃ|dʒ)/.test(ipa)) return 'sibilant';
    if ('pbfvɸβ'.includes(c)) return 'labial';
    if ('tdθðʈɖ'.includes(c)) return 'coronal';
    if ('kgɡxɣqχɢʁ'.includes(c)) return 'dorsal';
    return 'glide';
}
const VOICED = new Set([...'bdgvzʒðɣɡβmnŋlrɾjw']);
const voiced = l => VOICED.has((ipaOfLetter(l) || l)[0]) ? 1 : 0;
const VOWEL_ORDER = 'aeiouyøæɨ';
const baseOf = ch => { const d = ch.normalize('NFD'); return d.length > 1 && /[a-z]/.test(d[0]) ? [d[0], [...d.slice(1)]] : [ch, []]; };

// ---- diacritics (also the accent signs of letters that are not in the table) ---------------------------------------------
function diacritic(cp, b) {
    const above = b.y0 - 3.2, below = b.y1 + 3.2;
    switch (cp) {
        case '́': return [S([[b.cx - 1.5, above + 1.6], [b.cx + 1.8, above - 1.2]])];
        case '̀': return [S([[b.cx + 1.5, above + 1.6], [b.cx - 1.8, above - 1.2]])];
        case '̂': return [S([[b.cx - 2.2, above + 1.5], [b.cx, above - 1.2], [b.cx + 2.2, above + 1.5]])];
        case '̈': return [{ dot: [b.cx - 1.8, above] }, { dot: [b.cx + 1.8, above] }];
        case '̃': return [S([[b.cx - 2.6, above + 0.6], [b.cx - 1, above - 1], [b.cx + 1, above + 1], [b.cx + 2.6, above - 0.6]], { smooth: true })];
        case '̄': return [S([[b.cx - 2.4, above], [b.cx + 2.4, above]])];
        case '̌': return [S([[b.cx - 2.2, above - 1.2], [b.cx, above + 1.5], [b.cx + 2.2, above - 1.2]])];
        case '̊': return [S([[b.cx, above - 1.6], [b.cx + 1.6, above], [b.cx, above + 1.6], [b.cx - 1.6, above]], { smooth: true, closed: true })];
        case '̧': return [S([[b.cx, b.y1], [b.cx + 0.4, below - 0.5], [b.cx - 1.6, below + 1.6]], { smooth: true })];
        case '̨': return [S([[b.x1 - 1, b.y1], [b.x1, below], [b.x1 + 1.8, below + 1.2]], { smooth: true })];
        case '̣': return [{ dot: [b.cx, below] }];
        case '̇': return [{ dot: [b.cx, above] }];
        default: return [S([[b.cx - 2, above], [b.cx + 2, above]])];
    }
}
const BELOW = new Set(['̧', '̨', '̣']);

// ---- a unit is something drawn in one piece: strokes in glyph coordinates, left edge at 0 -----------------------------------
const unitOf = (strokes, tr, extra = {}) => {
    const b = bbox(strokes);
    const st = shift(strokes, -b.x0, 0), w = b.w;
    return { strokes: st, w, adv: w + tr.spacing, ...extra };
};

export function buildGraphics(ctx) {
    let best = null;
    for (let attempt = 0; attempt < 10; attempt++) {
        const g = attemptGraphics(ctx, attempt);
        if (!best || g.quality.score < best.quality.score) best = g;
        if (g.quality.score === 0) break;
    }
    best.quality.attempts = best.quality.attempt + 1;
    return best.api;
}

function attemptGraphics(ctx, attempt) {
    const { spec, type, style, direction, isV, vowels, consonants, matres = [], inherent, markVowels = [], ligPairs = new Set(), ligMode, cursivePref } = ctx;
    const tr = makeTradition(spec.seed, { type, style, genre: spec.genre, era: spec.era ?? [], direction, tag: `${attempt}` });
    const r = rng(`${spec.seed}|graphics|${type}|${attempt}`);
    const finish = list => skew(ductus(list, tr), tr);
    const rtl = direction === 'rtl';
    const flip = (strokes, w) => rtl ? ductus(mapPts(strokes, ([x, y]) => [w - x, y]), tr) : strokes;
    const FORMS = tr.form;

    // radicals for the families
    const pickFlag = {};
    const rad = (name, k = 0) => { pickFlag[name] ??= Math.floor(r() * 2); return radical(name, FORMS, pickFlag[name] + k); };
    const SYM = ['bowl', 'cupU', 'capN', 'arcR', 'arcL', 'vee', 'spur', 'loopTail', 'zig', 'hook', 'tri', 'fork', 'cross', 'diag'];
    const ASYM = ['arcR', 'hook', 'spur', 'loopTail', 'zig', 'fork', 'diag'];
    const mods = shuffle(MODIFIER_NAMES, r);
    // modifiers of a family member: the first has none, the next ones one, then pairs
    const modsFor = idx => idx === 0 ? [] : idx <= mods.length ? [mods[idx - 1]] : [mods[(idx - 1) % mods.length], mods[(idx + 2) % mods.length]];

    // ---- families of consonants --------------------------------------------------------------------------------------------
    const baseSet = new Map();      // letter -> [base letter, diacritics]
    for (const l of [...consonants, ...vowels]) baseSet.set(l, baseOf(l));
    const consBases = [...new Set(consonants.map(c => baseSet.get(c)[0]))];
    const vowBases = [...new Set(vowels.map(v => baseSet.get(v)[0]))].sort((a, b) => (VOWEL_ORDER.indexOf(a) + 1 || 99) - (VOWEL_ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b));
    const famRadical = {}, famZone = {}, famSide = {};
    const pool = shuffle(type === 'syllabary' ? ASYM : SYM, r);
    const zones = shuffle(['x', 'x', 'x', 'asc', 'asc', 'desc', 'desc'], r);
    CLASSES.forEach((c, i) => { famRadical[c] = pool[i % pool.length]; famZone[c] = zones[i]; famSide[c] = r() < 0.5 ? 0 : 1; });
    const members = {};
    for (const c of consBases) (members[consonantClass(c)] ??= []).push(c);
    const memberIdx = new Map();
    for (const list of Object.values(members)) list.sort((a, b) => voiced(a) - voiced(b) || a.localeCompare(b)).forEach((c, i) => memberIdx.set(c, i));
    const vowelRadicals = shuffle(['bowl', 'stem', 'cupU', 'capN', 'arcR', 'arcL', 'vee', 'tri', 'bar'].filter(n => !ASYM.includes(n) || type !== 'syllabary'), r);
    const vowIdx = new Map(vowBases.map((v, i) => [v, i]));

    const W = (base, k = 1) => base * tr.wide * k;
    // a consonant letter in a box: family radical plus modifiers; `stems` adds ascender/descender stems (alphabet, abjad)
    function famStrokes(letter, box, stems) {
        const cls = consonantClass(letter), idx = memberIdx.get(letter) ?? 0;
        const zone = stems ? famZone[cls] : 'x';
        const bh = box.h, bw = box.w;
        let strokes = place(rad(famRadical[cls]), 0, box.y, bw, bh);
        const b = bbox(strokes);
        if (zone === 'asc') { const x = famSide[cls] ? b.x1 : b.x0; strokes = [...strokes, S([[x, b.y1], [x, Y.asc]])]; }
        if (zone === 'desc') { const x = famSide[cls] ? b.x1 : b.x0; strokes = [...strokes, S([[x, b.y0], [x, Y.desc]])]; }
        for (const m of modsFor(idx)) strokes = applyModifier(strokes, m);
        return strokes;
    }
    function vowelStrokes(letter, box) {
        const [bs] = baseOf(letter), i = vowIdx.get(bs) ?? 0, n = vowelRadicals.length;
        let strokes = place(rad(vowelRadicals[i % n], 1), 0, box.y, box.w, box.h);
        for (const m of modsFor(Math.floor(i / n))) strokes = applyModifier(strokes, m);
        return strokes;
    }
    const withDiacritics = (strokes, dia) => {
        let out = strokes;
        for (const cp of dia) { const b = bbox(strokes); out = [...out, ...diacritic(cp, { ...b, y0: BELOW.has(cp) ? b.y0 : Math.min(b.y0, Y.xh - 1), y1: Math.max(b.y1, Y.base) })]; }
        return out;
    };

    // letters of an alphabet or abjad
    const letterCache = new Map();
    function letterUnit(letter) {
        if (letterCache.has(letter)) return letterCache.get(letter);
        const [bs, dia] = baseOf(letter);
        let strokes;
        const small = isV(letter);
        const box = small ? { y: Y.xh + 1.5, h: Y.base - Y.xh - 1.5, w: W(6.2) } : { y: Y.xh, h: Y.base - Y.xh, w: W(8.4) };
        strokes = small ? vowelStrokes(bs, box) : famStrokes(bs, box, type !== 'abugida' && type !== 'syllabary');
        strokes = withDiacritics(strokes, dia);
        const u = unitOf(finish(strokes), tr);
        letterCache.set(letter, u);
        return u;
    }

    // ---- marks (vowel signs of an abugida, vowel points of an abjad) -----------------------------------------------------------
    const SHAPES = [
        b => [{ dot: [b.cx, b.cy] }], b => [S([[b.x0, b.cy], [b.x1, b.cy]])], b => [S([[b.x0, b.y1], [b.x1, b.y0]])], b => [S([[b.x0, b.y0], [b.cx, b.y1], [b.x1, b.y0]])],
        b => [S([[b.cx, b.cy - 1.6], [b.cx + 1.6, b.cy], [b.cx, b.cy + 1.6], [b.cx - 1.6, b.cy]], { smooth: true, closed: true })], b => [{ dot: [b.x0, b.cy] }, { dot: [b.x1, b.cy] }],
        b => [S([[b.x0, b.y0], [b.x1, b.cy], [b.x0, b.y1]])], b => [S([[b.x0, b.y1], [b.cx, b.y0], [b.x1, b.y1]])]
    ];
    const vowelClass = v => { const bs = baseOf(v)[0]; return 'iey'.includes(bs) ? 'front' : 'uo'.includes(bs) ? 'back' : 'a'.includes(bs) ? 'open' : 'mid'; };
    const POS = { front: 'above', back: 'below', open: 'after', mid: 'before' };
    const markShape = new Map(), markPos = new Map();
    {
        const sh = shuffle(SHAPES.map((s, i) => i), r), used = {};
        const order = [...markVowels].sort((a, b) => (VOWEL_ORDER.indexOf(baseOf(a)[0]) + 1 || 99) - (VOWEL_ORDER.indexOf(baseOf(b)[0]) + 1 || 99) || a.localeCompare(b));
        for (const v of order) {
            const [bs, dia] = baseOf(v);
            let pos = type === 'abjad' ? (['front', 'open'].includes(vowelClass(v)) ? 'above' : 'below') : POS[vowelClass(v)];
            if (dia.length && markShape.has(bs)) { markShape.set(v, [markShape.get(bs)[0], 'long']); markPos.set(v, markPos.get(bs)); continue; }
            used[pos] ??= 0; let idx = sh[used[pos]++ % sh.length];
            markShape.set(v, [idx]); markPos.set(v, pos);
        }
    }
    const zeroKind = ['cap', 'under', 'hook'][Math.floor(r() * 3)];
    function markStrokes(v, body, area) {
        const b = body, pos = v === '0' ? 'zero' : markPos.get(v);
        const sz = 3.2;
        const at = (x, y) => ({ x0: x - sz / 2, x1: x + sz / 2, y0: y - sz / 2, y1: y + sz / 2, cx: x, cy: y });
        const gap = 3.6;
        if (v === '0') return zeroKind === 'cap' ? [S([[b.x1 - 3, b.y0 - 5.5], [b.x1 - 1.2, b.y0 - 3.3], [b.x1 + 0.8, b.y0 - 5.5]])] : zeroKind === 'under' ? [S([[b.x1 - 3.5, b.y1 + 3.2], [b.x1 + 0.5, b.y1 + 5.2]])] : [S([[b.x1 - 2, b.y0 - 3], [b.x1 + 0.6, b.y0 - 3], [b.x1 + 0.6, b.y0 - 5.6]])];
        const [idx, long] = markShape.get(v);
        const box = pos === 'above' ? at(b.cx, b.y0 - gap) : pos === 'below' ? at(b.cx, b.y1 + gap) : pos === 'after' ? at(b.x1 + 2.8, b.cy) : at(b.x0 - 2.8, b.cy);
        let st = SHAPES[idx](box);
        if (long) st = [...st, ...shift(SHAPES[idx](box), pos === 'above' || pos === 'below' ? 0 : 0, pos === 'above' ? -3.4 : pos === 'below' ? 3.4 : 0)].concat(pos === 'after' || pos === 'before' ? [] : []);
        if (long && (pos === 'after' || pos === 'before')) st = [...SHAPES[idx](box), ...shift(SHAPES[idx](box), 0, 3.2)];
        return st;
    }
    // appendages (abugida): strokes that grow out of the body
    const APP = [
        b => [S([[b.x1, b.y1], [b.x1 + 3.8, b.y1]])], b => [S([[b.x1 - 0.4, b.y1], [b.x1 + 0.4, b.y1 + 4.2]])], b => [S([[b.x0, b.y1], [b.x0 - 3.6, b.y1 + 0.4]])],
        b => [S([[b.x1, b.y0], [b.x1 + 3.2, b.y0 - 3.2]])], b => [S([[b.x1, b.cy - 1], [b.x1 + 3.2, b.cy - 1], [b.x1 + 3.2, b.cy + 2]])], b => [S([[b.x0 + 1, b.y1 + 3.4], [b.x1 - 1, b.y1 + 3.4]])],
        b => [S([[b.x0, b.y0], [b.x0 - 3, b.y0 - 2.6]])], b => [S([[b.cx - 1.6, b.y1 + 3], [b.cx, b.y1 + 1.4], [b.cx + 1.6, b.y1 + 3], [b.cx, b.y1 + 4.6]], { smooth: true, closed: true })]
    ];
    const appSlots = new Map();
    {
        const order = [...markVowels].sort((a, b) => (VOWEL_ORDER.indexOf(baseOf(a)[0]) + 1 || 99) - (VOWEL_ORDER.indexOf(baseOf(b)[0]) + 1 || 99) || a.localeCompare(b));
        const sl = shuffle(APP.map((s, i) => i), r);
        order.forEach((v, i) => appSlots.set(v, i < sl.length ? [sl[i]] : [sl[i % sl.length], sl[(i + 3) % sl.length]]));
    }
    const strategy = type === 'abugida' ? (r() < 0.5 ? 'marks' : 'appendage') : 'marks';
    const headline = type === 'abugida' && r() < 0.5;

    // ---- units ---------------------------------------------------------------------------------------------------------------
    const BODY = { y: 10, h: 13 };
    const cursive = type === 'abjad' && (cursivePref ?? r() < 0.6);
    const unitCache = new Map();
    const exceptionUnit = unitOf(finish([S([[0, Y.xh], [1.6, Y.base - 1]]), S([[3.2, Y.xh], [4.8, Y.base - 1]])]), tr);

    function consonantBody(c, w = 9) {            // abugida and syllabary consonant body
        const [bs, dia] = baseOf(c);
        let st = famStrokes(bs, { y: BODY.y, h: BODY.h, w: W(w) }, false);
        st = withDiacritics(st, dia);
        return st;
    }
    function applyHeadline(strokes, extra = 0) { const b = bbox(strokes); return [S([[b.x0 - tr.spacing / 2, BODY.y], [b.x1 + tr.spacing / 2 + extra, BODY.y]]), ...strokes]; }
    function abugidaCell(cell) {
        const key = cell.b, marks = cell.marks ?? [];
        let body;
        if (key.startsWith('v:')) {
            const v = key.slice(2);
            const carrier = shift(place(rad('ring'), 0, BODY.y + 2, W(8), BODY.h - 4), 0, 0);
            body = carrier;
            const b = bbox(body);
            if (v !== inherent) body = applyVowel(body, v, b);
            return unitOf(finish(headline ? applyHeadline(body, vowelExtra(v)) : body), tr);
        }
        if (key.startsWith('L:')) {
            const [c1, c2] = [key[2], key[3]];
            const a = transform(consonantBody(c1, 9), { sx: 1 }), b2 = consonantBody(c2, 9);
            const A = place(mapPts(a, ([x, y]) => [x, y]), 0, 0, 1, 1);
            const ba = bbox(A), bb = bbox(b2);
            const half = mapPts(A, ([x, y]) => [(x - ba.x0) * 0.55, y]);
            const second = shift(b2, (ba.w * 0.55) - 0.6 - bb.x0, 0);
            body = [...half, ...second];
        } else body = consonantBody(key, 9);
        const b = bbox(body);
        let extra = 0;
        for (const m of marks) {
            if (m === '0') body = [...body, ...markStrokes('0', b)];
            else if (strategy === 'marks') { const ms = markStrokes(m, b); body = [...body, ...ms]; extra = Math.max(extra, markPos.get(m) === 'after' ? 4.5 : 0); }
            else { for (const s of appSlots.get(m)) body = [...body, ...APP[s](b)]; }
        }
        return unitOf(finish(headline ? applyHeadline(body, extra) : body), tr);
    }
    const vowelExtra = v => strategy === 'marks' && markPos.get(v) === 'after' ? 4.5 : 0;
    function applyVowel(body, v, b) {
        if (strategy === 'marks') return [...body, ...markStrokes(v, b)];
        let out = body; for (const s of appSlots.get(v)) out = [...out, ...APP[s](b)]; return out;
    }

    // abjad (not cursive): consonant letters with vowel points
    function abjadCell(cell) {
        const key = cell.b, marks = cell.marks ?? [];
        let u;
        if (key === '@') { u = unitOf(finish([S([[2, Y.asc], [2, Y.base]]), S([[2, Y.xh + 3], [5, Y.xh]])]), tr); }
        else if (key.startsWith('m:')) u = letterUnit(key.slice(2));
        else u = letterUnit(key);
        if (!marks.length) return u;
        let st = shift(u.strokes, 0, 0), b = bbox(st);
        const hasTop = ['stem'].includes(famRadical[consonantClass(baseOf(key)[0])]);
        b = { ...b, y0: Math.min(b.y0, Y.xh), y1: Math.max(b.y1, Y.base) };
        for (const m of marks) st = [...st, ...(m === '0' ? markStrokes('0', b) : markStrokes(m, b))];
        void hasTop;
        return unitOf(st, tr);
    }

    // ---- cursive abjad: bodies on a baseline that join their neighbours -------------------------------------------------------
    const B = Y.base;
    const BODIES = {
        hump: w => [S([[0, B], [w * 0.5, B - 7.5], [w, B]], { smooth: true })],
        teeth: w => [S([[0, B], [w * 0.22, B - 6], [w * 0.45, B], [w * 0.68, B - 6], [w, B]], { smooth: true })],
        cup: w => [S([[0, B - 1], [w * 0.12, B + 4.5], [w * 0.5, B + 6], [w * 0.88, B + 4.5], [w, B - 1]], { smooth: true })],
        stem: w => [S([[0, B], [w * 0.4, B], [w * 0.4, B - 15], [w * 0.4, B], [w, B]])],
        loop: w => [S([[0, B], [w * 0.4, B], [w * 0.8, B + 5], [w * 0.4, B + 7.5], [w * 0.4, B], [w, B]], { smooth: true })],
        wave: w => [S([[0, B], [w * 0.25, B - 4], [w * 0.5, B + 2], [w * 0.75, B - 4], [w, B]], { smooth: true })],
        tall: w => [S([[0, B], [w * 0.2, B], [w * 0.2, B - 13], [w * 0.2, B], [w * 0.55, B + 3], [w, B]], { smooth: true })],
        spike: w => [S([[0, B], [w * 0.5, B - 9], [w, B]])]
    };
    const bodyNames = shuffle(Object.keys(BODIES), r);
    const NONJOIN = new Set(shuffle(CLASSES, r).slice(0, 2));
    const DOTS = [[], [[0.5, -1]], [[0.3, -1], [0.7, -1]], [[0.2, -1], [0.5, -1.6], [0.8, -1]], [[0.5, 1]], [[0.3, 1], [0.7, 1]], [[0.2, 1], [0.5, 1.6], [0.8, 1]]];
    const cursiveInfo = new Map();
    function cursiveLetter(letter) {
        if (cursiveInfo.has(letter)) return cursiveInfo.get(letter);
        const [bs, dia] = baseOf(letter);
        const cls = consonantClass(bs), idx = memberIdx.get(bs) ?? 0, body = bodyNames[CLASSES.indexOf(cls) % bodyNames.length];
        const info = { body, dots: DOTS[idx % DOTS.length], dia, join: !NONJOIN.has(cls) && body !== 'spike' };
        cursiveInfo.set(letter, info); return info;
    }
    function cursiveUnit(letter, form) {
        const { body, dots, dia, join } = cursiveLetter(letter);
        const w = W(form === 'medial' ? 8 : 10.5);
        let st = BODIES[body](w);
        const e = 3.6, entry = form === 'final' || form === 'medial', exit = (form === 'initial' || form === 'medial') && join;
        if (entry) st = [S([[-e, B], [0, B]]), ...st];
        if (exit) st = [...st, S([[w, B], [w + e, B]])];
        else if (form === 'final' || form === 'isolated') st = body === 'stem' || body === 'spike' ? st : [...st, S([[w, B], [w + 2.4, B + 2.2]])];
        const lowest = body === 'cup' || body === 'loop' ? B + 7.5 : B, top = body === 'stem' || body === 'tall' ? B - 15 : body === 'spike' ? B - 9 : B - 7.5;
        const cx = w / 2;
        const dotStrokes = dots.map(([px, sgn]) => ({ dot: [w * px, sgn < 0 ? top - 3 + (px === 0.5 && dots.length === 3 ? -1.4 : 0) : lowest + 3.2 + (dots.length === 3 && px === 0.5 ? 1.4 : 0)] }));
        st = [...st, ...dotStrokes, ...(dia.length ? diacritic(dia[0], { cx, y0: top, y1: lowest }) : [])];
        const bb = bbox(st);
        return { strokes: shift(st, entry ? e : 0, 0), w: entry || exit ? bb.w : bb.w, entry, exit, adv: (entry ? e : 0) + w + (exit ? 0 : tr.spacing * 1.6), joins: join, bb };
    }
    function cursiveWord(cells) {
        const letters = cells.map(c => c.x ? { x: true } : { cell: c, letter: c.b === '@' || c.b.startsWith('m:') ? (c.b === '@' ? 'a' : c.b.slice(2)) : c.b });
        let x = 0, strokes = [];
        letters.forEach((it, i) => {
            if (it.x) { const u = exceptionUnit; strokes.push(...shift(u.strokes, x, 0)); x += u.adv; return; }
            const prev = letters[i - 1], next = letters[i + 1];
            const prevJoins = prev && !prev.x && prev.joinsOut, nextOk = next && !next.x;
            const isCarrier = it.cell.b === '@' || it.cell.b.startsWith('m:');
            let u;
            if (isCarrier) { const un = it.cell.b === '@' ? abjadCell(it.cell) : letterUnit(it.letter); u = { strokes: un.strokes, adv: un.adv, joinsOut: false }; it.joinsOut = false; }
            else {
                const wantsJoin = cursiveLetter(it.letter).join && nextOk && !(next.cell.b === '@');
                const form = prevJoins ? (wantsJoin ? 'medial' : 'final') : (wantsJoin ? 'initial' : 'isolated');
                const cu = cursiveUnit(it.letter, form);
                let st = cu.strokes;
                for (const m of it.cell.marks ?? []) st = [...st, ...(m === '0' ? markStrokes('0', { ...cu.bb, x0: 0, x1: cu.bb.w, y0: Y.xh, y1: Y.base, cx: cu.bb.w / 2 }) : markStrokes(m, { x0: 0, x1: cu.bb.w, y0: Y.xh, y1: Y.base, cx: cu.bb.w / 2, cy: (Y.xh + Y.base) / 2 }))];
                u = { strokes: st, adv: cu.adv, joinsOut: cu.exit };
                it.joinsOut = cu.exit;
                if (prevJoins) x -= 2.2 * 0;                  // the entry stroke (e units) already overlaps the exit stroke of the previous letter
            }
            strokes.push(...shift(u.strokes, x, 0));
            x += u.adv - (u.joinsOut ? 3.6 : 0);
        });
        return { strokes, w: x };
    }

    // ---- syllabary ----------------------------------------------------------------------------------------------------------------
    const model = type === 'syllabary' ? (r() < 0.5 ? 'orientation' : 'block') : null;
    const ORIENT = [{}, { rot: 1 }, { rot: 2 }, { rot: 3 }, { mirror: true }, { mirror: true, rot: 1 }, { mirror: true, rot: 2 }, { mirror: true, rot: 3 }];
    const syllabaryVowels = [...new Set(vowels.map(v => baseOf(v)[0]))].sort((a, b) => (VOWEL_ORDER.indexOf(a) + 1 || 99) - (VOWEL_ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b));
    const sylVowelIdx = new Map(syllabaryVowels.map((v, i) => [v, i]));
    const BLOCK = { w: W(13), h: 14, y: 9 };
    const nullRadical = ASYM.find(n => !Object.values(famRadical).includes(n)) ?? 'hook';
    function syllableUnit(cell) {
        const { c, v } = cell;
        let strokes;
        if (model === 'orientation') {
            const size = W(11);
            const consonantShape = c ? place(consonantBody(c, 11).length ? consonantBody(c, 11) : [], 0, 0, 1, 1) : place(radical(nullRadical, FORMS, 0), 0, BODY.y, size, BODY.h);
            let body = consonantShape;
            if (v) {
                const i = sylVowelIdx.get(baseOf(v)[0]) ?? 0;
                body = transform(body, ORIENT[i % 8]);
                if (i >= 8) body = [...body, { dot: [bbox(body).cx, bbox(body).y0 - 3] }];
                if (baseOf(v)[1].length) body = withDiacritics(body, baseOf(v)[1]);
                // keep the family on the same line whatever the turn
                const bb = bbox(body); body = shift(body, 0, (BODY.y + BODY.h / 2) - bb.cy);
            } else if (c) { body = transform(body, { sx: 0.55, sy: 0.55 }); const bb = bbox(body); body = shift(body, W(4), (BODY.y - 3) - bb.y0); }
            strokes = body;
        } else {
            const cons = c ? (() => { let st = consonantBody(c, 8); return st; })() : place(rad('ring'), 0, 0, 5, 5);
            const cb = bbox(cons);
            const bs = v ? baseOf(v)[0] : null, i = bs ? sylVowelIdx.get(bs) ?? 0 : 0;
            const horizontal = v ? i % 2 === 1 : false;
            if (!v) {            // a lone consonant: the whole block with a line below
                const fit = mapPts(cons, ([x, y]) => [(x - cb.x0) / (cb.w || 1) * (BLOCK.w * 0.7) + BLOCK.w * 0.15, (y - cb.y0) / (cb.h || 1) * (BLOCK.h * 0.6) + BLOCK.y]);
                strokes = [...fit, S([[BLOCK.w * 0.1, BLOCK.y + BLOCK.h * 0.85], [BLOCK.w * 0.9, BLOCK.y + BLOCK.h * 0.85]])];
            } else if (!horizontal) {   // vowel stem at the right
                const cw = BLOCK.w * 0.55, fit = mapPts(cons, ([x, y]) => [(x - cb.x0) / (cb.w || 1) * cw, (y - cb.y0) / (cb.h || 1) * BLOCK.h + BLOCK.y]);
                const sx = BLOCK.w * 0.82, tick = Math.floor(i / 2) % 4, st = [S([[sx, BLOCK.y], [sx, BLOCK.y + BLOCK.h]])];
                const ty = BLOCK.y + BLOCK.h * (tick === 0 ? 0.35 : tick === 1 ? 0.65 : 0.5);
                if (tick === 0 || tick === 1 || tick === 3) st.push(S([[sx, ty], [sx + 3, ty]]));
                if (tick === 2 || tick === 3) st.push(S([[sx, ty], [sx - 2.6, ty - 0.2]]));
                strokes = [...fit, ...st];
            } else {                   // vowel stem below
                const ch = BLOCK.h * 0.55, fit = mapPts(cons, ([x, y]) => [(x - cb.x0) / (cb.w || 1) * BLOCK.w * 0.8 + BLOCK.w * 0.1, (y - cb.y0) / (cb.h || 1) * ch + BLOCK.y]);
                const sy = BLOCK.y + BLOCK.h * 0.86, tick = Math.floor(i / 2) % 4, st = [S([[BLOCK.w * 0.1, sy], [BLOCK.w * 0.9, sy]])];
                const tx = BLOCK.w * (tick === 0 ? 0.35 : tick === 1 ? 0.65 : 0.5);
                if (tick === 0 || tick === 1 || tick === 3) st.push(S([[tx, sy], [tx, sy - 3]]));
                if (tick === 2 || tick === 3) st.push(S([[tx, sy], [tx, sy + 2.8]]));
                strokes = [...fit, ...st];
            }
        }
        return unitOf(finish(strokes), tr, { block: model === 'block' });
    }

    // ---- ligatures of letters (alphabet) ------------------------------------------------------------------------------------------
    function ligatureUnit(key) {
        const a = letterUnit(key[2]), b = letterUnit(key[3]);
        const sa = mapPts(a.strokes, ([x, y]) => [x * 0.86, y]), sb = mapPts(b.strokes, ([x, y]) => [x * 0.86, y]);
        const ba = bbox(sa), bb = bbox(sb), dx = ba.x1 - 1.1 - bb.x0;
        const top = Math.min(ba.y0, bb.y0, Y.xh + 1);
        const bridge = S([[ba.cx, Math.max(top, Y.xh + 1)], [ba.x1 + bb.w / 2 - 1.1, Math.max(top, Y.xh + 1)]]);
        return unitOf(finish([...sa, ...shift(sb, dx, 0), bridge]), tr);
    }

    function unit(cell) {
        const k = JSON.stringify(cell);
        if (unitCache.has(k)) return unitCache.get(k);
        let u;
        if (cell.x) u = exceptionUnit;
        else if (type === 'syllabary') u = syllableUnit(cell);
        else if (type === 'abugida') u = abugidaCell(cell);
        else if (type === 'abjad') u = abjadCell(cell);
        else u = cell.b.startsWith('L:') ? ligatureUnit(cell.b) : letterUnit(cell.b);
        unitCache.set(k, u);
        return u;
    }

    // ---- layout -----------------------------------------------------------------------------------------------------------------------
    function layout(cells) {
        if (cursive) { const { strokes, w } = cursiveWord(cells); return { strokes: flip(skew(ductus(strokes, tr), tr), w), w }; }
        let x = 0, strokes = [];
        cells.forEach(c => { const u = unit(c); strokes.push(...shift(u.strokes, x, 0)); x += u.adv; });
        const w = Math.max(x - tr.spacing, 4);
        if (type === 'abugida' && headline) { /* headlines of neighbours touch: each unit already extends by half the spacing */ }
        return { strokes: flip(strokes, w), w };
    }
    const pad = 1.2;
    const cellSvgOf = (cell, height = 40) => { const { strokes, w } = layout([cell]); return svgOf(shift(strokes, pad, 0), tr, w + 2 * pad, height); };
    const wordSvgOf = (cells, height = 38) => { const { strokes, w } = layout(cells); return svgOf(shift(strokes, pad, 0), tr, w + 2 * pad, height, 'cell word-svg'); };

    // ---- inventory for the pages and the tests --------------------------------------------------------------------------------------------------
    const glyphKeys = type === 'alphabet' ? [...new Set([...consonants, ...vowels])] : type === 'abjad' ? ['@', ...consonants, ...matres.map(m => `m:${m}`)] : type === 'abugida' ? [...consonants, ...vowels.map(v => `v:${v}`)] : [];
    const glyph = new Map();
    for (const k of glyphKeys) glyph.set(k, pathOf(layout([{ b: k, marks: [] }]).strokes, tr));
    const mark = new Map(markVowels.map(v => [v, { shape: markShape.get(v), pos: markPos.get(v), slots: appSlots.get(v) }]));
    const zeroMark = { kind: zeroKind };

    // quality: distinct signs, balanced weight (the sum of what is wrong; 0 is good)
    const probe = glyphKeys.length ? glyphKeys.map(k => layout([{ b: k, marks: [] }]).strokes) : [];
    const sigs = probe.map(signature);
    let close = 0;
    for (let i = 0; i < sigs.length; i++) for (let j = i + 1; j < sigs.length; j++) if (distance(sigs[i], sigs[j]) < (cursive ? 0.03 : 0.07)) close++;
    const inks = probe.map(ink).filter(Boolean);
    const spread = inks.length ? Math.max(...inks) / Math.min(...inks) : 1;
    let syllCol = 0;
    if (type === 'syllabary') {
        const keys = [...ctx.syllables].filter(k => k), ss = keys.slice(0, 120).map(k => { const [c, v] = [k.length > 1 && !isV(k[0]) ? k[0] : null, [...k].filter(isV).join('') || null]; return signature(unit({ syl: k, c, v }).strokes); });
        for (let i = 0; i < ss.length; i++) for (let j = i + 1; j < ss.length; j++) if (distance(ss[i], ss[j]) < 0.06) syllCol++;
    }
    const quality = { attempt, close, spread: Number(spread.toFixed(2)), syllCol, score: close * 3 + (spread > 4 ? 1 : 0) + syllCol };

    const describe = {
        tradition: tr, tech: tr.tech, form: tr.form, tags: tr.tags, strategy, headline, cursive, model, vowelMarks: strategy, ductus: tr.ductus,
        families: type === 'alphabet' || type === 'abjad' ? CLASSES.map(c => ({ cls: c, radical: famRadical[c], zone: famZone[c], members: (members[c] ?? []).slice() })).filter(f => f.members.length) : [],
        bodies: cursive ? [...cursiveInfo.entries()].map(([l, i]) => ({ letter: l, body: i.body, dots: i.dots.length, joins: i.join })) : []
    };
    const api = { tradition: tr, glyph, mark, zeroMark, drawCell: cellSvgOf, wordSvg: wordSvgOf, unit, layout, describe, quality, markShape, markPos, appSlots, cursive, strategy, model, headline, forms: cursive ? (letter => ['isolated', 'initial', 'medial', 'final'].map(f => ({ form: f, svg: (() => { const cu = cursiveUnit(letter, f); return svgOf(shift(flip(cu.strokes, cu.strokes.length ? bbox(cu.strokes).x1 : 6), pad, 0), tr, cu.adv + 2 * pad, 40); })() }))) : null };
    return { api, quality };
}
