// Cistercian numerals: one sign writes any number from 1 to 9999. A vertical stave carries the digits at its four corners:
// units at the top right, tens at the top left (mirrored), hundreds at the bottom right (turned over), thousands at the bottom left
// (both). An empty corner is a zero in that place; there is no sign for the digit zero. Two systems are drawn:
//   standard  the later system of lines only: 1 a stroke at the top, 2 a stroke below it, 3 and 4 the two diagonals, 5 = 4 + 1,
//             6 a vertical stub, 7 = 1 + 6, 8 = 2 + 6, 9 = 1 + 2 + 6 (a square).
//   early     the system of the early manuscripts (13th century, the Brussels concordance): 3 and 4 have the forms that the
//             standard system gives to 7 and 8 and vice versa, 5 and 6 are one and two dots, 9 is a triangle on the stave.
// The orientation is vertical or horizontal (the vertical sign turned a quarter turn counterclockwise). Numbers of 10000 and
// more are written as groups of four digits, the largest group first (a modern convention: the medieval texts compound the sign
// of the thousand). The shapes of the early system follow the description of the concordance; they are a reconstruction.
import { rng } from '../core/rng.js';
import { makeTradition, ductus, svgOf, shift } from './core.js';

// segments in the unit square of the units corner: x from the stave (0) to the outside (1), y from the top of the stave (0) down (1)
const SEG = {
    top: { pts: [[0, 0], [1, 0]] }, low: { pts: [[0, 1], [1, 1]] }, down: { pts: [[0, 0], [1, 1]] }, up: { pts: [[0, 1], [1, 0]] }, side: { pts: [[1, 0], [1, 1]] },
    dot: { dot: [0.6, 0.5] }, dotA: { dot: [0.6, 0.27] }, dotB: { dot: [0.6, 0.73] }, tri: { pts: [[0, 0], [1, 0.5], [0, 1]], closed: true }
};
export const CISTERCIAN_DIGITS = Object.freeze({
    standard: Object.freeze({ 1: ['top'], 2: ['low'], 3: ['down'], 4: ['up'], 5: ['up', 'top'], 6: ['side'], 7: ['top', 'side'], 8: ['low', 'side'], 9: ['top', 'low', 'side'] }),
    early: Object.freeze({ 1: ['top'], 2: ['low'], 3: ['top', 'side'], 4: ['low', 'side'], 5: ['dot'], 6: ['dotA', 'dotB'], 7: ['down'], 8: ['up'], 9: ['tri'] })
});
export const CISTERCIAN_LABELS = Object.freeze({ standard: 'Cistercian numerals (standard system)', early: 'Cistercian numerals (early system, with dots)' });
const key = segs => [...segs].sort().join('+');
export const digitSegments = (system, d) => CISTERCIAN_DIGITS[system][d] ?? [];
export function decodeDigit(system, segs) {
    if (!segs.length) return 0;
    const hit = Object.entries(CISTERCIAN_DIGITS[system]).find(([, s]) => key(s) === key(segs));
    return hit ? Number(hit[0]) : null;
}
// the four corners of a group, by place (0 units, 1 tens, 2 hundreds, 3 thousands): the segments of each
export function groupCorners(system, value) {
    const d = [value % 10, Math.floor(value / 10) % 10, Math.floor(value / 100) % 10, Math.floor(value / 1000) % 10];
    return d.map(x => digitSegments(system, x));
}
export function decodeGroup(system, corners) { return corners.reduce((acc, segs, p) => acc + decodeDigit(system, segs) * 10 ** p, 0); }
export const groupsOf = n => { const out = []; do { out.unshift(n % 10000); n = Math.floor(n / 10000); } while (n > 0); return out; };

const STAVE = 3;                                   // the stave is three units tall; each corner uses the band of one unit at its end
const corner = (segs, place) => segs.flatMap(name => {
    const s = SEG[name], t = ([x, y]) => [place % 2 ? -x : x, place >= 2 ? STAVE - y : y];
    return [s.dot ? { dot: t(s.dot) } : { ...s, pts: s.pts.map(t) }];
});

// Which societies use them: rare, more often religious or scholarly cultures and medieval or ancient ones. `option` is the user's
// choice: 'auto', 'cistercian' (standard) or 'cistercian-early'. They write decimal numbers, so an automatic choice needs base 10.
export function cistercianChoice(spec, { restricted, base }, option = 'auto') {
    if (option === 'cistercian') return 'standard';
    if (option === 'cistercian-early') return 'early';
    if (restricted || base !== 10) return null;
    const r = rng(`${spec.seed}|cistercian`);
    const era = spec.era ?? [], old = era.some(e => ['ancient', 'medieval', 'prehistoric'].includes(e));
    const p = 0.05 + ({ sacred: 0.14, arcane: 0.08, merchant: 0.04 }[spec.genre] ?? 0) + (old ? 0.05 : 0);
    const use = r() < p, early = r() < 0.3 + (old ? 0.2 : 0);
    return use ? (early ? 'early' : 'standard') : null;
}

export function cistercianGraphics({ seed, script, system, orientation = 'auto' }) {
    const r = rng(`${seed}|cistercian|layout`);
    const horizontal = orientation === 'horizontal' || (orientation === 'auto' && r() < 0.3);
    const tr = script?.tradition ?? makeTradition(seed, { type: 'alphabet', style: 'mixed', genre: undefined, era: [], direction: 'ltr', tag: 'cist' });
    const U = 8, TOP = 5, OFF = (34 - 2 * U) / 2, pad = 2, gap = Math.max(5, tr.spacing * 1.6);
    // a point of the group (x from -1 to 1, y from 0 to 3, in units) on the page: vertical, or turned a quarter turn counterclockwise
    const map = horizontal ? ([x, y]) => [y * U, (1 - x) * U + OFF] : ([x, y]) => [(x + 1) * U, y * U + TOP];
    const place = strokes => ductus(strokes.map(s => s.dot ? { ...s, dot: map(s.dot) } : { ...s, pts: s.pts.map(map) }), tr);
    const W = horizontal ? STAVE * U : 2 * U;
    const stave = { pts: [[0, 0], [0, STAVE]] };
    const groupStrokes = value => place([stave, ...groupCorners(system, value).flatMap((segs, p) => corner(segs, p))]);
    const one = (value, height) => svgOf(shift(groupStrokes(value), pad, 0), tr, W + 2 * pad, height, 'cell digit cist');
    const many = (values, height) => {
        let x = pad, out = [];
        for (const v of values) { out.push(...shift(groupStrokes(v), x, 0)); x += W + gap; }
        return svgOf(out, tr, x - gap + pad, height, 'cell digit number cist');
    };
    // one digit alone in one corner of the stave, for the tables of signs
    const placed = (digit, p, height) => svgOf(shift(place([stave, ...corner(digitSegments(system, digit), p)]), pad, 0), tr, W + 2 * pad, height, 'cell digit cist');
    return { mode: `cistercian-${system}`, system, orientation: horizontal ? 'horizontal' : 'vertical', tradition: tr, quality: { attempt: 0, mode: `cistercian-${system}`, close: 0, spread: 1, score: 0 },
        drawGroup: one, number: many, drawPlaced: placed, width: W };
}
