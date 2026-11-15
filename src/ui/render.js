// HTML builders for the generator page. Pure: (language) -> string. No DOM access.
import { buildWriting, WRITING_LABELS } from '../writing/system.js';
import { buildNumberSigns } from '../writing/numerals.js';
import { ipaWord, ipaOfLetter } from '../ipa.js';

let showIpa = false;
export const setShowIpa = on => { showIpa = !!on; };
const ipaText = form => `/${ipaWord(form)}/`;
import { esc } from '../core/text.js';
import { label } from '../lexicon/schema.js';
import { inflect, genderOf } from '../morphology/inflect.js';
import { personCells } from '../morphology/affixes.js';
import { exampleNoun, exampleVerb, exampleAdjective } from '../morphology/examples.js';

export const PHONOTACTIC_INFO = {
    isolated: { title: 'Minimalist Isolating Pattern (Hawaiian-type)', description: 'The pattern categorically excludes consonant clusters and reduces the syllable to its minimum.', pattern: '(C)V' },
    japanese: { title: 'Controlled Open Syllable Pattern (Japanese-type)', description: 'Allows minimal onsets and only the nasal in the coda, producing clean internal transitions.', pattern: '(C)(G)V(N)' },
    european: { title: 'Balanced European Pattern (Italian / Finnish-type)', description: 'Balances open and closed syllables, distributing consonants and vowels for a smooth and stable phonotactic profile.', pattern: '(S)(C)(L/G)V(L/N/S)' },
    english: { title: 'Dynamic Anglo-Saxon Pattern (English-type)', description: 'Allows extensive consonant clusters in both onsets and codas, with strong vowel compression.', pattern: '(S)(C)(L/G)V(L/N)(C)(S)' },
    slavic: { title: 'Compact Slavic Pattern (Croatian / Polish-type)', description: 'Allows dense consonant structures and permits liquids to function as syllable nuclei.', pattern: '(C)(C)(C)(V/L)(C)(C)(C)' },
    semitic: { title: 'Semitic Root-and-Pattern Model (Arabic-type)', description: 'Uses a rigid alternation that prevents both consonant and vowel accumulation.', pattern: 'CV(C)' }
};

export function clusterSummaryHtml(phonology) {
    const list = a => a.length ? a.map(x => `<code>${esc(x)}</code>`).join(' ') : 'none';
    return `<div class="phon-clusters"><div><strong>Onset clusters:</strong> ${list(phonology.clusters)}</div><div><strong>Coda clusters:</strong> ${list(phonology.codaClusters)}</div></div>`;
}

// Letter values in IPA for the letters of the language. Stress is on the first syllable.
function ipaChartHtml(p) {
    const letters = [...p.used.vowels, ...p.used.consonants];
    return `<div class="phon-clusters"><div><strong>IPA:</strong> ${letters.map(l => `<span class="chip">${esc(l)} = /${esc(ipaOfLetter(l))}/</span>`).join(' ')}</div><div class="sub">Stress on the first syllable of words with more than one; syllables are divided by onset maximisation. The IPA toggle in the header adds these transcriptions to the lexicon, the dictionary and the sample sentences.</div></div>`;
}

export function phonologyHtml(lang) {
    const p = lang.phonology;
    const list = a => a.map(x => `<code>${esc(x)}</code>`).join(' ');
    return `<div class="card phonology-card"><h3>Phonology</h3><div class="sub">${esc(p.name)} · ${esc(p.lengthProfile)} words · the sounds of the language as it is spoken</div><div class="phon-clusters"><div><strong>Vowels:</strong> ${list(p.used.vowels)}</div><div><strong>Consonants:</strong> ${list(p.used.consonants)}</div></div>${clusterSummaryHtml(p)}<div class="phon-clusters"><div><strong>Syllable patterns:</strong> ${list(p.patterns)}</div></div>${ipaChartHtml(p)}</div>`;
}

export function synthesisIndex(mean) {
    if (mean <= 1.5) return 'short';
    if (mean < 2.2) return 'short-balanced';
    if (mean <= 2.8) return 'balanced';
    if (mean <= 3.5) return 'balanced-long';
    return 'long';
}

export function phonotacticInfoHtml(consonants, mean) {
    const d = PHONOTACTIC_INFO[consonants] || PHONOTACTIC_INFO.european;
    return `<div style="color:var(--text);font-weight:700;margin-bottom:4px">${esc(d.title)}</div><div>${esc(d.description)}</div><div style="margin-top:5px"><strong style="color:var(--text)">Formal pattern:</strong> <code>${esc(d.pattern)}</code></div><div style="margin-top:5px"><strong style="color:var(--text)">Synthesis index:</strong> ${esc(synthesisIndex(mean))}</div>`;
}

const CASE_FRAMES = {
    nominative: n => n, accusative: n => n, absolutive: n => n,
    genitive: n => `of the ${n}`, dative: n => `to the ${n}`, locative: n => `in the ${n}`,
    ablative: n => `from the ${n}`, instrumental: n => `with the ${n}`, ergative: n => `by the ${n}`
};
const gloss = (c, noun, number) => `${(CASE_FRAMES[c] || (n => n))(noun)}${number && number !== 'singular' ? ` (${number})` : ''}`;

// parts -> html: stem plain, every affix highlighted; an empty ending is shown as ∅ when the paradigm has endings.
export function formHtml(parts, showZero) {
    const html = parts.map(p => p.kind === 'stem' ? esc(p.text) : `<span class="morph-ending">${esc(p.text)}</span>`).join('');
    return parts.length === 1 && showZero ? `${html}<span class="morph-empty">∅</span>` : html;
}

