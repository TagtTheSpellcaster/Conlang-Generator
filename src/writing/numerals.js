// Numerals of the writing system. The base follows the language's own counting system; digits are written in positional
// notation, most significant first, and always left to right (as with Arabic numerals inside right-to-left text).
//  - base 8 and 10: one generated glyph per digit (zero included);
//  - quinary, duodecimal and vigesimal: composite digits made of dots (1) and bars (5), a shell for zero;
//  - restricted systems (a few words for numbers): tally strokes up to the limit and one sign for "many".
import { makeGlyphs, cellSvg } from './glyphs.js';
import { isDefined, maxDefined, numeralForm } from '../numerals/system.js';

const stroke = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"';
const BASE = { decimal: 10, hybrid: 10, quinary: 10, vigesimal: 20, octal: 8, duodecimal: 12 };

function barDot(v, barValue, dots = 4) {                 // composite digit, drawn bottom-up: dots on the top, bars below
    const bars = Math.floor(v / barValue), d = v % barValue;
    if (v === 0) return { w: 16, h: 30, d: [`<ellipse cx="8" cy="15" rx="7" ry="5" ${stroke}/><path d="M4 15L12 15" ${stroke}/>`] };
    const parts = [], rows = bars + (d ? 1 : 0);
    let y = 30 - 4;
    for (let i = 0; i < bars; i++, y -= 7.5) parts.push(`<path d="M0 ${y}L16 ${y}" ${stroke}/>`);
    if (d) {
        const x0 = 8 - ((d - 1) * 4.6) / 2;
        for (let i = 0; i < d; i++) parts.push(`<circle cx="${(x0 + i * 4.6).toFixed(1)}" cy="${y - 2}" r="2" fill="currentColor"/>`);
    }
    return { w: 16, h: 30, d: parts, top: Math.max(0, y - 6) };
}
const svgOf = (parts, w, h, height, top = 0) => `<svg class="cell digit" viewBox="0 ${top.toFixed(1)} ${w} ${(h - top).toFixed(1)}" width="${(w * height / h).toFixed(1)}" height="${(height * (h - top) / h).toFixed(1)}" aria-hidden="true">${parts.join('')}</svg>`;

export function buildNumberSigns(lang, W) {
    const system = lang.numerals, spec = lang.spec, type = system.config.type;
    const restricted = type === 'restricted';
    const base = restricted ? 0 : BASE[type] ?? 10;
    const composite = ['quinary', 'vigesimal', 'duodecimal'].includes(type);
    let digitSvg = null;
    if (!restricted) {
        if (composite) {
            const barValue = 5;
            digitSvg = (v, height) => { const g = barDot(v, barValue); return svgOf(g.d, g.w, g.h, height * 1.6, g.top ?? 0); };
        } else {
            const paths = makeGlyphs(`${spec.seed}|numerals`, W.style, base);
            digitSvg = (v, height) => cellSvg({ base: paths[v] }, height);
        }
    }
    const many = restricted ? makeGlyphs(`${spec.seed}|numerals|many`, W.style, 1)[0] : null;

    const digitsOf = n => { const out = []; do { out.unshift(n % base); n = Math.floor(n / base); } while (n > 0); return out; };
    const cellsOf = n => {
        if (restricted) return n > maxDefined(system) ? [{ many: true }] : [{ tally: n }];
        return digitsOf(n).map(d => ({ digit: d }));
    };
    const readCells = cells => {
        if (restricted) return cells[0].many ? Infinity : cells[0].tally;
        return cells.reduce((acc, c) => acc * base + c.digit, 0);
    };
    const drawCell = (c, height = 34) => {
        if (c.many) return cellSvg({ base: many }, height);
        if (c.tally !== undefined) {
            const n = c.tally, parts = [];
            for (let i = 0; i < n; i++) parts.push(`<path d="M${3 + i * 5} 3L${3 + i * 5} 27" ${stroke}/>`);
            if (n >= 5) parts.push(`<path d="M0 22L${3 + 4 * 5 + 3} 8" ${stroke}/>`);
            return svgOf(parts, 6 + Math.max(0, n - 1) * 5, 30, height);
        }
        return digitSvg(c.digit, height);
    };
    const write = (n, height = 34) => `<span class="numeral" dir="ltr">${cellsOf(n).map(c => drawCell(c, height)).join('')}</span>`;
    const candidates = [1, 2, 3, 4, 5, 7, 9, 10, 12, 20, 21, 30, 100, 144, 365, 1000, 2026].filter(n => isDefined(system, n));
    const examples = candidates.slice(0, 12).map(n => ({ n, word: numeralForm(system, n, spec).form }));
    // check: every defined sample reads back
    const bad = [...candidates, 0, 6, 8, 11, 15, 19, 99, 255, 1999, 123456].filter(n => isDefined(system, n) && readCells(cellsOf(n)) !== n).length;
    const digits = restricted ? [] : Array.from({ length: base }, (_, v) => ({ v, svg: drawCell({ digit: v }, 40) }));
    return { type, base, restricted, composite, digits, many: restricted ? drawCell({ many: true }, 40) : null, limit: maxDefined(system), cellsOf, readCells, drawCell, write, examples, failures: bad };
}
