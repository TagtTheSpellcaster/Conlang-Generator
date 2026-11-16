// Graphic core shared by the scripts and the numerals: a tradition (the way a culture writes), strokes with a direction,
// and a renderer that turns strokes into filled outlines whose width depends on the writing technology.
// Nothing here is a font or a catalogue: every shape is built from a few radicals by rules (see radicals.js, scripts.js).
import { rng } from '../core/rng.js';

// Vertical metrics of a glyph, in glyph units (the SVG is VIEW_H units tall): ascender line, x-height, baseline, descender line.
export const Y = { asc: 5, xh: 11, base: 21, desc: 29 };
export const VIEW_H = 34;
const f = n => Math.round(n * 10) / 10;

// ---- strokes: {pts: [[x, y]...], smooth, closed} or {dot: [x, y]} ------------------------------------------------------
export const mapPts = (strokes, fn) => strokes.map(s => s.dot ? { ...s, dot: fn(s.dot) } : { ...s, pts: s.pts.map(fn) });
export const place = (strokes, x, y, w, h) => mapPts(strokes, ([a, b]) => [x + a * w, y + b * h]);
export const shift = (strokes, dx, dy) => mapPts(strokes, ([a, b]) => [a + dx, b + dy]);
export function bbox(strokes) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of strokes) for (const [a, b] of s.dot ? [s.dot] : s.pts) { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, a); y1 = Math.max(y1, b); }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
export function transform(strokes, { mirror = false, rot = 0, sx = 1, sy = 1 } = {}) {   // around the centre of the bounding box
    const b = bbox(strokes);
    const t = ([x, y]) => {
        let a = x - b.cx, c = y - b.cy;
        if (mirror) a = -a;
        for (let i = 0; i < rot; i++) [a, c] = [-c, a];                          // quarter turns
        return [b.cx + a * sx, b.cy + c * sy];
    };
    return mapPts(strokes, t);
}
export const withMin = (strokes, x, y) => { const b = bbox(strokes); return shift(strokes, x - b.x0, y - b.y0); };

function catmull(p, closed, n = 6) {
    const m = closed ? p.length : p.length - 1, out = [];
    const at = i => closed ? p[(i + p.length) % p.length] : p[Math.max(0, Math.min(p.length - 1, i))];
    for (let i = 0; i < m; i++) {
        const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
        for (let k = 0; k < n; k++) {
            const t = k / n, t2 = t * t, t3 = t2 * t;
            out.push([0, 1].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
        }
    }
    out.push(closed ? out[0] : p[p.length - 1]);
    return out;
}
export function sample(s, step = 2) {
    let pts = s.pts;
    if (s.smooth && pts.length > 2) pts = catmull(pts, s.closed);
    else if (s.closed) pts = [...pts, pts[0]];
    const dense = [pts[0]];                                                     // no segment longer than `step`
    for (let i = 1; i < pts.length; i++) {
        const [a, b] = [pts[i - 1], pts[i]], len = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(len / step));
        for (let j = 1; j <= k; j++) dense.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
    }
    return dense;
}

// ---- tradition -------------------------------------------------------------------------------------------------------
export const TECHS = ['stone', 'clay', 'brush', 'pen', 'print'];
export const TECH_LABEL = { stone: 'chiselled in stone', clay: 'pressed into clay with a stylus', brush: 'painted with a brush', pen: 'written with a broad pen', print: 'drawn with a uniform line (type or pen)' };
const TECH_BY_GENRE = {
    dwarven: ['stone', 'stone', 'clay'], giant: ['stone'], orcish: ['stone', 'clay'], war: ['stone', 'brush'], undead: ['stone', 'pen'], infernal: ['stone', 'pen'],
    fey: ['brush', 'pen'], sacred: ['brush', 'pen'], women: ['brush', 'pen'], draconic: ['brush', 'stone'], arcane: ['pen', 'brush'], marine: ['brush', 'clay'],
    nomad: ['pen', 'brush'], artisan: ['pen', 'stone'], thieves: ['pen', 'brush'], merchant: ['pen', 'clay', 'print'], hive: ['clay', 'print'], machine: ['print']
};
const SW = { stone: 1.5, clay: 1.45, brush: 1.7, pen: 1.55, print: 1.2 };

export function makeTradition(seed, { type, style = 'mixed', genre, era = [], direction = 'ltr', tag = '' }) {
    const r = rng(`${seed}|graphics|tradition|${tag}`);
    const modern = era.some(e => ['futuristic', 'modern'].includes(e));
    const pool = modern ? ['print', 'print', 'pen'] : TECH_BY_GENRE[genre] ?? TECHS.filter(t => t !== 'print');
    const tech = pool[Math.floor(r() * pool.length)];
    const form = { angular: 'angular', curvy: 'curvilinear', geometric: 'geometric', mixed: 'mixed' }[style] ?? 'mixed';
    const wide = [0.78, 0.9, 1, 1.12][Math.floor(r() * 4)];
    const slant = (tech === 'pen' || tech === 'brush') && r() < 0.45 ? 10 : 0;
    const serif = tech === 'stone' && r() < 0.5;
    const weight = SW[tech] * (0.9 + r() * 0.25);
    const nib = (30 + r() * 25) * Math.PI / 180;
    const spacing = (form === 'angular' ? 1.4 : 1.9) * (0.8 + r() * 0.5);
    const ductus = { vertical: r() < 0.8 ? 'top to bottom' : 'bottom to top', horizontal: direction === 'rtl' ? 'right to left' : 'left to right' };
    const tags = [form, wide < 0.85 ? 'compact' : wide > 1.05 ? 'expanded' : null, slant ? 'slanted' : 'upright', serif ? 'with serifs' : null].filter(Boolean);
    return { seed, tag, form, tech, wide, slant, serif, weight, nib, spacing, ductus, tags, direction, type };
}