export function morphemeInventoryHtml(lang) {
    const { spec, morphology } = lang;
    const { model, affixes } = morphology;
    const noun = exampleNoun(lang.lexicon);
    if (!noun) return '';
    const morph = { spec, model, affixes };
    const gender = genderOf(noun, spec);
    const cases = model.cases.length ? model.cases : [null];
    const showZero = model.cases.length > 0;
    const blocks = spec.numbers.map(number => {
        const rows = cases.map(c => {
            const r = inflect(noun, { number, case: c }, morph);
            return `<div class="morph-example-row"><span class="morph-case">${esc(c ?? '—')}</span><span class="morph-form">${formHtml(r.parts, showZero)}</span><span class="morph-translation">${esc(gloss(c ?? 'nominative', noun.lemma, number))}</span></div>`;
        }).join('');
        return `<div class="morph-number-block"><div class="morph-number-title">${esc(number[0].toUpperCase() + number.slice(1))}</div><div class="morph-example-table"><div class="morph-example-head"><span>Case</span><span>Example</span><span>Translation</span></div>${rows}</div></div>`;
    }).join('');
    const markers = affixes.numberMarkers;
    const notes = [];
    if (spec.morphology === 'isolating') notes.push('Isolating morphology: nouns are not inflected; relations are expressed with adpositions.');
    if (affixes.fused) notes.push('Fusional morphology: each gender, number and case combination has one portmanteau ending.');
    else if (markers.plural) notes.push(`Plural marker: <span class="morph-ending">${esc(markers.plural)}</span> (${esc(markers.mode)})${markers.dual ? `, dual marker: <span class="morph-ending">${esc(markers.dual)}</span>` : ''}`);
    else if (spec.morphology !== 'isolating') notes.push('No productive plural marker.');
    notes.push(affixes.fused ? 'Case endings attach directly to the lexical stem.' : 'Suffix order on nouns: stem – number – possessor – case. Affixes attach to the stem in a fixed order; a linking vowel is inserted where the consonants would otherwise clash.');
    return `<div class="card morph-inventory"><h3>Grammatical morphemes</h3><div class="sub morph-noun-label">Example noun: <strong>${esc(label(noun))}</strong> — <span class="morph-stem">${esc(noun.form)}</span>${gender ? ` · gender: ${esc(gender)}` : ''}</div>${spec.morphology === 'isolating' ? '' : blocks}${notes.map(n => `<div class="morph-note">${n}</div>`).join('')}</div>`;
}

export function nominalCategoriesHtml(lang) {
    const { spec, morphology } = lang;
    if (spec.morphology === 'isolating') return '';
    const { model, affixes } = morphology;
    const adjective = exampleAdjective(lang.lexicon);
    if (!adjective) return '';
    const morph = { spec, model, affixes };
    const rows = [];
    for (const g of spec.genders.length ? spec.genders : [null])
        for (const number of spec.numbers)
            for (const c of model.cases.length ? model.cases : [null]) {
                const r = inflect(adjective, { number, case: c, gender: g }, morph);
                rows.push(`<div class="morph-adj-row"><span>${esc(g ?? '—')}</span><span>${esc(c ? `${number} · ${c}` : number)}</span><span class="morph-form">${formHtml(r.parts, model.cases.length > 0)}</span></div>`);
            }
    return `<div class="card nominal-categories"><h3>Nominal categories</h3><div class="sub morph-adjective-label">Example adjective: <strong>${esc(adjective.lemma)}</strong> — <span class="morph-stem">${esc(adjective.form)}</span></div><div class="sub" style="margin-top:10px">Adjective declension (agrees in gender, number and case)</div><div class="morph-example-table"><div class="morph-adj-head"><span>Gender</span><span>Number · Case</span><span>Example</span></div>${rows.join('')}</div></div>`;
}

const CELL_LABEL = { singular: 'sg', plural: 'pl', dual: 'du' };
const cellLabel = cell => { const [p, n] = cell.split('.'); return `${p}${CELL_LABEL[n]}`; };

export function verbMorphologyHtml(lang) {
    const { spec, morphology } = lang;
    const { model, affixes } = morphology;
    const v = affixes.verb;
    const verb = exampleVerb(lang.lexicon);
    if (!v || !verb) return '';
    const morph = { spec, model, affixes };
    const cells = personCells(spec);
    const tenses = ['present', 'past', 'future'];
    const rows = cells.map(cell => {
        const [person, number] = cell.split('.');
        const cols = tenses.map(tense => `<span class="morph-form">${formHtml(inflect(verb, { tense, person: Number(person), number }, morph).parts, true)}</span>`).join('');
        return `<div class="morph-verb-row"><span class="morph-case">${esc(cellLabel(cell))}</span>${cols}</div>`;
    }).join('');
    const sfx = x => `<span class="morph-ending">${esc(x)}</span>`;
    const notes = [];
    if (v.mode === 'agglutinative') {
        notes.push('Verb structure: stem – ability – negation – aspect – tense – subject agreement. Present tense and third person singular are unmarked.');
        notes.push(`Ability: ${sfx(v.potential)} · negation: ${sfx(v.negation)} · imperative: ${sfx(v.imperative)} · optative: ${sfx(v.optative)} · progressive: ${sfx(v.aspect.progressive)} · perfect: ${sfx(v.aspect.perfect)}`);
        notes.push(`Comparative suffix on adjectives (before gender and number): ${sfx(affixes.comparative)}. The optative replaces the tense and keeps the agreement.`);
        const poss = affixes.possessive;
        if (poss) {
            const noun = exampleNoun(lang.lexicon);
            const entries = Object.entries(poss).map(([cell, a]) => `${esc(cellLabel(cell))} ${sfx(a)}`).join(' · ');
            notes.push(`Possessor suffixes (between number and case): ${entries}${noun ? ` — e.g. ${esc(noun.lemma)}: ${formHtml(inflect(noun, { possessor: '1.singular', case: model.baseCase }, morph).parts, false)}` : ''}`);
        }
    } else {
        notes.push('Fusional verbs: one portmanteau ending per tense, person and number. Negation, ability, aspect and the optative are separate words; the imperative is the bare stem.');
    }
    notes.push(`Yes/no questions take the question particle ${spec.order.indexOf('V') < spec.order.indexOf('O') ? 'at the start' : 'at the end'} of the sentence.`);
    notes.push('Subject pronouns are dropped when the verb carries person and number.');
    return `<div class="card verb-morphology"><h3>Verb morphology</h3><div class="sub">Example verb: <strong>${esc(label(verb))}</strong> — <span class="morph-stem">${esc(verb.form)}</span></div><div class="morph-example-table"><div class="morph-verb-head"><span>Subject</span>${tenses.map(t => `<span>${esc(t)}</span>`).join('')}</div>${rows}</div>${notes.map(n => `<div class="morph-note">${n}</div>`).join('')}</div>`;
}

const tokenHtml = t => t.kind === 'alts'
    ? `[${t.options.map(o => o.map(tokenHtml).join(' ')).join('|')}]`
    : `<span class="sample-word" data-meaning="${esc(t.gloss)}">${t.parts.map(p => p.kind === 'stem' ? esc(p.text) : `<span class="morph-ending" title="${esc(p.meaning ?? p.kind)}">${esc(p.text)}</span>`).join('')}</span>`;

