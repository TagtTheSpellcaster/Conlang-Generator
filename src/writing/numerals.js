// Numerals of the writing system. The base follows the language's own counting system; digits are written in positional
// notation, most significant first, and always left to right (as with Arabic numerals inside right-to-left text).
//  - base 8 and 10: one generated glyph per digit (zero included);
//  - quinary, duodecimal and vigesimal: composite digits made of dots (1) and bars (5), a shell for zero;
//  - restricted systems (a few words for numbers): tally strokes up to the limit and one sign for "many".
import { numeralGraphics } from '../graphics/numerals.js';
import { cistercianChoice, cistercianGraphics, CISTERCIAN_LABELS, groupsOf, groupCorners, decodeGroup } from '../graphics/cistercian.js';
import { isDefined, maxDefined, numeralForm } from '../numerals/system.js';

const BASE = { decimal: 10, hybrid: 10, quinary: 10, vigesimal: 20, octal: 8, duodecimal: 12 };

// `option`: { system: 'auto' | 'cistercian' | 'cistercian-early', orientation: 'auto' | 'vertical' | 'horizontal' }
export function buildNumberSigns(lang, W, option = {}) {
    const system = lang.numerals, spec = lang.spec, type = system.config.type;
    const restricted = type === 'restricted';
    const base = restricted ? 0 : BASE[type] ?? 10;
    const cist = cistercianChoice(spec, { restricted, base }, option.system ?? 'auto');
    if (cist) return cistercianSigns(lang, W, cist, option, restricted);
    const composite = false;
    const G = numeralGraphics({ seed: spec.seed, base, restricted, limit: restricted ? maxDefined(system) : 0, script: W.tradition ? { tradition: W.tradition } : null });

    const digitsOf = n => { const out = []; do { out.unshift(n % base); n = Math.floor(n / base); } while (n > 0); return out; };
    const cellsOf = n => {
        if (restricted) return n > maxDefined(system) ? [{ many: true }] : [{ tally: n }];
        return digitsOf(n).map(d => ({ digit: d }));
    };
    const readCells = cells => {
        if (restricted) return cells[0].many ? Infinity : cells[0].tally;
        return cells.reduce((acc, c) => acc * base + c.digit, 0);
    };
    const drawCell = (c, height = 34) => c.many ? G.drawMany(height) : c.tally !== undefined ? G.drawTally(c.tally, height) : G.drawDigit(c.digit, height);
    const write = (n, height = 34) => {
        const cells = cellsOf(n);
        return `<span class="numeral" dir="ltr">${cells.length === 1 || restricted ? cells.map(c => drawCell(c, height)).join('') : G.number(cells.map(c => c.digit), height)}</span>`;
    };
    const candidates = [1, 2, 3, 4, 5, 7, 9, 10, 12, 20, 21, 30, 100, 144, 365, 1000, 2026].filter(n => isDefined(system, n));
    const examples = candidates.slice(0, 12).map(n => ({ n, word: numeralForm(system, n, spec).form }));
    // check: every defined sample reads back
    const bad = [...candidates, 0, 6, 8, 11, 15, 19, 99, 255, 1999, 123456].filter(n => isDefined(system, n) && readCells(cellsOf(n)) !== n).length;
    const digits = restricted ? [] : Array.from({ length: base }, (_, v) => ({ v, svg: drawCell({ digit: v }, 40) }));
    return { type, base, mode: G.mode, quality: G.quality, tradition: G.tradition, restricted, composite, digits, many: restricted ? drawCell({ many: true }, 40) : null, limit: maxDefined(system), cellsOf, readCells, drawCell, write, examples, failures: bad };
}

// Cistercian numerals: one composite sign per group of four digits. They write the value in decimal whatever the base of the
// spoken numerals (the words are unchanged). A language that counts only a few numbers has signs for those numbers only.
const SAMPLES = [1, 20, 300, 4000, 5555, 6789, 9394, 2026, 12345, 100000];
function cistercianSigns(lang, W, sys, option, restricted) {
    const system = lang.numerals, spec = lang.spec;
    const G = cistercianGraphics({ seed: spec.seed, script: W.tradition ? { tradition: W.tradition } : null, system: sys, orientation: option.orientation ?? 'auto' });
    const cellsOf = n => groupsOf(n).map(g => ({ group: g, corners: groupCorners(sys, g) }));
    const readCells = cells => cells.reduce((acc, c) => acc * 10000 + decodeGroup(sys, c.corners), 0);
    const drawCell = (c, height = 34) => G.drawGroup(c.group, height);
    const write = (n, height = 34) => `<span class="numeral" dir="ltr">${G.number(groupsOf(n), height)}</span>`;
    const candidates = SAMPLES.filter(n => isDefined(system, n));
    const examples = candidates.map(n => ({ n, word: numeralForm(system, n, spec).form }));
    const bad = [...SAMPLES, 0, 1, 9, 10, 99, 100, 999, 1000, 9999, 10000, 10001, 99999999].filter(n => readCells(cellsOf(n)) !== n).length;
    const places = ['units', 'tens', 'hundreds', 'thousands'];
    const table = places.map((label, p) => ({ label, cells: Array.from({ length: 9 }, (_, i) => ({ v: i + 1, svg: G.drawPlaced(i + 1, p, 40) })) }));
    return { type: system.config.type, base: 10, mode: G.mode, quality: G.quality, tradition: G.tradition, restricted: false, composite: false,
        cistercian: { system: sys, label: CISTERCIAN_LABELS[sys], orientation: G.orientation, table, stave: G.drawGroup(0, 40) }, digits: [], many: null, limit: 0, cellsOf, readCells, drawCell, write, examples, failures: bad };
}