// ---- ductus: every stroke runs in the direction of the tradition and strokes are drawn in a fixed order ----------------
export function ductus(strokes, tr) {
    const out = strokes.map(s => {
        if (s.dot || s.closed || s.pts.length < 2) return s;
        const [a, b] = [s.pts[0], s.pts.at(-1)];
        const dy = b[1] - a[1], dx = b[0] - a[0];
        let rev = false;
        if (Math.abs(dy) > 1.5) rev = tr.ductus.vertical === 'top to bottom' ? dy < 0 : dy > 0;
        else rev = tr.ductus.horizontal === 'left to right' ? dx < 0 : dx > 0;
        return rev ? { ...s, pts: [...s.pts].reverse() } : s;
    });
    const key = s => { const p = s.dot ?? s.pts[0]; return tr.ductus.horizontal === 'left to right' ? p[0] * 2 + p[1] * 0.1 : -p[0] * 2 + p[1] * 0.1; };
    return out.sort((a, b) => key(a) - key(b));
}

// ---- rendering: a stroke becomes a filled outline whose width depends on the technology and the direction of the stroke -
function widthAt(tr, t, ang) {
    const sw = tr.weight;
    switch (tr.tech) {
        case 'pen': return sw * (0.3 + 0.7 * Math.abs(Math.sin(ang - tr.nib)));
        case 'brush': return sw * (0.4 + 1.1 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.6)) * (1 - 0.5 * t * t);
        case 'clay': return sw * (1.9 - 1.4 * t);                                           // a wedge: deep where the stylus enters
        default: return sw;
    }
}
function outline(pts, tr) {
    const n = pts.length;
    if (n < 2) return null;
    const len = [0];
    for (let i = 1; i < n; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = len[n - 1] || 1, L = [], R = [];
    const seg = i => { const [a, b] = [pts[i], pts[i + 1]], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; };
    for (let i = 0; i < n; i++) {
        const d1 = i > 0 ? seg(i - 1) : seg(0), d2 = i < n - 1 ? seg(i) : seg(n - 2);
        const n1 = [-d1[1], d1[0]], n2 = [-d2[1], d2[0]];
        let nx = n1[0] + n2[0], ny = n1[1] + n2[1];
        const m = Math.hypot(nx, ny) || 1; nx /= m; ny /= m;
        const k = 1 / Math.max(0.55, nx * n1[0] + ny * n1[1]);                          // miter, limited
        const w = widthAt(tr, len[i] / total, Math.atan2(d2[1], d2[0])) / 2 * k;
        L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    }
    const cap = (p, d, w) => (tr.tech === 'stone' || tr.tech === 'clay') ? [] : [[p[0] + d[0] * w * 0.7, p[1] + d[1] * w * 0.7]];
    const d0 = seg(0), dn = seg(n - 2);
    const w0 = widthAt(tr, 0, Math.atan2(d0[1], d0[0])) / 2, w1 = widthAt(tr, 1, Math.atan2(dn[1], dn[0])) / 2;
    return [...L, ...cap(pts[n - 1], dn, w1), ...R.reverse(), ...cap(pts[0], [-d0[0], -d0[1]], w0)];
}
export function pathOf(strokes, tr) {
    let d = '';
    for (const s of strokes) {
        let poly;
        if (s.dot) {
            const r = tr.weight * (tr.tech === 'stone' || tr.tech === 'clay' ? 0.7 : 0.62), [cx, cy] = s.dot;
            poly = Array.from({ length: 8 }, (_, i) => [cx + r * Math.cos(i * Math.PI / 4 + 0.4), cy + r * Math.sin(i * Math.PI / 4 + 0.4)]);
        } else poly = outline(sample(s), tr);
        if (!poly) continue;
        d += 'M' + poly.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
        if (tr.serif && !s.dot && !s.closed && s.pts.length === 2 && Math.abs(s.pts[1][0] - s.pts[0][0]) < 0.4 * Math.abs(s.pts[1][1] - s.pts[0][1])) {
            for (const p of s.pts) d += `M${f(p[0] - 1.8)} ${f(p[1] - 0.45)}L${f(p[0] + 1.8)} ${f(p[1] - 0.45)}L${f(p[0] + 1.8)} ${f(p[1] + 0.45)}L${f(p[0] - 1.8)} ${f(p[1] + 0.45)}Z`;
        }
    }
    return d;
}
export const skew = (strokes, tr) => tr.slant ? mapPts(strokes, ([x, y]) => [x + (Y.base - y) * Math.tan(tr.slant * Math.PI / 180) * 0.6, y]) : strokes;

// svg of a row of placed strokes (already positioned); `width` in glyph units
export function svgOf(strokes, tr, width, height = 40, cls = 'cell') {
    const d = pathOf(strokes, tr);
    const w = Math.max(width, 6);
    return `<svg class="${cls}" viewBox="0 0 ${f(w)} ${VIEW_H}" width="${f(w * height / VIEW_H)}" height="${height}" aria-hidden="true"><path d="${d}" fill="currentColor"/></svg>`;
}

// ---- measures used to check a system -----------------------------------------------------------------------------------
export function signature(strokes) {
    const cells = new Set();
    for (const s of strokes) for (const [x, y] of s.dot ? [s.dot] : sample(s, 1)) cells.add(`${Math.floor(x / 1.7)},${Math.floor(y / 1.7)}`);
    return cells;
}
export const distance = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return 1 - i / (a.size + b.size - i || 1); };
export function ink(strokes) {
    let t = 0;
    for (const s of strokes) { if (s.dot) { t += 1; continue; } const p = sample(s, 2); for (let i = 1; i < p.length; i++) t += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); }
    return t;
}