const flatTokens = tokens => tokens.flatMap(t => t.kind === 'alts' ? flatTokens(t.options[0]) : t.kind === 'word' ? [t.parts.map(p => p.text).join('')] : []);
const pillHtml = s => `<div class="sample-pill"><div class="en"><b>${s.number}.</b> ${esc(s.english)}</div><div class="cl"><b>${s.number}.</b> ${s.tokens.map(tokenHtml).join(' ')}</div>${showIpa ? `<div class="ipa-line">${esc(flatTokens(s.tokens).map(w => ipaWord(w)).join(' '))}</div>` : ''}</div>`;

// sentences of one scope grouped by topic, in source order
function sampleColumnHtml(title, subtitle, samples, skipped, emptyMessage) {
    const topics = [];
    for (const s of samples) {
        let group = topics.find(t => t.name === s.topic);
        if (!group) topics.push(group = { name: s.topic, items: [] });
        group.items.push(s);
    }
    const body = topics.length
        ? topics.map(t => `<h4 class="sample-topic">${esc(t.name ?? 'Other')}</h4>${t.items.map(pillHtml).join('')}`).join('')
        : `<div class="morph-note">${esc(emptyMessage)}</div>`;
    const sk = skipped.length ? `<div class="morph-note">${skipped.length} sentence(s) skipped because the lexicon lacks: ${esc([...new Set(skipped.map(x => x.missing))].join(', '))}.</div>` : '';
    return `<section class="sample-col"><h3>${esc(title)}</h3><div class="sub">${esc(subtitle)}</div>${body}${sk}</section>`;
}

export function samplesHtml(lang) {
    const s = lang.syntax;
    const uni = lang.samples.filter(x => x.scope === 'universal'), gen = lang.samples.filter(x => x.scope === 'genre');
    const skip = scope => lang.skippedSamples.filter(x => x.scope === scope);
    const note = `Word order ${esc(s.order)} · ${s.adpositionPosition === 'before' ? 'prepositions' : 'postpositions'} · adjective ${esc(s.adjectivePosition)} the noun${s.prodrop ? ' · subject pronouns dropped (verb agreement)' : ''}`;
    const left = sampleColumnHtml('Universal Sentences', `${uni.length} sentences every language needs, by topic`, uni, skip('universal'), 'No universal sentence could be built.');
    const right = lang.genre
        ? sampleColumnHtml(`Specialised Sentences · ${lang.genre.label}`, `${gen.length} sentences typical of this genre, by topic`, gen, skip('genre'), 'No specialised sentence could be built.')
        : sampleColumnHtml('Specialised Sentences', 'Not available without a genre', [], [], 'Choose a language genre (war, marine, artisans, women\'s tongue…) to get sentences typical of it.');
    return `<div class="sample-frame"><div class="morph-note">${note}</div><div class="sample-columns">${left}${right}</div></div>`;
}

export const structureOf = e => e.derivation ? `${e.derivation.text} (${e.derivation.gloss.toLowerCase()})` : e.loan ? `loan from ${e.loan.donorName} *${e.loan.source}*` : '';
export const lexiconRows = lexicon => lexicon.map(e => ({ word: e.form, english: label(e), meta: `${showIpa ? `${ipaText(e.form)} · ` : ''}${e.domain} · ${e.pos}`, structure: structureOf(e) }));

// The lexicon is arranged by topic (a vocabulary lists words alphabetically: that is the Dictionary tab).
export const LEXICON_TOPICS = Object.freeze([
    ['body', 'Human body'], ['family', 'Family and kinship'], ['society', 'People and society'], ['quality', 'Qualities (adjectives)'], ['action', 'Actions and verbs'],
    ['animal', 'Animals'], ['nature', 'Nature and landscape'], ['food', 'Food and drink'], ['clothing', 'Clothing'], ['household', 'Home and household'],
    ['settlement', 'Settlements and buildings'], ['craft', 'Crafts and trades'], ['material', 'Materials'], ['object', 'Objects and tools'], ['weapon', 'Weapons'],
    ['war', 'War'], ['transport', 'Travel and transport'], ['maritime', 'Sea and sailing'], ['magic', 'Magic'], ['faith', 'Faith and ritual'], ['music', 'Music'],
    ['technology', 'Technology'], ['time', 'Time'], ['space', 'Space and position'], ['number', 'Numbers'], ['abstract', 'Abstract concepts'], ['need', 'Needs and states'], ['grammar', 'Grammar words']
]);
const POS_ORDER = ['noun', 'verb', 'adjective', 'adverb'];
export function lexiconHtml(lexicon) {
    const sections = LEXICON_TOPICS.map(([domain, title]) => {
        const entries = lexicon.filter(e => e.domain === domain).sort((a, b) => (POS_ORDER.indexOf(a.pos) + 1 || 9) - (POS_ORDER.indexOf(b.pos) + 1 || 9) || label(a).localeCompare(label(b)));
        return { domain, title, entries };
    }).filter(x => x.entries.length);
    const rows = entries => entries.map(e => {
        const d = e.derivation;
        return `<div class="lex-row"><span class="word">${esc(e.form)}</span><span class="eng">${esc(label(e))}</span><span class="meta">${showIpa ? `<span class="ipa">${esc(ipaText(e.form))}</span> · ` : ''}${esc(e.pos)}${structureOf(e) ? `<br><span class="structure">${esc(structureOf(e))}</span>` : ''}</span></div>`;
    }).join('');
    return `<h3>Generated lexicon</h3>
<div class="lex-toolbar"><span class="sub">${lexicon.length} words in ${sections.length} topics</span><span><button type="button" class="btn ghost" data-lex-toggle="open">Open all</button> <button type="button" class="btn ghost" data-lex-toggle="close">Close all</button></span></div>
${sections.map(x => `<details class="lex-section" id="lex-${x.domain}"><summary><span>${esc(x.title)}</span><span class="count">${x.entries.length}</span></summary><div class="lexicon">${rows(x.entries)}</div></details>`).join('')}`;
}

export function dictionaryHtml(lexicon, direction, query) {
    const q = String(query || '').toLowerCase().trim();
    let rows = lexiconRows(lexicon).map(r => direction === 'conlang-en' ? { l: r.word, r: r.english, m: r.structure ? `${r.meta} · ${r.structure}` : r.meta } : { l: r.english, r: r.word, m: r.structure ? `${r.meta} · ${r.structure}` : r.meta });
    if (q) rows = rows.filter(x => `${x.l} ${x.r} ${x.m}`.toLowerCase().includes(q));
    rows.sort((a, b) => a.l.localeCompare(b.l));
    return `<div class="card"><h3>${direction === 'conlang-en' ? 'Conlang → English' : 'English → Conlang'}</h3><div class="sub" style="margin-bottom:10px">${rows.length} matching entries</div><div class="dictionary">${rows.map(x => `<div class="dict-row"><strong>${esc(x.l)}</strong><span>${esc(x.r)}</span><span class="meta">${esc(x.m)}</span></div>`).join('')}</div></div>`;
}

