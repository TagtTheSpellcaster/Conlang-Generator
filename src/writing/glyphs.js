// Procedural glyphs. A glyph is a few strokes on a small grid, drawn in one of four styles; a style is a family resemblance
// (all the angular signs are made of straight strokes at 0, 45 and 90 degrees, and so on), never a copy of a real script.
import { rng } from '../core/rng.js';

const COLS = 3, ROWS = 5, U = 6, M = 3;            // grid of 3 x 5 points, 6 units apart, 3 units of margin
export const GLYPH_W = (COLS - 1) * U + 2 * M, GLYPH_H = (ROWS - 1) * U + 2 * M;
const px = c => M + c * U, py = r => M + r * U;
const f = n => Number(n.toFixed(1));

const DIRECTIONS = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 0], [2, 0], [1, 1], [2, 2], [1, 2], [2, 4], [1, 3]];   // dx, dy (any sign)
const inGrid = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS;

// One glyph: a list of strokes {kind: 'L'|'Q'|'O'|'D', ...}. `style` is angular, curvy, mixed or geometric.
function drawGlyph(r, style) {
    const strokes = [], nodes = [];
    let c = Math.floor(r() * COLS), row = Math.floor(r() * 2) * 1;
    nodes.push([c, row]);
    const count = 2 + Math.floor(r() * 3);
    for (let i = 0; i < count; i++) {
        const [sc, sr] = nodes[Math.floor(r() * nodes.length)];
        let target = null;
        for (let t = 0; t < 30 && !target; t++) {
            const [dx, dy] = DIRECTIONS[Math.floor(r() * DIRECTIONS.length)];
            const sx = r() < 0.5 ? -1 : 1, sy = r() < 0.7 ? 1 : -1;
            const nc = sc + dx * sx, nr = sr + dy * sy;
            if (inGrid(nc, nr) && !(nc === sc && nr === sr) && (style !== 'angular' || dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) target = [nc, nr];
        }
        if (!target) continue;
        const curved = style === 'curvy' || (style === 'mixed' && r() < 0.5) || (style === 'geometric' && r() < 0.25);
        strokes.push({ kind: curved ? 'Q' : 'L', a: [sc, sr], b: target, bend: (r() < 0.5 ? -1 : 1) * (3 + r() * 3) });
        nodes.push(target);
    }
    if (style === 'geometric' || (style === 'mixed' && r() < 0.3)) strokes.push({ kind: 'O', at: [Math.floor(r() * COLS), 1 + Math.floor(r() * (ROWS - 2))], rad: 2.5 + r() * 2 });
    if (r() < 0.25) strokes.push({ kind: 'D', at: [Math.floor(r() * COLS), Math.floor(r() * ROWS)] });
    return strokes;
}

const key = strokes => strokes.map(s => s.kind === 'O' || s.kind === 'D' ? `${s.kind}${s.at}` : `${s.kind}${[s.a, s.b].sort().join('-')}`).sort().join('|');
const mirror = strokes => key(strokes.map(s => s.kind === 'O' || s.kind === 'D' ? { ...s, at: [COLS - 1 - s.at[0], s.at[1]] } : { ...s, a: [COLS - 1 - s.a[0], s.a[1]], b: [COLS - 1 - s.b[0], s.b[1]] }));

export function strokesToPath(strokes) {
    return strokes.map(s => {
        if (s.kind === 'L') return `M${f(px(s.a[0]))} ${f(py(s.a[1]))}L${f(px(s.b[0]))} ${f(py(s.b[1]))}`;
        if (s.kind === 'Q') {
            const x1 = px(s.a[0]), y1 = py(s.a[1]), x2 = px(s.b[0]), y2 = py(s.b[1]);
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
            return `M${f(x1)} ${f(y1)}Q${f(mx - dy / len * s.bend)} ${f(my + dx / len * s.bend)} ${f(x2)} ${f(y2)}`;
        }
        if (s.kind === 'O') { const x = px(s.at[0]), y = py(s.at[1]); return `M${f(x - s.rad)} ${f(y)}a${f(s.rad)} ${f(s.rad)} 0 1 0 ${f(2 * s.rad)} 0a${f(s.rad)} ${f(s.rad)} 0 1 0 ${f(-2 * s.rad)} 0`; }
        const x = px(s.at[0]), y = py(s.at[1]);
        return `M${f(x)} ${f(y)}l0.01 0`;
    }).join('');
}

// A set of distinct glyphs (none the mirror image of another, so that left and right are never the only difference).
export function makeGlyphs(seed, style, count) {
    const r = rng(`${seed}|writing|glyphs|${style}`);
    const seen = new Set(), out = [];
    for (let guard = 0; out.length < count && guard < count * 400; guard++) {
        const g = drawGlyph(r, style);
        if (g.length < 2) continue;
        const rows = g.flatMap(x => x.kind === 'O' || x.kind === 'D' ? [x.at[1]] : [x.a[1], x.b[1]]);
        if (Math.max(...rows) - Math.min(...rows) < 3) continue;      // too small to be read at a glance
        const k = key(g);
        if (seen.has(k) || seen.has(mirror(g))) continue;
        seen.add(k);
        out.push(strokesToPath(g));
    }
    while (out.length < count) out.push(out[out.length % Math.max(1, out.length)] ?? 'M3 3L15 27');   // never reached in practice
    return out;
}

// Small marks, drawn in an 8 x 8 box: vowel signs (abugida, abjad) and vowel components (syllabary).
export const MARK_SHAPES = [
    'M1 7L5 1', 'M1 1Q7 1 7 7', 'M0 4L8 4', 'M4 4l0.01 0', 'M2 4l0.01 0M6 4l0.01 0', 'M1 4a3 3 0 1 0 6 0a3 3 0 1 0 -6 0', 'M0 1L4 7L8 1', 'M0 6Q4 -2 8 6',
    'M0 4L8 4M4 0L4 8', 'M0 7L3 1L5 7L8 1', 'M4 0L4 8', 'M1 1L7 7'
];
export const MARK_POSITIONS = ['above', 'below', 'after'];

// Distinct (shape, position) pairs for n marks: new shapes first, so the marks differ by shape whenever they can.
export function makeMarks(seed, n) {
    const r = rng(`${seed}|writing|marks`);
    const shapes = MARK_SHAPES.map((d, i) => ({ d, i, k: r() })).sort((a, b) => a.k - b.k);
    const out = [];
    for (let i = 0; i < n; i++) {
        const s = shapes[i % shapes.length];
        out.push({ d: s.d, pos: MARK_POSITIONS[Math.floor(i / shapes.length) % 3 === 0 ? Math.floor(r() * 3) : (Math.floor(i / shapes.length) + 1) % 3] });
    }
    return out;
}

const stroke = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"';
const asBase = b => typeof b === 'string' ? { layers: [{ d: b, tx: 0, ty: 0, s: 1 }], w: GLYPH_W, h: GLYPH_H } : b;

// Two glyphs fused into one sign. mode 'half': the first one is reduced and tucked to the left, joined to the second by a stroke
// (the conjunct of an abugida); mode 'fused': both slightly narrowed and overlapping, joined at mid height (a ligature of letters).
export function ligature(p1, p2, mode = 'fused') {
    const W = GLYPH_W, H = GLYPH_H;
    if (mode === 'half') {
        const w = W * 0.62 + W;
        return { layers: [{ d: p1, tx: 0, ty: H * 0.38, s: 0.62 }, { d: p2, tx: W * 0.62, ty: 0, s: 1 }, { d: `M${f(W * 0.5)} ${f(H * 0.7)}L${f(W * 0.7)} ${f(H * 0.55)}`, tx: 0, ty: 0, s: 1 }], w, h: H };
    }
    return { layers: [{ d: p1, tx: 0, ty: H * 0.05, s: 0.9 }, { d: p2, tx: W * 0.62, ty: H * 0.05, s: 0.9 }, { d: `M${f(W * 0.75)} ${f(H * 0.5)}L${f(W * 0.85)} ${f(H * 0.5)}`, tx: 0, ty: 0, s: 1 }], w: W * 0.62 + W * 0.9, h: H };
}

// A cell: a base glyph (path or ligature) with optional marks; a syllabary cell has a vowel component beside the consonant one.
export function cellSvg({ base = null, marks = [], baseScale = 1, vowelMark = null, bar = false }, height = 40) {
    const parts = [];
    const B = base ? asBase(base) : null;
    const h = B ? B.h * baseScale : GLYPH_H;
    const baseW = B ? B.w * baseScale : 0;
    let width = baseW;
    const dy = marks.some(m => m.pos === 'above') ? 11 : 0;
    if (B) parts.push(`<g transform="translate(0 ${f(dy)}) scale(${baseScale})">${B.layers.map(l => `<path d="${l.d}" ${stroke} transform="translate(${f(l.tx)} ${f(l.ty)}) scale(${l.s})"/>`).join('')}</g>`);
    const bottom = dy + h;
    for (const m of marks) {
        const x = m.pos === 'after' ? baseW + 1 : (baseW - 8) / 2 + 1, y = m.pos === 'above' ? 1 : m.pos === 'below' ? bottom + 1 : dy + h * 0.55;
        parts.push(`<path d="${m.d}" ${stroke} transform="translate(${f(x)} ${f(y)})"/>`);
        if (m.pos === 'after') width = Math.max(width, baseW + 10);
    }
    if (vowelMark) {
        parts.push(`<path d="${vowelMark}" ${stroke} transform="translate(${f(baseW + 2)} ${f(dy + h * 0.35)}) scale(1.15)"/>`);
        width = baseW + 12;
    }
    if (bar) parts.push(`<path d="M2 ${f(bottom + 3)}L${f(Math.max(width, baseW) - 2)} ${f(bottom + 3)}" ${stroke}/>`);
    const totalH = bottom + (marks.some(m => m.pos === 'below') ? 11 : 0) + (bar ? 6 : 0) + 2;
    const sc = height / Math.max(totalH, 1);
    return `<svg class="cell" viewBox="0 0 ${f(Math.max(width, 6))} ${f(totalH)}" width="${f(Math.max(width, 6) * sc)}" height="${height}" aria-hidden="true">${parts.join('')}</svg>`;
}
