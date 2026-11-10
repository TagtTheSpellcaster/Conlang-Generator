// HTML builders for the generator page. Pure: (language) -> string. No DOM access.
import { esc } from '../core/text.js';
import { label } from '../lexicon/schema.js';
import { inflect, genderOf } from '../morphology/inflect.js';
import { personCells } from '../morphology/affixes.js';

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

export function phonologyHtml(lang) {
    const p = lang.phonology;
    const list = a => a.map(x => `<code>${esc(x)}</code>`).join(' ');
    return `<div class="card phonology-card"><h3>Phonology</h3><div class="sub">${esc(p.name)} · ${esc(p.lengthProfile)} words</div><div class="phon-clusters"><div><strong>Vowels:</strong> ${list(p.vowels)}</div><div><strong>Consonants:</strong> ${list(p.consonants)}</div></div>${clusterSummaryHtml(p)}<div class="phon-clusters"><div><strong>Syllable patterns:</strong> ${list(p.patterns)}</div></div></div>`;
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

function exampleNoun(lexicon) {
    const nouns = lexicon.filter(e => e.pos === 'noun');
    for (const lemma of ['forest', 'house', 'tree', 'village', 'stone', 'water']) {
        const hit = nouns.find(e => e.lemma === lemma && !e.gloss);
        if (hit) return hit;
    }
    return nouns[0] ?? null;
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
    const adjective = lang.lexicon.find(e => e.pos === 'adjective' && e.lemma === 'good') || lang.lexicon.find(e => e.pos === 'adjective');
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

function exampleVerb(lexicon) {
    const verbs = lexicon.filter(e => e.pos === 'verb');
    for (const lemma of ['see', 'eat', 'go']) { const hit = verbs.find(e => e.lemma === lemma && !e.gloss); if (hit) return hit; }
    return verbs[0] ?? null;
}

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
        notes.push('Verb structure: stem – ability – negation – tense – subject agreement. Present tense and third person singular are unmarked.');
        notes.push(`Ability: ${sfx(v.potential)} · negation: ${sfx(v.negation)} · imperative: ${sfx(v.imperative)}`);
        const poss = affixes.possessive;
        if (poss) {
            const noun = exampleNoun(lang.lexicon);
            const entries = Object.entries(poss).map(([cell, a]) => `${esc(cellLabel(cell))} ${sfx(a)}`).join(' · ');
            notes.push(`Possessor suffixes (between number and case): ${entries}${noun ? ` — e.g. ${esc(noun.lemma)}: ${formHtml(inflect(noun, { possessor: '1.singular', case: model.baseCase }, morph).parts, false)}` : ''}`);
        }
    } else {
        notes.push('Fusional verbs: one portmanteau ending per tense, person and number. Negation and ability stay separate words; the imperative is the bare stem.');
    }
    notes.push('Subject pronouns are dropped when the verb carries person and number.');
    return `<div class="card verb-morphology"><h3>Verb morphology</h3><div class="sub">Example verb: <strong>${esc(label(verb))}</strong> — <span class="morph-stem">${esc(verb.form)}</span></div><div class="morph-example-table"><div class="morph-verb-head"><span>Subject</span>${tenses.map(t => `<span>${esc(t)}</span>`).join('')}</div>${rows}</div>${notes.map(n => `<div class="morph-note">${n}</div>`).join('')}</div>`;
}

const tokenHtml = t => t.kind === 'alts'
    ? `[${t.options.map(o => o.map(tokenHtml).join(' ')).join('|')}]`
    : `<span class="sample-word" data-meaning="${esc(t.gloss)}">${t.parts.map(p => p.kind === 'stem' ? esc(p.text) : `<span class="morph-ending" title="${esc(p.meaning ?? p.kind)}">${esc(p.text)}</span>`).join('')}</span>`;

const pillHtml = s => `<div class="sample-pill"><div class="en"><b>${s.number}.</b> ${esc(s.english)}</div><div class="cl"><b>${s.number}.</b> ${s.tokens.map(tokenHtml).join(' ')}</div></div>`;

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

export const lexiconRows = lexicon => lexicon.map(e => ({ word: e.form, english: label(e), meta: `${e.domain} · ${e.pos}` }));

export function lexiconHtml(lexicon) {
    return `<h3>Generated lexicon</h3><div class="lexicon">${lexiconRows(lexicon).map(r => `<div class="lex-row"><span class="word">${esc(r.word)}</span><span class="eng">${esc(r.english)}</span><span class="meta">${esc(r.meta)}</span></div>`).join('')}</div>`;
}

export function dictionaryHtml(lexicon, direction, query) {
    const q = String(query || '').toLowerCase().trim();
    let rows = lexiconRows(lexicon).map(r => direction === 'conlang-en' ? { l: r.word, r: r.english, m: r.meta } : { l: r.english, r: r.word, m: r.meta });
    if (q) rows = rows.filter(x => `${x.l} ${x.r} ${x.m}`.toLowerCase().includes(q));
    rows.sort((a, b) => a.l.localeCompare(b.l));
    return `<div class="card"><h3>${direction === 'conlang-en' ? 'Conlang → English' : 'English → Conlang'}</h3><div class="sub" style="margin-bottom:10px">${rows.length} matching entries</div><div class="dictionary">${rows.map(x => `<div class="dict-row"><strong>${esc(x.l)}</strong><span>${esc(x.r)}</span><span class="meta">${esc(x.m)}</span></div>`).join('')}</div></div>`;
}

export function resultHtml(lang) {
    const s = lang.spec;
    const chips = [s.culture[0], s.biome[0], s.era[0], s.order].filter(Boolean);
    const notes = lang.notes.length ? `<div class="card"><h3>Adjusted options</h3>${lang.notes.map(n => `<div class="morph-note">${esc(n)}</div>`).join('')}</div>` : '';
    return `<div class="hero"><div><div class="lang-name">Name of language: ${esc(lang.name)}</div>${lang.genre ? `<div class="sub genre-line"><strong>Genre:</strong> ${esc(lang.genre.label)} — ${esc(lang.genre.summary)}</div>` : ''}<div class="chips">${chips.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div><div class="sub">Seed: <code id="used-seed">${esc(s.seed)}</code> <button type="button" class="btn ghost" id="keep-seed">Use this seed</button></div></div><div class="status">${lang.lexicon.length} lexical entries</div></div><div class="result-cols"><div class="result-col">${phonologyHtml(lang)}${morphemeInventoryHtml(lang)}</div><div class="result-col">${verbMorphologyHtml(lang)}${nominalCategoriesHtml(lang)}${notes}</div></div>`;
}