export function resultHtml(lang) {
    const s = lang.spec;
    const chips = [s.culture[0], s.biome[0], s.era[0], s.order].filter(Boolean);
    const notes = lang.notes.length ? `<div class="card"><h3>Adjusted options</h3>${lang.notes.map(n => `<div class="morph-note">${esc(n)}</div>`).join('')}</div>` : '';
    return `<div class="hero"><div><div class="lang-name">Name of language: ${esc(lang.name)}</div>${lang.genre ? `<div class="sub genre-line"><strong>Genre:</strong> ${esc(lang.genre.label)} — ${esc(lang.genre.summary)}</div>` : ''}<div class="chips">${chips.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div><div class="sub">Seed: <code id="used-seed">${esc(s.seed)}</code> <button type="button" class="btn ghost" id="keep-seed">Use this seed</button></div></div><div class="status">${lang.lexicon.length} lexical entries</div></div><div class="export-bar" role="group" aria-label="Export"><span class="sub">Export:</span><button type="button" class="btn ghost" data-export="html">Language sheet (HTML)</button><button type="button" class="btn ghost" data-export="md">Markdown</button><button type="button" class="btn ghost" data-export="csv">Lexicon (CSV)</button><button type="button" class="btn ghost" data-export="json">Language (JSON)</button></div><div class="result-cols"><div class="result-col">${phonologyHtml(lang)}${morphemeInventoryHtml(lang)}</div><div class="result-col">${verbMorphologyHtml(lang)}${nominalCategoriesHtml(lang)}${notes}</div></div>`;
}

