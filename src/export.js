// Exports of a generated language. Pure: language -> text. The sheet is built once as a small document model
// (sections of key/value lists, tables and paragraphs) and rendered to Markdown or standalone HTML.
import { label } from './lexicon/schema.js';
import { inflect, genderOf } from './morphology/inflect.js';
import { personCells } from './morphology/affixes.js';
import { exampleNoun, exampleVerb, exampleAdjective } from './morphology/examples.js';
import { tokenText } from './syntax/realize.js';
import { generateNames, NAME_KINDS } from './names.js';
import { numeralForm, ordinalForm, numeralMeaning, sampleNumbers } from './numerals/system.js';
import { NUMERAL_LABELS } from './numerals/choose.js';

const plain = parts => parts.map(p => p.text).join('-') || '∅';
const list = a => a.length ? a.join(' ') : 'none';
const CELL = { singular: 'sg', plural: 'pl', dual: 'du' };
const cellLabel = cell => { const [p, n] = cell.split('.'); return `${p}${CELL[n]}`; };
const FRAME = {
    nominative: n => n, accusative: n => n, absolutive: n => n, genitive: n => `of the ${n}`, dative: n => `to the ${n}`,
    locative: n => `in the ${n}`, ablative: n => `from the ${n}`, instrumental: n => `with the ${n}`, ergative: n => `by the ${n}`
};

function paradigmSections(lang) {
    const { spec, morphology } = lang;
    const { model, affixes } = morphology;
    const morph = { spec, model, affixes };
    const out = [];
    const noun = exampleNoun(lang.lexicon);
    if (noun) {
        const cases = model.cases.length ? model.cases : [null];
        const gender = genderOf(noun, spec);
        const blocks = [{ type: 'para', text: `Example noun: ${label(noun)} — ${noun.form}${gender ? ` (gender: ${gender})` : ''}. A hyphen separates the stem from its endings; ∅ is an empty ending.` }];
        for (const number of spec.numbers) {
            blocks.push({ type: 'heading', text: number[0].toUpperCase() + number.slice(1) });
            blocks.push({ type: 'table', head: ['Case', 'Form', 'Meaning'], rows: cases.map(c => [c ?? '—', plain(inflect(noun, { number, case: c }, morph).parts), `${(FRAME[c ?? 'nominative'] ?? (n => n))(noun.lemma)}${number !== 'singular' ? ` (${number})` : ''}`]) });
        }
        const m = affixes.numberMarkers;
        if (spec.morphology === 'isolating') blocks.push({ type: 'para', text: 'Isolating morphology: nouns are not inflected; relations are expressed with adpositions.' });
        else if (affixes.fused) blocks.push({ type: 'para', text: 'Fusional morphology: one portmanteau ending per gender, number and case.' });
        else blocks.push({ type: 'para', text: `${m.plural ? `Plural marker: ${m.plural} (${m.mode})${m.dual ? `, dual marker: ${m.dual}` : ''}. ` : ''}Suffix order on nouns: stem – number – possessor – case.` });
        out.push({ title: 'Nouns', blocks });
    }
    const adj = spec.morphology === 'isolating' ? null : exampleAdjective(lang.lexicon);
    if (adj) {
        const rows = [];
        for (const g of spec.genders.length ? spec.genders : [null]) for (const number of spec.numbers) for (const c of model.cases.length ? model.cases : [null])
            rows.push([g ?? '—', number, c ?? '—', plain(inflect(adj, { number, case: c, gender: g }, morph).parts)]);
        out.push({ title: 'Adjectives', blocks: [{ type: 'para', text: `Example adjective: ${adj.lemma} — ${adj.form}. Adjectives agree with the noun.` }, { type: 'table', head: ['Gender', 'Number', 'Case', 'Form'], rows }] });
    }
    const verb = exampleVerb(lang.lexicon);
    const v = affixes.verb;
    if (verb && v) {
        const tenses = ['present', 'past', 'future'];
        const rows = personCells(spec).map(cell => {
            const [person, number] = cell.split('.');
            return [cellLabel(cell), ...tenses.map(tense => plain(inflect(verb, { tense, person: Number(person), number }, morph).parts))];
        });
        const blocks = [{ type: 'para', text: `Example verb: ${label(verb)} — ${verb.form}.` }, { type: 'table', head: ['Subject', ...tenses], rows }];
        if (v.mode === 'agglutinative') {
            blocks.push({ type: 'para', text: `Verb structure: stem – ability – negation – aspect – tense – subject agreement. Ability: ${v.potential}; negation: ${v.negation}; imperative: ${v.imperative}; optative: ${v.optative} (replaces the tense); progressive: ${v.aspect.progressive}; perfect: ${v.aspect.perfect}.` });
            blocks.push({ type: 'para', text: `Comparative suffix on adjectives: ${affixes.comparative} (stem – comparative – gender – number – case).` });
            if (affixes.possessive) blocks.push({ type: 'para', text: `Possessor suffixes (between number and case): ${Object.entries(affixes.possessive).map(([cell, a]) => `${cellLabel(cell)} ${a}`).join(', ')}.` });
        } else blocks.push({ type: 'para', text: 'Fusional verbs: one portmanteau ending per tense, person and number. Negation, ability, aspect and the optative are separate words; the imperative is the bare stem.' });
        out.push({ title: 'Verbs', blocks });
    }
    const head = spec.order.indexOf('V') < spec.order.indexOf('O') ? 'before' : 'after';
    out.push({ title: 'Clause structure', blocks: [{ type: 'kv', rows: [
        ['Yes/no questions', `question particle ${head === 'after' ? 'at the end' : 'at the start'} of the sentence`],
        ['Subordinators', `${head === 'after' ? 'follow' : 'precede'} their clause`],
        ['Adverbial clauses', head === 'after' ? 'precede the main clause' : 'follow the main clause'],
        ['Complement clauses', 'take the place of the object'],
        ['Comparison', `${affixes.comparative ? `suffix ${affixes.comparative}` : 'the word "more" before the adjective'}; the standard is marked with ${model.cases.includes('ablative') ? 'the ablative case' : 'the word "than"'}`],
        ['Optative and aspect', affixes.verb?.optative ? 'verb suffixes' : 'separate words before the verb']
    ] }] });
    return out;
}

