// Renderers of a description (describe.js): HTML for the Description tab and the HTML export, Markdown, and MediaWiki markup.
// Pure functions: description -> string. Inline markers (see describe.js) are resolved here according to the target.
import { esc } from '../core/text.js';

const MARK = /⟦([stp])\|([^|⟧]*)\|([^⟧]*)⟧/g;
export const WIKIPEDIA = 'https://en.wikipedia.org/wiki/';
export const wikipediaUrl = title => WIKIPEDIA + encodeURI(title.replace(/ /g, '_')).replace(/\?/g, '%3F');
const anchor = id => `desc-${id}`;

// mode: html | md | wiki ; opts: { pageLinks, termLinks, sectionTitles }
export function inline(text, mode, opts = {}) {
    const titles = opts.sectionTitles ?? {};
    const out = String(text).replace(MARK, (_, kind, target, shown) => {
        if (mode === 'html') {
            const t = esc(shown);
            if (kind === 's') return `<a href="#${anchor(target)}" data-desc-link="${anchor(target)}">${t}</a>`;
            if (kind === 't' && opts.termLinks) return `<a href="${esc(wikipediaUrl(target))}" target="_blank" rel="noopener">${t}</a>`;
            return t;
        }
        if (mode === 'wiki') {
            if (kind === 's') return titles[target] ? `[[#${titles[target]}|${shown}]]` : shown;
            if (kind === 't') return opts.termLinks ? `[${wikipediaUrl(target)} ${shown}]` : shown;
            return opts.pageLinks ? (target === shown ? `[[${target}]]` : `[[${target}|${shown}]]`) : shown;
        }
        return shown;
    });
    return out;
}
// the HTML mode must escape the text around the markers: escape the pieces, substitute the markers
function htmlEscaped(text, opts) {
    let last = 0, out = '';
    for (const m of String(text).matchAll(MARK)) { out += esc(text.slice(last, m.index)) + inline(m[0], 'html', opts); last = m.index + m[0].length; }
    return out + esc(String(text).slice(last));
}

const sectionTitles = d => Object.fromEntries(d.sections.map(s => [s.id, s.title]));
const ipaOf = (d, withIpa) => withIpa ? ` <span class="ipa">${esc(d.ipa)}</span>` : '';

export function descriptionHtml(d, { ipa = false, termLinks = false } = {}) {
    const o = { termLinks };
    const H = t => htmlEscaped(t, o);
    const info = `<table class="infobox"><caption>${esc(d.title)}${ipaOf(d, ipa)}</caption><tbody>${d.infobox.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${H(v)}</td></tr>`).join('')}</tbody></table>`;
    const toc = `<nav class="toc desc-toc" aria-label="Contents">${d.sections.map(s => `<a href="#${anchor(s.id)}" data-desc-link="${anchor(s.id)}">${esc(s.title)}</a>`).join('')}</nav>`;
    const sec = s => `<section id="${anchor(s.id)}" class="desc-section"><h2>${esc(s.title)}</h2>${s.paragraphs.map(p => `<p>${H(p)}</p>`).join('')}${(s.subsections ?? []).map(x => `<h3>${esc(x.title)}</h3>${x.paragraphs.map(p => `<p>${H(p)}</p>`).join('')}`).join('')}${s.sample ? `<table class="names-table full-table desc-sample"><thead><tr><th></th><th>${esc(d.title)}</th><th>English</th></tr></thead><tbody>${s.sample.rows.map(r => `<tr><td>${esc(r.speaker ?? '')}</td><td class="name-cell">${esc(r.native)}</td><td>${esc(r.english)}</td></tr>`).join('')}</tbody></table>` : ''}</section>`;
    return `<article class="description"><h1 class="desc-title">${esc(d.title)}${ipaOf(d, ipa)}</h1>${info}<div class="desc-lead">${d.lead.map(p => `<p>${H(p)}</p>`).join('')}</div>${toc}${d.sections.map(sec).join('')}<p class="sub desc-cats">Categories: ${d.categories.map(esc).join(' · ')}</p></article>`;
}

export function descriptionMarkdown(d) {
    const out = [`# ${d.title}`, '', ...d.infobox.map(([k, v]) => `- **${k}:** ${inline(v, 'md')}`), '', ...d.lead.flatMap(p => [inline(p, 'md'), ''])];
    for (const s of d.sections) {
        out.push(`## ${s.title}`, '', ...s.paragraphs.flatMap(p => [inline(p, 'md'), '']));
        for (const x of s.subsections ?? []) out.push(`### ${x.title}`, '', ...x.paragraphs.flatMap(p => [inline(p, 'md'), '']));
        if (s.sample) out.push(`| | ${d.title} | English |`, '| --- | --- | --- |', ...s.sample.rows.map(r => `| ${r.speaker ?? ''} | ${r.native} | ${r.english} |`), '');
    }
    return out.join('\n');
}

