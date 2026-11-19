import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveTheme } from '../src/ui/theme.js';
import { ICON_NAMES, iconSvg } from '../src/ui/icons.js';

const css = fs.readFileSync(new URL('../css/generator.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const block = sel => { const i = css.indexOf(sel); return css.slice(css.indexOf('{', i), css.indexOf('}', i)); };
const vars = text => Object.fromEntries([...text.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map(m => [m[1], m[2].toLowerCase()]));
const DARK = vars(block(':root {')), LIGHT = { ...DARK, ...vars(block(':root[data-theme="light"]')) };
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('theme: the palette is the sand palette of the specification', () => {
    assert.equal(LIGHT.bg, '#f4efe3'); assert.equal(LIGHT.text, '#493326'); assert.equal(LIGHT.accent, '#a15d35');
    assert.equal(DARK.bg, '#211b18'); assert.equal(DARK.text, '#f0e5d2'); assert.equal(DARK.accent, '#d99568'); assert.equal(DARK.muted, '#b9a18b');
});

test('theme: text, secondary text and accent text reach 4.5:1 on every surface; buttons too', () => {
    for (const [name, P] of [['light', LIGHT], ['dark', DARK]]) {
        for (const surface of ['bg', 'panel', 'panel2', 'deep', 'raised'])
            for (const fg of ['text', 'muted', 'accent-text', 'text3']) assert.ok(ratio(P[surface], P[fg]) >= 4.5, `${name}: ${fg} on ${surface} = ${ratio(P[surface], P[fg]).toFixed(2)}`);
        assert.ok(ratio(P['primary-bg'], P['primary-text']) >= 4.5, `${name}: button text`);
        assert.ok(ratio(P.panel, P.strong) >= 7 && ratio(P['toggle-active'], P.strong) >= 7, `${name}: strong text`);
        assert.ok(ratio(P.panel, P.muted) >= 4.5 && ratio(P.bg, P.muted) >= 4.5, `${name}: unselected toggle text`);
    }
});

test('theme: resolution of the saved choice', () => {
    assert.equal(resolveTheme('light', false), 'light'); assert.equal(resolveTheme('dark', true), 'dark');
    assert.equal(resolveTheme('system', true), 'light'); assert.equal(resolveTheme('system', false), 'dark'); assert.equal(resolveTheme('anything', true), 'dark');
});

test('theme: the header has a two-segment toggle, the cartouche, the geometric band and an icon on every tab and header button', () => {
    assert.ok(/data-theme-choice="light"[^>]*>Light Mode</.test(html) && /data-theme-choice="dark"[^>]*>Dark Mode</.test(html));
    assert.ok(!html.includes('theme-select'));
    assert.ok(html.includes('class="tifinagh cartouche"') && html.includes('class="band"'));
    const tabs = [...html.matchAll(/class="tab[^"]*" data-tab="([\w-]+)"([^>]*)>/g)];
    assert.equal(tabs.length, 7);
    for (const [, tab, rest] of tabs) { assert.ok(rest.includes(`data-icon="${tab}"`), tab); assert.ok(ICON_NAMES.includes(tab), tab); }
    for (const id of ['open-vocabulary', 'copy-vocabulary']) assert.ok(new RegExp(`id="${id}" data-icon="(\\w+)"`).test(html), id);
    for (const [, name] of html.matchAll(/data-icon="([\w-]+)"/g)) assert.ok(ICON_NAMES.includes(name), name);
});

test('theme: icons are decorative inline SVG coloured by the text', () => {
    for (const n of ICON_NAMES) { const s = iconSvg(n); assert.ok(s.includes('stroke="currentColor"') && s.includes('aria-hidden="true"') && s.includes('<path') || s.includes('<rect') || s.includes('<circle'), n); }
    assert.equal(iconSvg('no-such-icon'), '');
});