function sentenceSection(title, samples, intro) {
    const blocks = intro ? [{ type: 'para', text: intro }] : [];
    const topics = [];
    for (const s of samples) {
        let t = topics.find(x => x.name === s.topic);
        if (!t) topics.push(t = { name: s.topic, rows: [] });
        t.rows.push([String(s.number), s.english, tokenText(s.tokens)]);
    }
    for (const t of topics) { blocks.push({ type: 'heading', text: t.name ?? 'Other' }); blocks.push({ type: 'table', head: ['#', 'English', 'Language'], rows: t.rows }); }
    return { title, blocks };
}

export function languageDocument(lang, version = '') {
    const s = lang.spec, m = lang.morphology.model, ph = lang.phonology;
    const sections = [];
    sections.push({ title: 'Overview', blocks: [{ type: 'kv', rows: [
        ['Genre', lang.genre ? `${lang.genre.label} — ${lang.genre.summary}` : 'none'],
        ['Seed', s.seed], ['Lexicon', `${lang.lexicon.length} entries`],
        ['Word order', s.order], ['Morphology', s.morphology], ['Articles', s.articles], ['Number', s.numbers.join(', ')],
        ['Gender', s.genders.length ? s.genders.join(', ') : 'none'], ['Relations', `${m.relationModel}${m.cases.length ? ` (${m.cases.join(', ')})` : ''}`],
        ['Adjective position', `${lang.syntax.adjectivePosition} the noun`], ['Adpositions', lang.syntax.adpositionPosition === 'before' ? 'prepositions' : 'postpositions'],
        ['Subject pronouns', lang.syntax.prodrop ? 'dropped when the verb carries person and number' : 'always expressed'],
        ...[['Culture', s.culture], ['Biome', s.biome], ['Era', s.era]].filter(([, v]) => v?.length).map(([k, v]) => [k, v.join(', ')])
    ] }] });
    sections.push({ title: 'Phonology', blocks: [{ type: 'kv', rows: [
        ['Expanded letters', [...ph.extraVowels, ...ph.extraConsonants].join(' ') || 'none'],
        ['Pattern', `${ph.name} · ${ph.lengthProfile} words (mean ${ph.meanSyllables} syllables)`], ['Vowels', list(ph.vowels)], ['Consonants', list(ph.consonants)],
        ['Onset clusters', list(ph.clusters)], ['Coda clusters', list(ph.codaClusters)], ['Syllable patterns', list(ph.patterns)]
    ] }] });
    sections.push(...paradigmSections(lang));
    const uni = lang.samples.filter(x => x.scope === 'universal'), gen = lang.samples.filter(x => x.scope === 'genre');
    sections.push(sentenceSection('Universal sentences', uni, 'Sentences every language needs. [a|b] shows alternatives.'));
    if (lang.genre) sections.push(sentenceSection(`Specialised sentences — ${lang.genre.label}`, gen));
    sections.push({ title: 'Numerals', blocks: [
        { type: 'para', text: `${NUMERAL_LABELS[lang.numerals.config.type]}; numeral ${lang.numerals.config.position} the noun; ${lang.numerals.config.classifiers ? 'obligatory classifiers' : 'no classifiers'}.` },
        { type: 'table', head: ['Number', 'Cardinal', 'Ordinal', 'Meaning'], rows: sampleNumbers(lang.numerals).filter(n => n > 0 || lang.numerals.config.type !== 'restricted').map(n => [String(n), numeralForm(lang.numerals, n, lang.spec).form, ordinalForm(lang.numerals, n, lang.spec), numeralMeaning(lang.numerals, n)]) },
        ...(lang.numerals.classifiers ? [{ type: 'heading', text: 'Classifiers' }, { type: 'table', head: ['Class', 'Classifier'], rows: lang.numerals.classifiers.map(c => [c.id, c.form]) }] : [])
    ] });
    {
        const c = lang.calendar, T = (head, list, f) => ({ type: 'table', head, rows: list.map(f) });
        sections.push({ title: 'Calendar and time', blocks: [
            { type: 'heading', text: 'Logic table' }, T(['Dimension', 'Choice', 'Rule'], c.logic, x => [x.dimension, x.choice, x.rule]),
            ...(c.seasons.length ? [{ type: 'heading', text: 'Seasons' }, T(['Name', 'English', 'Begins when'], c.seasons, x => [x.name, x.gloss, x.begins ?? ''])] : []),
            ...(c.months.length ? [{ type: 'heading', text: 'Months' }, T(['Name', 'English', 'Days'], c.months, x => [x.name, x.gloss, String(x.days ?? '')])] : []),
            ...(c.week.length ? [{ type: 'heading', text: 'Week' }, T(['Name', 'English', 'Note'], c.week, x => [x.name, x.gloss, x.note ?? ''])] : []),
            { type: 'heading', text: 'Division of the day' }, { type: 'para', text: c.dayNote },
            ...(c.day.length ? [T(['Name', 'English', 'Time'], c.day, x => [x.name, x.gloss, x.time ?? ''])] : []),
            ...(c.small.length ? [{ type: 'heading', text: 'Short durations' }, T(['Name', 'English', 'Length'], c.small, x => [x.name, x.gloss, x.time ?? ''])] : []),
            ...(c.instruments.length ? [{ type: 'heading', text: 'Instruments' }, T(['Name', 'English', 'Use'], c.instruments, x => [x.name, x.gloss, x.use ?? ''])] : [])
        ] });
    }
    sections.push({ title: 'Names', blocks: [
        { type: 'para', text: 'A sample of names in the language (the Names tab generates more).' },
        ...NAME_KINDS.flatMap(k => [{ type: 'heading', text: k.label }, { type: 'table', head: ['Name', 'Meaning'], rows: generateNames(lang, { kind: k.id, count: 10 }).map(n => [n.name, n.meaning ?? '']) }])
    ] });
    const rows = [...lang.lexicon].sort((a, b) => label(a).localeCompare(label(b))).map(e => [e.form, label(e), e.pos, e.domain]);
    sections.push({ title: 'Lexicon', blocks: [{ type: 'table', head: ['Word', 'English', 'Part of speech', 'Domain'], rows }] });
    return { title: lang.name, subtitle: `Generated by Conlang Generator${version ? ` v${version}` : ''}`, sections };
}