// ---- MediaWiki ----
// opts.infobox: 'table' (self-contained wikitable, works on any wiki) | 'template' ({{Infobox language}}, Wikipedia's template)
// opts.pageLinks: wrap region, people, mother and sister language in [[...]] (they are red links until the pages are written)
// opts.termLinks: link linguistic terms to Wikipedia as external links; opts.categories: add [[Category:...]]
export function descriptionWikitext(d, opts = {}) {
    const o = { pageLinks: !!opts.pageLinks, termLinks: !!opts.termLinks, sectionTitles: sectionTitles(d) };
    const W = t => inline(t, 'wiki', o);
    const lines = [];
    const plainInfo = Object.fromEntries(d.infobox.map(([k, v]) => [k, inline(v, 'wiki', { ...o, termLinks: false })]));
    if (opts.infobox === 'template') {
        lines.push('{{Infobox language', `| name = ${d.title}`, `| nativename = ${d.native}`, `| pronunciation = ${d.ipa}`, `| region = ${plainInfo.Region}`, `| ethnicity = ${plainInfo.Ethnicity}`, `| speakers = ${plainInfo['Native speakers']}`, '| familycolor = constructed', `| fam1 = Constructed language`, `| fam2 = ${plainInfo['Early form'].replace(/ \(c\..*$/, '')}`, `| script = ${plainInfo['Writing system']}`, `| notes = ${plainInfo.Status}. Word order: ${plainInfo['Word order']}. Alignment: ${plainInfo.Alignment}. Code (invented, private use): ${d.code}.`, '}}');
    } else {
        lines.push('{| class="infobox" style="float:right; clear:right; width:24em; margin:0 0 1em 1em; border:1px solid #a2a9b1; background:#f8f9fa; font-size:88%;"', `|+ '''${d.title}'''${d.ipa ? ` <small>${d.ipa}</small>` : ''}`);
        for (const [k, v] of d.infobox) lines.push('|-', `! scope="row" style="text-align:left;" | ${k}`, `| ${W(v)}`);
        lines.push('|}');
    }
    lines.push('');
    d.lead.forEach((p, i) => lines.push(i === 0 ? W(p).replace(d.title, `'''${d.title}'''`) : W(p), ''));
    for (const s of d.sections) {
        lines.push(`== ${s.title} ==`, '');
        s.paragraphs.forEach(p => lines.push(W(p), ''));
        for (const x of s.subsections ?? []) { lines.push(`=== ${x.title} ===`, ''); x.paragraphs.forEach(p => lines.push(W(p), '')); }
        if (s.sample) lines.push('{| class="wikitable"', `! !! ${d.title} !! English`, ...s.sample.rows.flatMap(r => ['|-', `| ${r.speaker ?? ''} || ${r.native} || ${r.english}`]), '|}', '');
    }
    if (opts.categories !== false) lines.push(...d.categories.map(c => `[[Category:${c}]]`), '');
    return lines.join('\n');
}

// every linguistic term used in the description, with the Wikipedia title it points to (used by the test and the link check)
export function termTargets(d) {
    const found = new Set();
    const scan = t => { for (const m of String(t).matchAll(MARK)) if (m[1] === 't') found.add(m[2]); };
    d.infobox.forEach(([, v]) => scan(v)); d.lead.forEach(scan);
    d.sections.forEach(s => { s.paragraphs.forEach(scan); (s.subsections ?? []).forEach(x => x.paragraphs.forEach(scan)); });
    return [...found].sort();
}
