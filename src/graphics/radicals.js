// Radicals: the few basic forms a tradition builds its letters from, in the unit square (y down). Each radical has a curved
// and an angular variant; a tradition chooses its variant by its form, and a letter is one radical (or two) plus a modifier.
import { mapPts, bbox } from './core.js';

const S = (pts, o = {}) => ({ pts, ...o });
const R = {
    stem: () => [S([[.5, 0], [.5, 1]])],
    bowl: v => v === 'smooth' ? [S([[.5, 0], [1, .5], [.5, 1], [0, .5]], { smooth: true, closed: true })]
        : v === 'geometric' ? [S([[0, 0], [1, 0], [1, 1], [0, 1]], { closed: true })]
            : [S([[.2, 0], [.8, 0], [1, .3], [1, .7], [.8, 1], [.2, 1], [0, .7], [0, .3]], { closed: true })],
    arcR: v => v === 'smooth' ? [S([[1, .08], [.45, 0], [0, .5], [.45, 1], [1, .92]], { smooth: true })] : [S([[1, 0], [0, 0], [0, 1], [1, 1]])],
    arcL: v => v === 'smooth' ? [S([[0, .08], [.55, 0], [1, .5], [.55, 1], [0, .92]], { smooth: true })] : [S([[0, 0], [1, 0], [1, 1], [0, 1]])],
    cupU: v => v === 'smooth' ? [S([[0, 0], [.08, .7], [.5, 1], [.92, .7], [1, 0]], { smooth: true })] : [S([[0, 0], [0, 1], [1, 1], [1, 0]])],
    capN: v => v === 'smooth' ? [S([[0, 1], [.08, .3], [.5, 0], [.92, .3], [1, 1]], { smooth: true })] : [S([[0, 1], [0, 0], [1, 0], [1, 1]])],
    vee: v => v === 'smooth' ? [S([[0, 0], [.5, 1], [1, 0]], { smooth: true })] : [S([[0, 0], [.5, 1], [1, 0]])],
    hook: v => v === 'smooth' ? [S([[.6, 0], [.6, .65], [.35, 1], [0, .85]], { smooth: true })] : [S([[.6, 0], [.6, 1], [0, 1]])],
    zig: v => v === 'smooth' ? [S([[0, 0], [1, .3], [0, .7], [1, 1]], { smooth: true })] : [S([[0, 0], [1, .33], [0, .66], [1, 1]])],
    tri: () => [S([[0, 1], [.5, 0], [1, 1]], { closed: true })],
    fork: () => [S([[0, 0], [.5, .5], [1, 0]]), S([[.5, .5], [.5, 1]])],
    spur: v => [S([[0, 0], [0, 1]]), v === 'smooth' ? S([[0, 0], [.9, .1], [.9, .45], [0, .55]], { smooth: true }) : S([[0, 0], [1, 0], [1, .5], [0, .5]])],
    loopTail: v => [v === 'smooth' ? S([[.5, 0], [1, .25], [.5, .5], [0, .25]], { smooth: true, closed: true }) : S([[.2, 0], [.8, 0], [.8, .5], [.2, .5]], { closed: true }), S([[.8, .25], [.8, 1]])],
    cross: () => [S([[.5, 0], [.5, 1]]), S([[0, .5], [1, .5]])],
    diag: () => [S([[0, 0], [1, 1]])],
    bar: () => [S([[0, .5], [1, .5]])],
    ring: v => v === 'smooth' ? [S([[.5, 0], [1, .5], [.5, 1], [0, .5]], { smooth: true, closed: true })] : [S([[.5, 0], [1, .5], [.5, 1], [0, .5]], { closed: true })],
    lens: v => v === 'smooth' ? [S([[0, .5], [.5, 0], [1, .5], [.5, 1]], { smooth: true, closed: true })] : [S([[0, .5], [.5, 0], [1, .5], [.5, 1]], { closed: true })],
    spiral: () => [S([[.5, .5], [.7, .4], [.75, .65], [.45, .85], [.15, .6], [.3, .2], [.7, .05], [1, .4]], { smooth: true })],
    wave: () => [S([[0, .5], [.25, .1], [.5, .5], [.75, .9], [1, .5]], { smooth: true })]
};
export const RADICALS = Object.keys(R);
// the variant of a radical in a tradition: `form` is angular, curvilinear, geometric or mixed (a stable random choice per radical)
export function radical(name, form, pick = 0) {
    const variant = form === 'curvilinear' ? 'smooth' : form === 'angular' ? 'angular' : form === 'geometric' ? 'geometric' : (pick % 2 ? 'smooth' : 'angular');
    return R[name](variant);
}

// ---- modifiers: small additions that tell the members of a family apart ------------------------------------------------
// each returns extra strokes around a glyph with bounding box b
export const MODIFIERS = {
    bar: b => [S([[b.x0 - 1.4, b.cy], [b.x1 + 1.4, b.cy]])],
    topTick: b => [S([[b.cx - 0.5, b.y0 - 0.2], [b.cx + 3, b.y0 - 3.4]])],
    underTick: b => [S([[b.cx + 0.5, b.y1 + 0.2], [b.cx - 3, b.y1 + 3.4]])],
    dotIn: b => [{ dot: [b.cx, b.cy] }],
    tailR: b => [S([[b.x1 - 0.5, b.y1 - 1], [b.x1 + 3.2, b.y1 + 3]])],
    dotAbove: b => [{ dot: [b.cx, b.y0 - 3] }],
    dotBelow: b => [{ dot: [b.cx, b.y1 + 3] }],
    spurL: b => [S([[b.x0 - 3, b.y0 + 2], [b.x0 + 0.3, b.y0 + 4.5]])],
    twinDots: b => [{ dot: [b.cx - 1.8, b.y0 - 3] }, { dot: [b.cx + 1.8, b.y0 - 3] }],
    twinBelow: b => [{ dot: [b.cx - 1.8, b.y1 + 3] }, { dot: [b.cx + 1.8, b.y1 + 3] }]
};
export const MODIFIER_NAMES = Object.keys(MODIFIERS);
export const applyModifier = (strokes, name) => [...strokes, ...MODIFIERS[name](bbox(strokes))];
export { mapPts };
