// Numeral glyph system: how the digits of a base look. The numeral system itself (base, words) is not touched here; this
// only draws. It reuses the engine of the scripts (tradition, ductus, stroke width, terminals, radicals). Four modes:
//  - derived:    the digits share the tradition of the script and are built from its radicals;
//  - autonomous: a tradition of their own (other technology and forms), radicals not used by the letters;
//  - counting:   digits are tally groups (strokes, with a crossing stroke for each five), zero is a separate sign;
//  - imported:   an autonomous system adapted to the script (the script's proportions and stroke width).
// The zero is never a plain circle by default; digit shapes are checked for distinctness and weight, and re-drawn if not.
import { rng } from '../core/rng.js';
import { Y, makeTradition, ductus, skew, svgOf, bbox, place, shift, signature, distance, ink, pathOf } from './core.js';
import { radical, MODIFIER_NAMES, applyModifier } from './radicals.js';

const S = (pts, o = {}) => ({ pts, ...o });
const shuffle = (a, r) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
export const NUMERAL_MODES = ['derived', 'autonomous', 'counting', 'imported'];
const RADS = ['stem', 'bowl', 'arcR', 'arcL', 'cupU', 'capN', 'vee', 'hook', 'zig', 'tri', 'fork', 'spur', 'loopTail', 'cross', 'diag', 'lens', 'wave', 'spiral'];
const ZERO = ['spiral', 'lens', 'wave', 'spur', 'cross'];
const TOP = 6, BOT = 21, H = BOT - TOP;

export function numeralGraphics({ seed, base, restricted, limit, script }) {
    const r0 = rng(`${seed}|numeral-mode`);
    const mode = restricted ? 'counting' : NUMERAL_MODES[Math.floor(r0() * 4)];
    let best = null;
    for (let attempt = 0; attempt < 6; attempt++) {
        const g = attemptNumerals({ seed, base, restricted, limit, script, mode, attempt });
        if (!best || g.quality.score < best.quality.score) best = g;
        if (g.quality.score === 0) break;
    }
    return best.api;
}

function attemptNumerals({ seed, base, restricted, limit, script, mode, attempt }) {
    const r = rng(`${seed}|numeral-glyphs|${mode}|${attempt}`);
    const own = mode === 'autonomous' || mode === 'imported';
    const st = script?.tradition;
    let tr = own ? makeTradition(`${seed}|num`, { type: 'alphabet', style: 'mixed', genre: undefined, era: [], direction: 'ltr', tag: `${attempt}` }) : st ?? makeTradition(seed, { type: 'alphabet', tag: 'n' });
    if (mode === 'imported' && st) tr = { ...tr, weight: st.weight, wide: st.wide, spacing: st.spacing };
    const w = tr.wide * 7, finish = l => skew(ductus(l, tr), tr);
    const rad = (n, k = 0) => radical(n, tr.form, k);
    const pool = shuffle(RADS.filter(n => !ZERO.includes(n)), r), zeroRad = ZERO[Math.floor(r() * ZERO.length)];
    const mods = shuffle(MODIFIER_NAMES, r);

    function tallyDigit(v) {
        const fives = Math.floor(v / 5), units = v % 5, step = Math.max(2.6, w / 5), width = Math.max(units, 1) * step;
        let out = [];
        for (let i = 0; i < units; i++) out.push(S([[i * step, TOP + 2], [i * step, BOT]]));
        const total = Math.max(units - 1, 0) * step;
        if (fives >= 1) out.push(S(units ? [[-1.5, BOT - 3], [total + 1.5, TOP + 4]] : [[0, BOT], [width, TOP + 1]]));
        if (fives >= 2) out.push(S(units ? [[-1.5, TOP + 4], [total + 1.5, BOT - 3]] : [[0, TOP + 1], [width, BOT]]));
        if (fives >= 3) out.push(S([[-1.5, (TOP + BOT) / 2], [total + 1.5, (TOP + BOT) / 2]]));
        return out;
    }
    function zeroSign() {
        let z = place(rad(zeroRad, 1), 0, TOP + 2, w * 0.9, H - 4);
        return applyModifier(z, mods[0]);
    }
    function glyphDigit(v) {
        if (v === 0) return zeroSign();
        const n = pool.length;
        let g = place(rad(pool[(v - 1) % n], v % 2), 0, TOP, w, H);
        for (const m of v > n ? [mods[(Math.floor((v - 1) / n)) % mods.length]] : []) g = applyModifier(g, m);
        return g;
    }
    const countingDigits = mode === 'counting';
    const partial = mode === 'derived' && base > 12 ? true : false;
    const digitStrokes = v => countingDigits ? (v === 0 ? zeroSign() : tallyDigit(v)) : partial && v >= 1 && v <= 4 ? tallyDigit(v) : glyphDigit(v);
    const manyStrokes = () => place(rad('spiral', 0), 0, TOP, w, H);
    const tally = n => { const out = []; const step = 3; for (let i = 0; i < n; i++) out.push(S([[i * step, TOP + 1], [i * step, BOT]])); if (n >= 5) out.push(S([[-1.5, BOT - 3], [(n - 1) * step + 1.5, TOP + 3]])); return out; };

    const unitOf = strokes => { const b = bbox(strokes); return { strokes: shift(finish(strokes), -b.x0, 0), w: b.w }; };
    const gap = Math.max(2.6, tr.spacing * 1.2), pad = 1.2;
    const svgDigit = (strokes, height) => { const u = unitOf(strokes); return svgOf(shift(u.strokes, pad, 0), tr, u.w + 2 * pad, height, 'cell digit'); };
    const layout = list => { let x = 0, out = []; for (const strokes of list) { const u = unitOf(strokes); out.push(...shift(u.strokes, x, 0)); x += u.w + gap; } return { strokes: out, w: x - gap }; };
    const numberSvg = (list, height) => { const { strokes, w: ww } = layout(list); return svgOf(shift(strokes, pad, 0), tr, ww + 2 * pad, height, 'cell digit number'); };

    const digits = restricted ? [] : Array.from({ length: base }, (_, v) => digitStrokes(v));
    const sigs = digits.map(d => signature(finish(d)));
    let close = 0;
    for (let i = 0; i < sigs.length; i++) for (let j = i + 1; j < sigs.length; j++) if (distance(sigs[i], sigs[j]) < 0.12) close++;
    const inks = digits.map(d => ink(finish(d))).filter(Boolean), spread = inks.length ? Math.max(...inks) / Math.min(...inks) : 1;
    const quality = { attempt, mode, close, spread: Number(spread.toFixed(2)), score: close * 3 + (spread > 4.5 ? 2 : 0) };
    return {
        quality,
        api: {
            mode, tradition: tr, digitStrokes, tally, manyStrokes, quality,
            drawDigit: (v, h) => svgDigit(digitStrokes(v), h), drawMany: h => svgDigit(manyStrokes(), h), drawTally: (n, h) => svgDigit(tally(n), h),
            number: (vals, h) => numberSvg(vals.map(v => digitStrokes(v)), h),
            paths: digits.map(d => pathOf(finish(d), tr))
        }
    };
}
void Y;