const KIND_HEAD = { person: 'Name', family: 'Name', place: 'Name', epithet: 'Epithet' };
export function namesHtml(names, kind) {
    if (!names.length) return '<div class="empty">No names could be generated.</div>';
    const rows = names.map(n => `<tr><td class="name-cell">${esc(n.name)}</td><td>${n.meaning ? esc(n.meaning) : '<span class="sub">—</span>'}</td></tr>`).join('');
    return `<div class="card"><table class="names-table"><thead><tr><th>${KIND_HEAD[kind] ?? 'Name'}</th><th>Meaning</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// ---- Numerals tab ----
import { numeralForm, ordinalForm, numeralMeaning, isDefined, maxDefined, sampleNumbers, MAX_NUMERAL } from '../numerals/system.js';
import { NUMERAL_LABELS } from '../numerals/choose.js';

const CLASS_LABEL = { person: 'people', animal: 'animals', long: 'long things', flat: 'flat things', round: 'round things', general: 'everything else' };

function numeralNotes(lang) {
    const c = lang.numerals.config, out = [NUMERAL_LABELS[c.type]];
    if (c.subtractive) out.push(`subtractive from ${c.subtractive.from} (e.g. 19 = 20 − 1)`);
    if (c.halves) out.push('halves: 50, 70 and 90 are "half-third twenty", "half-fourth twenty"…');
    if (c.french) out.push('French cut: 70–79 and 90–99 count on from 60 and 80');
    if (c.unitFirst) out.push('units before tens (five-and-twenty)');
    if (c.type === 'restricted') out.push(`counts exactly up to ${maxDefined(lang.numerals)}, then "many"`);
    out.push(`numeral ${c.position === 'before' ? 'before' : 'after'} the noun (adjectives: ${lang.spec.adjPosition === 'before' ? 'before' : 'after'})`);
    out.push(c.classifiers ? 'obligatory classifiers; no plural marking' : 'no classifiers');
    return out;
}

export function numeralsHtml(lang) {
    const sys = lang.numerals, spec = lang.spec;
    const form = n => numeralForm(sys, n, spec).form;
    const rowFor = n => `<tr><td>${n}</td><td class="name-cell">${esc(form(n))}</td><td class="name-cell">${esc(ordinalForm(sys, n, spec))}</td><td class="meaning-cell">${esc(numeralMeaning(sys, n))}</td></tr>`;
    const nums = sampleNumbers(sys);
    const table = `<div class="table-scroll"><table class="names-table wide-table"><thead><tr><th>Number</th><th>Cardinal</th><th>Ordinal</th><th>Meaning</th></tr></thead><tbody>${nums.filter(n => n > 0 || sys.config.type !== 'restricted').map(rowFor).join('')}</tbody></table></div>`;
    const classes = sys.classifiers ? `<div class="card"><h3>Classifiers</h3><table class="names-table"><thead><tr><th>Class</th><th>Counts</th><th>Classifier</th></tr></thead><tbody>${sys.classifiers.map(c => `<tr><td>${esc(c.id)}</td><td>${esc(CLASS_LABEL[c.id] ?? c.id)}</td><td class="name-cell">${esc(c.form)}</td></tr>`).join('')}</tbody></table></div>` : '';
    return `<div class="card"><h3>Numeral system</h3><ul>${numeralNotes(lang).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
<div class="card"><h3>Number converter</h3><div id="numeral-result"></div></div>
<div class="card"><h3>Numbers</h3>${table}</div>${classes}`;
}

export function numberResultHtml(lang, n) {
    const sys = lang.numerals;
    if (!Number.isInteger(n) || n < 0 || n > MAX_NUMERAL) return `<div class="sub">Enter an integer from 0 to ${MAX_NUMERAL.toLocaleString('en')}.</div>`;
    const f = numeralForm(sys, n, lang.spec);
    if (!f.defined && n === 0) return '<div class="sub">This language has no word for zero.</div>';
    const parts = f.parts.map(p => `<tr><td class="name-cell">${esc(p.form)}</td><td>${esc(p.meaning)}</td></tr>`).join('');
    const note = !f.defined ? '<div class="sub">Beyond what this language can count: it says "many".</div>' : '';
    return `<div><span class="name-cell">${esc(f.form)}</span> <span class="sub">(${n.toLocaleString('en')}; ordinal: ${esc(ordinalForm(sys, n, lang.spec))}; ${esc(numeralMeaning(sys, n))})</span></div>${note}<table class="names-table"><thead><tr><th>Part</th><th>Value</th></tr></thead><tbody>${parts}</tbody></table>`;
}

// ---- Calendar tab ----
const tbl = (head, rows, cls = 'names-table full-table') => `<table class="${cls}"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="name-cell"' : ''}>${c === '' || c == null ? '<span class="sub">—</span>' : esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

export function calendarHtml(lang) {
    const c = lang.calendar;
    if (!c) return '<div class="empty">No calendar.</div>';
    const card = (title, body) => `<div class="card"><h3>${esc(title)}</h3>${body}</div>`;
    const parts = [];
    parts.push(card('Logic table', tbl(['Dimension', 'Choice', 'Rule'], c.logic.map(x => [x.dimension, x.choice, x.rule]))));
    parts.push(card('Year', `<p>${esc(c.yearLength ?? '')}</p>`));
    if (c.seasons.length) parts.push(card('Seasons', tbl(['Name', 'English', 'Begins when'], c.seasons.map(x => [x.name, x.gloss, x.begins]))));
    if (c.months.length) parts.push(card('Months', tbl(['Name', 'English', 'Days'], c.months.map(x => [x.name, x.gloss, x.days != null ? String(x.days) : '']))));
    else parts.push(card('Months', '<p class="sub">This language has no months: the year is counted in seasons and moons.</p>'));
    if (c.week.length) parts.push(card(`Week (${c.weekDays} days)`, tbl(['Name', 'English', 'Note'], c.week.map(x => [x.name, x.gloss, x.note ?? '']))));
    if (c.day.length) parts.push(card('Division of the day', `<p>${esc(c.dayNote)}</p>${tbl(['Name', 'English', 'Time'], c.day.map(x => [x.name, x.gloss, x.time ?? '']))}`));
    else parts.push(card('Division of the day', `<p>${esc(c.dayNote)}</p>`));
    if (c.secondary.length) parts.push(card('Further day marks', tbl(['Name', 'English', 'Time'], c.secondary.map(x => [x.name, x.gloss, x.time ?? '']))));
    if (c.small.length) parts.push(card('Short durations', tbl(['Name', 'English', 'Length'], c.small.map(x => [x.name, x.gloss, x.time ?? '']))));
    if (c.instruments.length) parts.push(card('Time-keeping instruments', tbl(['Name', 'English', 'Use'], c.instruments.map(x => [x.name, x.gloss, x.use ?? '']))));
    const cats = [...new Set(c.vocabulary.map(v => v.category))];
    parts.push(card('Time vocabulary', cats.map(k => `<h4>${esc(k)}</h4>${tbl(['Word', 'English', 'Part of speech'], c.vocabulary.filter(v => v.category === k).map(v => [v.word, v.english, v.pos]))}`).join('')));
    return parts.join('');
}


// ---- Derivation (Generated Lexicon tab) ----
import { DERIVATION_TYPES } from '../derivation/derive.js';
export function derivationHtml(lang) {
    const d = lang.derivation;
    if (!d || !d.stats.applied) return '';
    const derived = lang.lexicon.filter(e => e.derivation);
    const shown = new Set();
    const rows = Object.entries(d.affixes).filter(([t, a]) => !a.sharedWith && (d.stats.byType[t] || a.shares.some(x => d.stats.byType[x]))).map(([t, a]) => {
        const types = [t, ...a.shares];
        const ex = derived.filter(e => types.includes(e.derivation.type)).slice(0, 3).map(e => `${e.form} = ${e.derivation.text} (${e.lemma})`);
        types.forEach(x => shown.add(x));
        const does = types.map(x => DERIVATION_TYPES[x][1]).join('; ');
        return [`${a.position === 'prefix' ? `${a.form}-` : `-${a.form}`}`, types.map(x => DERIVATION_TYPES[x][0]).join(' / '), does, ex.join(' · ')];
    });
    const compounds = derived.filter(e => e.derivation.type === 'compound');
    const order = lang.spec.adjPosition === 'before' ? 'modifier + head' : 'head + modifier';
    const compoundRows = compounds.slice(0, 6).map(e => `${e.form} = ${e.derivation.text} (${e.lemma})`);
    const ph = d.phonology;
    const joining = ph ? `Joining: vowel hiatus ${{ keep: 'is kept', elide: 'is resolved by dropping the first vowel', glide: `is broken by "${ph.glide}"` }[ph.hiatus]}; ${ph.linker ? `compounds take the linking vowel "${ph.linker}" between consonants` : 'compounds have no linking vowel'}.` : '';
    return `<div class="card"><h3>Word formation</h3>
<p class="sub">${d.stats.applied} of the ${lang.lexicon.length} words are built from other words of the language (${d.stats.available} possible with the words present). Related words share their root; the others keep an independent root. Each row of the lexicon below shows the structure of derived words, given in the forms of the mother language (see the History tab). ${esc(joining)}</p>
${tbl(['Affix', 'Type', 'Meaning', 'Examples'], rows, 'names-table full-table')}
<h4>Compounds (${compounds.length}, ${order})</h4><p>${compoundRows.length ? compoundRows.map(esc).join('<br>') : '<span class="sub">none in this lexicon</span>'}</p></div>`;
}

// History tab: the mother language (the one generated) and the sound changes that lead to the language returned (its daughter).
export function historyHtml(lang) {
    const h = lang.history;
    if (!h) return '<div class="empty">No history available.</div>';
    const st = h.stats;
    const pct = n => `${Math.round(100 * n / st.words)}%`;
    const rules = h.rules.map((r, i) => [String(i + 1), `c. ${r.years} years ago`, r.label, `${r.words} (${pct(r.words)})`, r.example ?? '']);
    const words = h.lexicon.filter(w => w.proto !== w.daughter && !w.loan);
    const examples = [...words].sort((a, b) => b.changes.length - a.changes.length || a.lemma.localeCompare(b.lemma)).slice(0, 14);
    const row = w => w.loan ? [w.daughter, `*${w.proto}`, w.lemma, `replaced by a loan (c. ${w.loan.years} years ago)`, `from ${donorName(w.loan.donor)} *${w.loan.source}*`, `replaces ${w.loan.replaced}`] : [w.daughter, `*${w.proto}`, w.lemma, w.changes.length ? w.changes.join(', ') : 'unchanged', w.etymology ?? '', w.blocked.length ? `kept apart from another word (${w.blocked.join(', ')} blocked)` : ''];
    const donorName = id => h.loans?.donors.find(d => d.id === id)?.name ?? id;
    const inv = h.inventory;
    const invText = [inv.gained.length ? `new sounds: ${inv.gained.join(' ')}` : '', inv.lost.length ? `lost sounds: ${inv.lost.join(' ')}` : ''].filter(Boolean).join('; ');
    const sorted = [...h.lexicon].sort((a, b) => a.lemma.localeCompare(b.lemma));
    return `<div class="card"><h3>Mother language and sound changes</h3>
<p class="sub">The language shown in every other tab is the <strong>daughter</strong>. The generator first builds its mother (the proto-language, whose sound system is the one chosen in the Phonology settings) and then applies ${st.rules} ordered sound changes to every word, to the derivational and inflectional affixes and to the numerals. Forms marked * are the mother's. Derived words change as wholes, so related words come to differ in their roots. ${st.unchanged} of ${st.words} words (${pct(st.unchanged)}) are unchanged. A rule never makes a word identical to another word: where it would, that word keeps its older shape (${st.blocked} words${st.repaired ? `; ${st.repaired} more repaired after the numerals were recomposed` : ''})${h.attempts > 1 ? `; ${h.attempts} rule sets were tried` : ''}.${invText ? ` Sounds of the daughter against the mother — ${esc(invText)}.` : ''} Sentences, names and the calendar are built from the daughter's words, so inflected forms are made of changed stems and changed affixes (no further rule applies to them).</p>
<h4>Sound changes, oldest first</h4>
${tbl(['#', 'When', 'Change', 'Words affected', 'Example'], rules)}
<h4>Examples: daughter against mother</h4>
${tbl(['Daughter', 'Mother', 'English', 'Changes', 'Etymology', 'Note'], examples.map(row))}
${h.alternations.length ? `<h4>Related words whose root has diverged (${st.alternations})</h4>${tbl(['Base', 'Derived', 'Mother: base → derived', 'Relation'], h.alternations.map(a => [a.base, a.derived, `*${a.baseProto} → *${a.derivedProto}`, `${a.lemmas} (${a.type})`]))}` : ''}
${h.affixes.length ? `<h4>Derivational affixes</h4>${tbl(['Type', 'Mother', 'Daughter'], h.affixes.map(a => [a.type, a.position === 'prefix' ? `*${a.proto}-` : `*-${a.proto}`, a.position === 'prefix' ? `${a.daughter}-` : `-${a.daughter}`]))}` : ''}
${sisterHtml(h)}
${loansHtml(h)}
<h4>All words (${sorted.length})</h4>
<div class="table-scroll history-scroll">${tbl(['Daughter', 'Mother', 'English', 'Changes', 'Etymology', 'Note'], sorted.map(row))}</div></div>`;
}

const DONOR_LABELS = { conqueror: ['ruling neighbour', 'war, arms, government, building'], trade: ['trading partner', 'goods, food, cloth, ships, crafts'], sacred: ['liturgical language', 'religion, magic, learned words'], neighbour: ['neighbouring people', 'animals, plants, food, everyday things'] };

function loansHtml(h) {
    const lo = h.loans;
    if (!lo) return '';
    const donors = lo.donors.map(d => [d.name, DONOR_LABELS[d.role][0], d.model, `c. ${d.years} years ago`, DONOR_LABELS[d.role][1]]);
    const rows = [...lo.items].sort((a, b) => a.lemma.localeCompare(b.lemma)).map(x => [x.form, `*${x.source}*`, x.lemma, lo.donors.find(d => d.id === x.donor)?.name ?? x.donor, `c. ${x.years} years ago`, x.replaced]);
    return `<h4>Loanwords (${lo.items.length}, ${Math.round(lo.share * 100)}% of the words)</h4>
<p class="sub">Words entered the daughter after the split from the mother, from other languages; they do not derive from the mother, are adapted to the daughter's sounds and only undergo the changes that follow their date (so a word may be a loan while its derivatives keep the native root). How readily a language borrows depends on its kind and on chance (here ${Math.round(lo.absorbency * 100)}% of the lexicon before the draw of words); each donor favours some fields.</p>
${tbl(['Donor language', 'Kind', 'Sound system', 'Contact', 'Favoured fields'], donors)}
<div class="table-scroll history-scroll">${tbl(['Word', 'Donor form', 'English', 'Donor', 'Entered', 'Replaces (native)'], rows)}</div>`;
}

const CW = 7.4;   // character width of the graph font (monospace 12px), in px
const nodeW = text => Math.max(28, Math.round(text.length * CW) + 14);

// Family tree: the mother at the top, the two daughters below, the changes along each branch.
function familyTreeSvg(h) {
    const d = h.rules, sr = h.sister.rules;
    const W = 720, rowH = 15;
    const lines = (rules, x, anchor) => rules.map((r, i) => `<text x="${x}" y="${108 + i * rowH}" text-anchor="${anchor}" class="graph-small">${esc(`c. ${r.years} · ${r.id}`)}</text>`).join('');
    const H = Math.max(150, 100 + Math.max(d.length, sr.length) * rowH);
    return `<svg class="graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="Family tree: the mother language and its two daughters" width="100%" style="max-width:${W}px">
<rect x="${W / 2 - 70}" y="6" width="140" height="26" rx="5" class="graph-node"/><text x="${W / 2}" y="24" text-anchor="middle" class="graph-text">Mother (proto)</text>
<path d="M${W / 2 - 30} 32 L${W * 0.25} 66" class="graph-edge"/><path d="M${W / 2 + 30} 32 L${W * 0.75} 66" class="graph-edge"/>
<rect x="${W * 0.25 - 95}" y="62" width="190" height="26" rx="5" class="graph-node graph-main"/><text x="${W * 0.25}" y="80" text-anchor="middle" class="graph-text">Daughter (this language)</text>
<rect x="${W * 0.75 - 95}" y="62" width="190" height="26" rx="5" class="graph-node"/><text x="${W * 0.75}" y="80" text-anchor="middle" class="graph-text">Sister (examples only)</text>
${lines(d, W * 0.25, 'middle')}${lines(sr, W * 0.75, 'middle')}
</svg>`;
}

// One word, mother to daughter and mother to sister, with every intermediate form.
function wordGraphSvg(e) {
    const rowH = 44, pad = 8, gap = 46;
    const branch = (steps, final, y, label) => {
        let x = pad, out = '';
        const nodes = [{ text: `*${e.mother}`, mother: true }, ...steps.map(s => ({ text: s.form, edge: s.id }))];
        nodes.forEach((n, i) => {
            const w = nodeW(n.text);
            if (i > 0) out += `<path d="M${x - gap + 4} ${y + 12} L${x - 2} ${y + 12}" class="graph-edge" marker-end="url(#arr)"/><text x="${x - gap / 2 + 1}" y="${y - 2}" text-anchor="middle" class="graph-small">${esc(n.edge)}</text>`;
            const last = i === nodes.length - 1;
            out += `<rect x="${x}" y="${y}" width="${w}" height="24" rx="4" class="graph-node${last ? ' graph-main' : ''}"/><text x="${x + w / 2}" y="${y + 16}" text-anchor="middle" class="graph-text">${esc(n.text)}</text>`;
            x += w + gap;
        });
        return { out, width: x - gap + pad };
    };
    const a = branch(e.daughterSteps, e.daughter, 16, 'daughter'), b = branch(e.sisterSteps, e.sister, 16 + rowH, 'sister');
    const W = Math.max(a.width, b.width, 120);
    return `<svg class="graph" viewBox="0 0 ${W} ${16 + rowH + 36}" width="${W}" role="img" aria-label="Derivation of ${esc(e.lemma)}"><defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 z" class="graph-arrow"/></marker></defs>${a.out}${b.out}</svg>`;
}

function sisterHtml(h) {
    const s = h.sister;
    if (!s?.examples?.length) return '';
    const cards = s.examples.map(e => `<div class="graph-card"><div class="graph-title"><strong>${esc(e.lemma)}</strong>${e.etymology ? ` <span class="sub">${esc(e.etymology)}</span>` : ''}</div>${wordGraphSvg(e)}<div class="graph-legend"><span>top: daughter (this language) <strong>${esc(e.daughter)}</strong></span><span>bottom: sister <strong>${esc(e.sister)}</strong></span></div></div>`).join('');
    const ruleTable = (rules) => tbl(['When', 'Change'], rules.map(r => [`c. ${r.years} years ago`, r.label]));
    return `<h4>Sister language (examples)</h4>
<p class="sub">A sister descends from the same mother through other changes (${s.stats.rules} here; the two languages may share some innovations). Only examples are shown: ${s.stats.same} of ${s.stats.words} words come out identical in both. Each graph follows one word from the mother to the daughter (this language) and to the sister, with every intermediate form and the change that produced it.</p>
${familyTreeSvg(h)}
<div class="two-col"><div><h5>Changes of the daughter</h5>${ruleTable(h.rules)}</div><div><h5>Changes of the sister</h5>${ruleTable(s.rules)}</div></div>
<div class="graph-grid">${cards}</div>`;
}

// ---- Writing tab ---------------------------------------------------------------------------------------------------
const sample = (lang, n) => lang.samples.slice(0, n).map(smp => {
    const flat = tokens => tokens.flatMap(t => t.kind === 'alts' ? flat(t.options[0]) : t.kind === 'word' ? [t.parts.map(p => p.text).join('')] : []);
    return { words: flat(smp.tokens), english: String(smp.english).replace(/\[([^|\]]+)(?:\|[^\]]*)*\]/g, '$1') };
}).filter(x => x.words.length);