const mdCell = x => String(x).replace(/\|/g, '\\|').replace(/\n/g, ' ');
export function toMarkdown(doc) {
    const out = [`# ${doc.title}`, '', `_${doc.subtitle}_`, ''];
    for (const sec of doc.sections) {
        out.push(`## ${sec.title}`, '');
        for (const b of sec.blocks) {
            if (b.type === 'heading') out.push(`### ${b.text}`, '');
            else if (b.type === 'para') out.push(b.text, '');
            else if (b.type === 'kv') out.push(...b.rows.map(([k, v]) => `- **${k}:** ${v}`), '');
            else if (b.type === 'table') out.push(`| ${b.head.map(mdCell).join(' | ')} |`, `| ${b.head.map(() => '---').join(' | ')} |`, ...b.rows.map(r => `| ${r.map(mdCell).join(' | ')} |`), '');
        }
    }
    return out.join('\n');
}

const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CSS = `body{font:14px/1.5 system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#1b2230}h1{margin:0}h2{margin-top:2rem;border-bottom:2px solid #c9d3e3;padding-bottom:.2rem}h3{margin:1.2rem 0 .3rem;font-size:.85rem;text-transform:uppercase;letter-spacing:.05em;color:#52627f}table{border-collapse:collapse;width:100%;margin:.3rem 0 1rem}th,td{border:1px solid #d5dce8;padding:4px 8px;text-align:left;vertical-align:top}th{background:#eef2f8}td:nth-child(2),td:nth-child(3){font-family:ui-monospace,monospace}dl{display:grid;grid-template-columns:11rem 1fr;gap:.2rem 1rem}dt{font-weight:600}dd{margin:0}.sub{color:#52627f}@media print{body{margin:0}h2{break-after:avoid}tr{break-inside:avoid}}`;
export function toHtml(doc) {
    const body = doc.sections.map(sec => `<h2>${esc(sec.title)}</h2>${sec.blocks.map(b => {
        if (b.type === 'heading') return `<h3>${esc(b.text)}</h3>`;
        if (b.type === 'para') return `<p>${esc(b.text)}</p>`;
        if (b.type === 'kv') return `<dl>${b.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
        return `<table><thead><tr>${b.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }).join('')}`).join('');
    return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>${CSS}</style></head><body><h1>${esc(doc.title)}</h1><div class="sub">${esc(doc.subtitle)}</div>${body}</body></html>\n`;
}

const csvCell = x => /[",\n\t]/.test(String(x)) ? `"${String(x).replace(/"/g, '""')}"` : String(x);
export function lexiconCsv(lang) {
    const rows = [['word', 'english', 'part_of_speech', 'domain', 'group', 'id'], ...lang.lexicon.map(e => [e.form, label(e), e.pos, e.domain, e.group, e.id])];
    return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function languageJson(lang, version = '') {
    const { spec, morphology, phonology, syntax } = lang;
    const clean = ({ semantics, soundBias, ...rest }) => rest;
    return JSON.stringify({
        format: 'Conlang Generator language', generator: version, name: lang.name, genre: lang.genre?.id ?? null, spec: clean(spec), phonology, syntax,
        morphology: { model: morphology.model, affixes: morphology.affixes },
        lexicon: lang.lexicon.map(e => ({ word: e.form, id: e.id, english: label(e), pos: e.pos, domain: e.domain, group: e.group })),
        numerals: { type: lang.numerals.config.type, config: lang.numerals.config, classifiers: lang.numerals.classifiers?.map(c => ({ class: c.id, form: c.form })) ?? null,
            numbers: Object.fromEntries(sampleNumbers(lang.numerals).map(n => [n, numeralForm(lang.numerals, n, lang.spec).form])) },
        calendar: { config: lang.calendar.config, logic: lang.calendar.logic, seasons: lang.calendar.seasons, months: lang.calendar.months, week: lang.calendar.week, day: lang.calendar.day, secondary: lang.calendar.secondary, small: lang.calendar.small, instruments: lang.calendar.instruments, vocabulary: lang.calendar.vocabulary },
        names: Object.fromEntries(NAME_KINDS.map(k => [k.id, generateNames(lang, { kind: k.id, count: 20 }).map(n => ({ name: n.name, meaning: n.meaning }))])),
        sentences: lang.samples.map(s => ({ scope: s.scope, topic: s.topic, english: s.english, text: tokenText(s.tokens) }))
    }, null, 2);
}

export const safeName = lang => String(lang.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'language';