export function writingHtml(lang, choice = 'auto') {
    const W = buildWriting(lang, choice);
    const sign = (svg, label, note = '') => `<div class="sign">${svg}<span class="sign-label">${esc(label)}</span>${note ? `<span class="sign-note">${esc(note)}</span>` : ''}</div>`;
    const cell = (c) => W.drawCell(c, 44);
    const { vowels, consonants, base, syllables } = W.letters;
    let signs = '', intro = '';
    const pct = x => `${(100 * x).toFixed(1)}%`;
    if (W.type === 'alphabet') {
        intro = `Every sound has its own letter (${base.length} letters), and words are written as they are pronounced, except for the spelling rules below.`;
        signs = `<div class="sign-grid">${base.map(l => sign(cell({ b: l }), l, W.isV(l) ? 'vowel' : '')).join('')}</div>`;
    } else if (W.type === 'abjad') {
        const matres = base.filter(k => k.startsWith('m:')).map(k => k.slice(2));
        intro = `Only consonants (and ${matres.join(' and ')}, which have letters of their own) are written; the reader supplies the other vowels. A carrier letter begins words that start with another vowel. In pointed text (teaching, sacred and poetic texts) small marks above, below or after the letter give the vowels: ${W.homographs} of ${W.words} words (${pct(W.homographs / W.words)}) have the same ordinary spelling as another word. The text runs ${W.direction === 'rtl' ? 'from right to left' : 'from left to right'}.`;
        signs = `<h5>Letters</h5><div class="sign-grid">${base.filter(k => !k.startsWith('m:') && k !== '@').map(l => sign(cell({ b: l }), l)).concat(base.filter(k => k.startsWith('m:')).map(k => sign(cell({ b: k }), k.slice(2), 'vowel letter')), [sign(cell({ b: '@' }), '(carrier)', 'initial vowel')]).join('')}</div>
<h5>Vowel marks (pointed text), shown on the letter ${esc(consonants[0])}</h5><div class="sign-grid">${W.markVowels.map(v => sign(cell({ b: consonants[0], marks: [v] }), `${consonants[0]}${v}`)).concat([sign(cell({ b: consonants[0], marks: ['0'] }), `${consonants[0]}`, 'no vowel')]).join('')}</div>`;
    } else if (W.type === 'abugida') {
        intro = `Each consonant letter carries the inherent vowel ${W.inherent}: the letter alone reads ${consonants[0]}${W.inherent}. Another vowel is written with a sign attached to the letter, and a virama sign cancels the vowel (the consonant alone). Independent letters write vowels at the start of a word or after another vowel.`;
        signs = `<h5>Consonants (inherent vowel ${esc(W.inherent)})</h5><div class="sign-grid">${consonants.map(c => sign(cell({ b: c, marks: [] }), `${c}${W.inherent}`)).join('')}</div>
<h5>Vowel signs, shown on ${esc(consonants[0])}</h5><div class="sign-grid">${W.markVowels.map(v => sign(cell({ b: consonants[0], marks: [v] }), `${consonants[0]}${v}`)).concat([sign(cell({ b: consonants[0], marks: ['0'] }), consonants[0], 'virama')]).join('')}</div>
<h5>Independent vowels</h5><div class="sign-grid">${vowels.map(v => sign(cell({ b: `v:${v}` }), v)).join('')}</div>`;
    } else {
        intro = `Every sign is a syllable: a consonant component and a vowel component side by side. A consonant that is not followed by a vowel (the end of a syllable or a cluster member) is written with its component over a bar. ${syllables.length} syllables occur in the words of the language.`;
        const vcols = vowels;
        const grid = `<div class="table-scroll"><table class="names-table"><thead><tr><th></th>${vcols.map(v => `<th>${esc(v)}</th>`).join('')}<th>alone</th></tr></thead><tbody>${consonants.map(c => `<tr><th>${esc(c)}</th>${vcols.map(v => `<td>${syllables.includes(c + v) ? cell({ syl: c + v, c, v }) : ''}</td>`).join('')}<td>${syllables.includes(c) ? cell({ syl: c, c, v: null }) : ''}</td></tr>`).join('')}<tr><th>—</th>${vcols.map(v => `<td>${syllables.includes(v) ? cell({ syl: v, c: null, v }) : ''}</td>`).join('')}<td></td></tr></tbody></table></div>`;
        signs = grid;
    }
    const table = (head, rows) => `<div class="table-scroll"><table class="names-table"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    let ligHtml = '';
    if (W.ligatures.length) {
        const kind = W.type === 'abugida' ? 'Conjuncts: two consonants with no vowel between them are written as one sign (the first is reduced and tucked in front of the second; the vowel sign goes on the whole). Only the most frequent clusters have one; the others use the virama.'
            : 'Ligatures: the commonest pairs of adjacent letters are fused into one sign, as in Latin fi or æ. They are optional shapes of the same letters and read as the two sounds.';
        ligHtml = `<h4>Ligatures</h4><p class="sub">${esc(kind)}</p><div class="sign-grid">${W.ligatures.map(k => sign(cell({ b: `L:${k}`, marks: [] }), W.type === 'abugida' ? `${k[0]}${k[1]}` : k)).join('')}</div>`;
    } else if (W.type === 'abjad' || W.type === 'syllabary') ligHtml = `<h4>Ligatures</h4><p class="sub">${W.type === 'abjad' ? 'Letters are not fused in this script.' : 'Each sign is already a whole syllable, so there are no ligatures.'}</p>`;
    else if (W.type === 'alphabet') ligHtml = '<h4>Ligatures</h4><p class="sub">None: no pair of letters is frequent enough to deserve its own sign.</p>';
    if (W.joined) ligHtml += `<p class="sub">Letters are joined: the strokes of a word run along a common baseline (cursive).</p>`;
    const N = buildNumberSigns(lang, W);
    const numHtml = (() => {
        const how = N.restricted ? `This language counts only up to ${N.limit}: numbers are tally strokes, and anything larger is written with a single sign for “many”.`
            : N.composite ? `Base-${N.base} positional notation. Digits are made of dots (1) and bars (5) with a shell for zero; the digits are written left to right, largest place first.`
                : `Base-${N.base} positional notation with a glyph for every digit, zero included, written left to right, largest place first (also inside right-to-left text).`;
        const digits = N.restricted ? `<div class="sign-grid">${[1, 2, 3, 4, 5].filter(n => n <= N.limit).map(n => sign(N.drawCell({ tally: n }, 44), String(n))).join('')}${sign(N.many, 'many')}</div>`
            : `<div class="sign-grid">${N.digits.map(d => sign(d.svg, String(d.v))).join('')}</div>`;
        const rows = N.examples.map(e => [N.write(e.n, 30), String(e.n), esc(e.word), esc(ipaText(e.word))]);
        return `<h4>Numerals</h4><p class="sub">${esc(how)}</p>${digits}${table(['Written', 'Value', 'Spoken', 'IPA'], rows)}<p class="sub">Check: ${N.failures === 0 ? 'all sample numbers read back correctly' : `${N.failures} numbers do not read back`}.</p>`;
    })();
    const rulesList = [];
    if (W.rules.length) for (const ru of W.rules) rulesList.push(`${ru.text}${ru.examples.length ? ` (written ${ru.examples.map(e => `${e.written}`).join(', ')}; read ${ru.examples.map(e => e.spoken).join(', ')})` : ''}`);
    else rulesList.push('Spelling is phonemic: every letter has a single value.');
    if (W.exceptions.length) rulesList.push(`A small mark before a word means that it is read exactly as written, against the rules above: ${W.exceptions.length} words (${pct(W.exceptionShare)}), e.g. ${W.exceptions.slice(0, 4).join(', ')}.`);
    const pick = [];
    const lexWords = lang.lexicon.filter(e => e.form.length >= 3 && e.form.length <= 9 && !e.form.includes(' '));
    for (const w of W.exceptions.slice(0, 3)) { const e = lexWords.find(x => x.form === w); if (e) pick.push(e); }
    for (const e of lexWords) { if (pick.length >= 8) break; if (W.spelled(e.form) !== e.form && !pick.includes(e)) pick.push(e); }
    for (let i = 0; pick.length < 24 && i < lexWords.length; i += Math.max(1, Math.floor(lexWords.length / 40))) if (!pick.includes(lexWords[i])) pick.push(lexWords[i]);
    const exRows = pick.map(e => [W.wordSvg(e.form), esc(e.form), esc(W.spelled(e.form) === e.form ? '' : W.spelled(e.form)), esc(label(e))]);
    const lines = sample(lang, 5).map(x => `<div class="script-sentence"><div class="script-line" dir="${W.direction}">${x.words.map(w => W.wordSvg(w, 34, false)).join('')}</div><div class="sub">${esc(x.words.join(' '))} — ${esc(x.english)}</div></div>`).join('');
    const check = W.failures === 0 ? 'every word of the language reads back as it was written' : `${W.failures} words do not read back correctly`;
    return `<div class="card"><h3>${esc(WRITING_LABELS[W.type])}</h3>
<p class="sub">${esc(intro)} Glyph style: ${esc(W.style)}. The language is shown in Latin transcription everywhere else.</p>
<h4>Signs</h4>${signs}
${ligHtml}${numHtml}
<h4>Reading rules</h4><ul class="notes">${rulesList.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
<p class="sub">Check: ${esc(check)}.</p>
<h4>Examples</h4>${table(W.type === 'abjad' ? ['Ordinary text', 'Pointed', 'Spoken', 'IPA', 'English'] : ['Script', 'Spoken', 'IPA', 'Spelled', 'English'], pick.map(e => W.type === 'abjad' ? [W.wordSvg(e.form, 38, false), W.wordSvg(e.form), esc(e.form), esc(ipaText(e.form)), esc(label(e))] : [W.wordSvg(e.form), esc(e.form), esc(ipaText(e.form)), esc(W.spelled(e.form) === e.form ? '—' : W.spelled(e.form)), esc(label(e))]))}
<h4>Sample sentences</h4>${lines}</div>`;
}
