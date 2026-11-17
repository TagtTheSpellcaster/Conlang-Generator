// HTML builders for the generator page. Pure: (language) -> string. No DOM access.
import { buildWriting, WRITING_LABELS } from '../writing/system.js';
import { buildNumberSigns } from '../writing/numerals.js';
import { ipaWord, ipaOfLetter, stressOf, STRESS_SYSTEMS } from '../ipa.js';

let showIpa = false;
export const setShowIpa = on => { showIpa = !!on; };
let curStress = 'penult';
export const setStress = id => { curStress = id || 'penult'; };
const ipaText = form => `/${ipaWord(form, curStress)}/`;
import { esc } from '../core/text.js';
import { label } from '../lexicon/schema.js';
import { inflect, genderOf, classOf } from '../morphology/inflect.js';
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

// Letter values in IPA for the letters of the language; the stress system is a property of the language.
function ipaChartHtml(p) {
    const letters = [...p.used.vowels, ...p.used.consonants];
    const st = STRESS_SYSTEMS.find(x => x.id === p.stress) ?? STRESS_SYSTEMS[0];
    return `<div class="phon-clusters"><div><strong>Stress:</strong> ${esc(st.text)}.</div><div><strong>IPA:</strong> ${letters.map(l => `<span class="chip">${esc(l)} = /${esc(ipaOfLetter(l))}/</span>`).join(' ')}</div><div class="sub">Syllables are divided by onset maximisation; stress is fixed by the language (see below) and marked ˈ (main) and ˌ (secondary); one-syllable words are not marked. The IPA toggle in the header adds these transcriptions to the lexicon, the dictionary and the sample sentences.</div></div>`;
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
    const html = parts.map(p => p.kind === 'stem' ? esc(p.text) : p.kind === 'stem-alt' ? `<span class="morph-alt" title="stem alternation (regular stem ${esc(p.regular)})">${esc(p.text)}</span>` : p.kind === 'suppletive' ? `<span class="morph-supp" title="suppletive stem">${esc(p.text)}</span>` : `<span class="morph-ending">${esc(p.text)}</span>`).join('');
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

// Inflection classes, stem alternations from the sound changes, and suppletion.
export function classesHtml(lang) {
    const { spec, morphology } = lang;
    const { model, affixes } = morphology;
    if (spec.morphology === 'isolating' && !Object.keys(affixes.suppletion ?? {}).length) return '';
    const morph = { spec, model, affixes };
    const notes = [], parts = [];
    const lex = lang.lexicon;
    const rank = { core: 0, common: 1, domain: 2 };
    const sorted = [...lex].sort((a, b) => rank[a.tier] - rank[b.tier]);
    const ruleLabel = Object.fromEntries((lang.history?.rules ?? []).map(r => [r.id, r.label]));
    const fmt = r => `<span class="morph-form">${formHtml(r.parts, false)}</span>`;
    const rowsFor = (group, count, pos, cellsOf, head) => {
        const members = lex.filter(e => pos.includes(e.pos) && !e.loan);
        const by = Array.from({ length: count }, () => []);
        for (const e of members) by[classOf(e, affixes, spec)].push(e);
        const finals = k => Object.entries(affixes.classMap?.[group] ?? {}).filter(([, c]) => c === k).map(([l]) => l);
        const rows = by.map((list, k) => {
            const ex = sorted.find(e => pos.includes(e.pos) && !e.loan && classOf(e, affixes, spec) === k && !e.gloss);
            return `<tr><td class="name-cell">${['I', 'II', 'III', 'IV'][k]}</td><td>${members.length ? (100 * list.length / members.length).toFixed(0) : 0}%</td><td>${esc(finals(k).slice(0, 8).join(' ')) || '—'}</td><td>${ex ? esc(label(ex)) : '—'}</td>${ex ? cellsOf(ex).map(r => `<td>${fmt(r)}</td>`).join('') : head.map(() => '<td></td>').join('')}</tr>`;
        }).join('');
        return `<table class="names-table full-table"><thead><tr><th>Class</th><th>Share</th><th>Last sound of the mother stem</th><th>Example</th>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
    };
    const nCount = affixes.classOverlays?.noun?.length ?? 1, vCount = affixes.classOverlays?.verb?.length ?? 1;
    if (nCount > 1) {
        const c2 = model.cases.find(c => c !== model.baseCase);
        const head = ['singular', 'plural', ...(c2 ? [`${c2} sg.`, `${c2} pl.`] : [])];
        const cells = e => [inflect(e, { number: 'singular', case: model.baseCase }, morph), inflect(e, { number: 'plural', case: model.baseCase }, morph), ...(c2 ? [inflect(e, { number: 'singular', case: c2 }, morph), inflect(e, { number: 'plural', case: c2 }, morph)] : [])];
        parts.push(`<h4>Noun and adjective classes (${nCount})</h4>${rowsFor('noun', nCount, ['noun', 'adjective'], cells, head)}`);
        notes.push(`A noun's class depends on the last sound of its stem in the mother language (the "theme"); about ${Math.round((affixes.classMap?.exceptions ?? 0) * 100)}% of the words belong to another class for no reason the form shows. Adjectives follow the noun classes.`);
    } else if (spec.morphology !== 'isolating') notes.push('All nouns and adjectives share one paradigm.');
    if (vCount > 1 && affixes.verb) {
        const head = ['present 3sg.', 'present 1pl.', 'past 3sg.', 'future 3pl.'];
        const f = (e, tense, person, number) => inflect(e, { tense, person, number }, morph);
        const cells = e => [f(e, 'present', 3, 'singular'), f(e, 'present', 1, 'plural'), f(e, 'past', 3, 'singular'), f(e, 'future', 3, 'plural')];
        parts.push(`<h4>Verb classes (${vCount})</h4>${rowsFor('verb', vCount, ['verb'], cells, head)}`);
    } else if (spec.morphology !== 'isolating' && affixes.verb) notes.push('All verbs share one conjugation.');
    // stem alternations produced by the sound changes
    const alt = [];
    if (affixes.history) {
        const tryCells = e => e.pos === 'verb' ? [{ tense: 'past', person: 3, number: 'singular' }, { tense: 'present', person: 1, number: 'plural' }, { tense: 'future', person: 3, number: 'plural' }]
            : e.pos === 'noun' ? [{ number: 'plural', case: model.baseCase }, ...(model.cases.slice(1, 3).map(c => ({ number: 'singular', case: c })))] : [];
        for (const e of sorted) {
            if (alt.length >= 12) break;
            if (!['noun', 'verb'].includes(e.pos) || e.gloss) continue;
            for (const f of tryCells(e)) { const r = inflect(e, f, morph); if (r.irregular) { alt.push({ e, f, r }); break; } }
        }
    }
    if (alt.length) {
        const cellName = f => f.tense ? `${f.tense}${f.person ? ` ${f.person}${f.number === 'plural' ? 'pl' : 'sg'}` : ''}` : `${f.number}${f.case ? ` ${f.case}` : ''}`;
        parts.push(`<h4>Stem alternations</h4><p class="sub">The mother's stem and ending were joined first and the sound changes then ran over the whole word, so some forms have a stem that differs from the dictionary form. Analogy has levelled the others, so only some words alternate.</p><table class="names-table full-table"><thead><tr><th>Word</th><th>Form</th><th>Cell</th><th>Regular form would be</th><th>Caused by</th></tr></thead><tbody>${alt.map(({ e, f, r }) => `<tr><td class="name-cell">${esc(label(e))}: ${esc(e.form)}</td><td>${fmt(r)}</td><td>${esc(cellName(f))}</td><td>${esc(r.irregular.regular)}</td><td>${esc(r.irregular.rules.map(id => { const m = id.match(/^(\S+) \((.*)\)$/); return m ? `${ruleLabel[m[1]] ?? m[1]} (${m[2]})` : (ruleLabel[id] ?? id); }).join('; ') || '—')}</td></tr>`).join('')}</tbody></table>`);
    }
    const supp = Object.entries(affixes.suppletion ?? {});
    if (supp.length) {
        const rows = supp.map(([id, o]) => { const e = lex.find(x => x.id === id); return e ? `<tr><td class="name-cell">${esc(label(e))}</td><td>${esc(e.form)}</td><td>${Object.entries(o).map(([k, w]) => `${esc(k)}: <span class="morph-supp">${esc(w)}</span>`).join(', ')}</td></tr>` : ''; }).join('');
        parts.push(`<h4>Suppletion</h4><p class="sub">Frequent words whose past tense or comparative uses a different stem (as in <em>go</em> ~ <em>went</em>, <em>good</em> ~ <em>better</em>).</p><table class="names-table full-table"><thead><tr><th>Word</th><th>Stem</th><th>Irregular stems</th></tr></thead><tbody>${rows}</tbody></table>`);
    }
    if (!parts.length && !notes.length) return '';
    return `<div class="card class-morphology"><h3>Inflection classes and irregular forms</h3>${notes.map(n => `<div class="sub">${esc(n)}</div>`).join('')}${parts.join('')}</div>`;
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
        notes.push('Verb structure: stem – voice – ability – negation – aspect – tense – subject agreement. Present tense and third person singular are unmarked.');
        if (affixes.voice && Object.keys(affixes.voice).length) notes.push(`Voice suffixes (right after the stem): ${Object.entries(affixes.voice).map(([k, a]) => `${k} ${sfx(a)}`).join(' · ')}.`);
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
    : `<span class="sample-word" data-meaning="${esc(t.gloss)}">${t.parts.map(p => ['stem', 'stem-alt', 'suppletive'].includes(p.kind) ? esc(p.text) : `<span class="morph-ending" title="${esc(p.meaning ?? p.kind)}">${esc(p.text)}</span>`).join('')}</span>`;

const flatTokens = tokens => tokens.flatMap(t => t.kind === 'alts' ? flatTokens(t.options[0]) : t.kind === 'word' ? [t.parts.map(p => p.text).join('')] : []);
const pillHtml = s => `<div class="sample-pill"><div class="en"><b>${s.number}.</b> ${esc(s.english)}</div><div class="cl"><b>${s.number}.</b> ${s.tokens.map(tokenHtml).join(' ')}</div>${showIpa ? `<div class="ipa-line">${esc(flatTokens(s.tokens).map(w => ipaWord(w, curStress)).join(' '))}</div>` : ''}</div>`;

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

export function textsHtml(lang) {
    const texts = lang.texts ?? [];
    if (!texts.length) return '';
    const line = l => `<div class="sample-pill"><div class="en">${l.speaker ? `<b>${esc(l.speaker)}:</b> ` : ''}${esc(l.en)}</div><div class="cl">${l.speaker ? `<b>${esc(l.speaker)}:</b> ` : ''}${l.tokens.map(tokenHtml).join(' ')}</div>${showIpa ? `<div class="ipa-line">${esc(flatTokens(l.tokens).map(w => ipaWord(w, curStress)).join(' '))}</div>` : ''}</div>`;
    return `<div class="card"><h3>Connected texts</h3><p class="sub">Short texts built from the same grammar as the sample sentences. A character is introduced with an indefinite noun phrase, named again with a definite one, and referred to by a pronoun while it is the topic; where the verb carries person and number the pronoun is dropped. Hover a word for its meaning.</p>${texts.map(t => `<h4 class="sample-topic">${esc(t.title)} <span class="sub">(${esc(t.kind)})</span></h4>${t.lines.map(line).join('')}`).join('')}</div>`;
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
    const vt = s.valencyText, noteVoice = vt ? `<div class="morph-note">Passive: ${esc(vt.passive)} · antipassive: ${esc(vt.antipassive)} · causative: ${esc(vt.causative)} · applicative: ${esc(vt.applicative)}</div>` : '';
    const it = s.informationText, noteInfo = it ? `<div class="morph-note">Demonstratives: ${esc(it.demonstratives)} · reflexive: ${esc(it.reflexive)} · topic: ${esc(it.topic)} · focus: ${esc(it.focus)}</div>` : '';
    return `<div class="sample-frame"><div class="morph-note">${note}</div>${noteInfo}${noteVoice}<div class="sample-columns">${left}${right}</div></div>`;
}

import { historyStory } from '../history/story.js';
import { MECHANISMS } from '../semantics/colex.js';
export const structureOf = e => e.colex ? `same word as “${e.colex.with.split('.')[1].replace(/_/g, ' ')}” (${e.colex.group === 'pair' ? (MECHANISMS[e.colex.kind] ?? e.colex.kind).split(' (')[0] : e.colex.note.split(':')[0]})` : e.colexHeads ? `also names: ${e.colexHeads.map(id => id.split('.')[1].replace(/_/g, ' ')).join(', ')}` : e.derivation ? `${e.derivation.text} (${e.derivation.gloss.toLowerCase()})` : e.loan ? `loan from ${e.loan.donorName} *${e.loan.source}*` : '';
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
    return `<div class="hero"><div><div class="lang-name">Name of language: ${esc(lang.name)}</div>${lang.genre ? `<div class="sub genre-line"><strong>Genre:</strong> ${esc(lang.genre.label)} — ${esc(lang.genre.summary)}</div>` : ''}<div class="chips">${chips.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div><div class="sub">Seed: <code id="used-seed">${esc(s.seed)}</code> <button type="button" class="btn ghost" id="keep-seed">Use this seed</button></div></div><div class="status">${lang.lexicon.length} lexical entries</div></div><div class="export-bar" role="group" aria-label="Export"><span class="sub">Export:</span><button type="button" class="btn ghost" data-export="html">Language sheet (HTML)</button><button type="button" class="btn ghost" data-export="md">Markdown</button><button type="button" class="btn ghost" data-export="csv">Lexicon (CSV)</button><button type="button" class="btn ghost" data-export="json">Language (JSON)</button></div><div class="result-cols"><div class="result-col">${phonologyHtml(lang)}${morphemeInventoryHtml(lang)}</div><div class="result-col">${verbMorphologyHtml(lang)}${nominalCategoriesHtml(lang)}${classesHtml(lang)}${notes}</div></div>`;
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
const plainTable = (head, rows) => `<div class="table-scroll"><table class="names-table"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export function semanticsHtml(lang) {
    const m = lang.semantics;
    if (!m) return '';
    const byId = new Map(lang.lexicon.map(e => [e.id, e]));
    const lab = id => { const e = byId.get(id); return e ? e.lemma : id.split('.')[1]; };
    const formOf = id => byId.get(id)?.form ?? '';
    const pairRows = m.pairs.map(p => [esc(formOf(p.original)), esc(lab(p.original)), esc(lab(p.extended)), esc(MECHANISMS[p.kind] ?? p.kind)]);
    const kin = m.kinshipPairs.map(p => `${esc(lab(p.extended))} = ${esc(lab(p.original))} (${esc(formOf(p.original))})`);
    const col = m.colourPairs.map(p => `${esc(lab(p.extended))} = ${esc(lab(p.original))} (${esc(formOf(p.original))})`);
    const c = m.colours;
    return `<div class="card"><h3>Semantic structure</h3>
<p class="sub">The language does not give every English sense a root of its own. Some meanings share one word: the sense listed first is the older one, and the second was added by extension. Both are in the lexicon and the dictionary, with the same form.</p>
<h4>Words with more than one sense</h4>${pairRows.length ? plainTable(['Word', 'Original sense', 'Also means', 'Mechanism'], pairRows) : '<p class="sub">None in this vocabulary.</p>'}
<h4>Colour terms</h4><p class="sub">${c.terms} basic colour terms${c.terms <= 4 ? ' (an old-fashioned system: most colours are named by the nearest basic term)' : c.terms >= 9 ? ' (every colour of the dictionary has its own word)' : ''}.${col.length ? ` Not basic: ${col.join('; ')}.` : ''}</p>
<h4>Kinship</h4><p class="sub">${esc(m.kinship.label[0].toUpperCase() + m.kinship.label.slice(1))}.${kin.length ? ` ${kin.join('; ')}.` : ''}</p>
<h4>Figurative expressions</h4><p class="sub">Phrases whose meaning is not the sum of their words, with the language's own word order. The literal English is the gloss word for word.</p>${(m.idioms ?? []).length ? plainTable(['Expression', 'Literally', 'Means', 'IPA'], m.idioms.map(i => [`<span class="cl">${i.tokens.map(tokenHtml).join(' ')}</span>`, esc(i.en), esc(i.meaning), showIpa ? esc(flatTokens(i.tokens).map(w => ipaWord(w, curStress)).join(' ')) : '—'])) : '<p class="sub">None: the vocabulary lacks the words.</p>'}</div>`;
}
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
    const story = historyStory(lang);
    const storyHtml = story ? `<div class="card"><h3>History of the language</h3><p class="sub">${esc(story.intro)}</p><ol class="timeline">${story.events.map(e => `<li class="${e.kind}"><strong>c. ${e.years} years ago</strong> — ${esc(e.text)}</li>`).join('')}</ol><p class="sub">${esc(story.outro)}</p></div>` : '';
    return `${storyHtml}<div class="card"><h3>Mother language and sound changes</h3>
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
<div class="graph-grid">${cards}</div>${contrastHtml(s)}`;
}
function contrastHtml(s) {
    const c = s.loanContrast ?? [];
    if (!c.length) return '';
    return `<h4>Loanwords this language took and its sister did not</h4>
<p class="sub">The mother’s word survives in the sister (as with Italian <em>cane</em> from Latin <em>canis</em> against Spanish <em>perro</em>, a loan); in this language it was replaced by a word from another language.</p>
${tbl(['English', 'Mother', 'Sister (inherited)', 'This language (loan)', 'Donor', 'Entered'], c.map(x => [x.lemma, `*${x.mother}`, x.sister, x.daughter, `${x.donor} *${x.source}*`, `c. ${x.years} years ago`]))}`;
}

// ---- Writing tab ---------------------------------------------------------------------------------------------------
const sample = (lang, n) => lang.samples.slice(0, n).map(smp => {
    const flat = tokens => tokens.flatMap(t => t.kind === 'alts' ? flat(t.options[0]) : t.kind === 'word' ? [t.parts.map(p => p.text).join('')] : []);
    return { words: flat(smp.tokens), english: String(smp.english).replace(/\[([^|\]]+)(?:\|[^\]]*)*\]/g, '$1') };
}).filter(x => x.words.length);

const TECH_TXT = { stone: 'chiselled in stone', clay: 'pressed into clay with a stylus', brush: 'painted with a brush', pen: 'written with a broad pen', print: 'drawn with a uniform line' };
function graphicsText(W) {
    const g = W.graphics, bits = [`Tradition: ${TECH_TXT[g.tech] ?? g.tech}`, `${g.form} forms`];
    if (W.type === 'abugida') bits.push(g.strategy === 'marks' ? 'vowels as signs placed around the consonant' : 'vowels as strokes grown out of the consonant', g.headline ? 'headline joining the letters' : 'no headline');
    if (W.type === 'abjad') bits.push(g.cursive ? 'cursive with contextual forms' : 'non-joining letters');
    if (W.type === 'syllabary') bits.push(g.model === 'block' ? 'syllables as blocks (consonant part + vowel part)' : 'the vowel is the orientation of the consonant shape');
    if (W.type === 'alphabet' || W.type === 'abjad') bits.push(`letters in ${g.families.length} families by place and manner of articulation`);
    return bits.join('; ') + '.';
}
// A text typed by the user, written in the script. Words are given in the language's own transcription; numbers use the
// numerals of the language; with the lookup option an English word is replaced by the word of the dictionary.
export function writeTextHtml(lang, text, { choice = 'auto', direction = 'auto', pointed = true, lookup = true, numerals = {} } = {}) {
    setStress(stressOf(lang));
    const W = buildWriting(lang, choice, direction), N = buildNumberSigns(lang, W, numerals);
    const known = new Set([...W.letters.vowels, ...W.letters.consonants]);
    const byEnglish = new Map(), nativeForms = new Set(lang.lexicon.map(e => e.form));
    if (lookup) for (const e of lang.lexicon) { const k = label(e).toLowerCase(); if (!byEnglish.has(k)) byEnglish.set(k, e); }
    const rows = [], problems = [], lines = [];
    const chunk = W.boustrophedon ? 6 : Infinity;
    for (const raw of String(text).normalize('NFC').split(/\r?\n/)) {
        const items = [];
        for (const tok of raw.match(/[\p{L}\p{M}'’-]+|\d+/gu) ?? []) {
            if (/^\d+$/.test(tok)) {
                const n = Number(tok);
                if (tok.length > 12 || !Number.isSafeInteger(n)) { problems.push(`${tok.slice(0, 14)}…: number too long`); continue; }
                try { items.push({ html: `<span class="script-word">${N.write(n, 34)}</span>` }); rows.push([esc(tok), '', 'number']); } catch { problems.push(`${tok}: this number has no sign in the numerals of the language`); }
                continue;
            }
            const word = tok.toLowerCase().replace(/['’-]/g, '');
            if (!word) continue;
            let forms = [word], note = '';
            const bad = [...word].filter(ch => !known.has(ch));
            if (bad.length || (lookup && !nativeForms.has(word) && byEnglish.has(word))) {
                const e = byEnglish.get(word);
                if (e) { forms = e.form.split(' '); note = `dictionary: ${label(e)}`; }
                else { problems.push(`${tok}: ${[...new Set(bad)].join(' ')} ${bad.length > 1 ? 'are not letters' : 'is not a letter'} of this language${lookup ? ', and the word is not in the dictionary' : ''}`); continue; }
            }
            for (const f of forms) {
                try { W.wordSvg(f, 30, pointed); } catch { problems.push(`${f}: cannot be written in this script`); continue; }
                items.push(f); rows.push([esc(f), esc(ipaWord(f, stressOf(lang))), esc(note || (W.spelled(f) === f ? '' : `spelled ${W.spelled(f)}`))]);
            }
        }
        for (let i = 0; i < items.length; i += chunk) lines.push(items.slice(i, i + chunk));
    }
    const body = lines.filter(l => l.length).map((l, i) => W.line(l, i, 40, pointed)).join('');
    const table = rows.length ? `<div class="table-scroll"><table class="names-table"><thead><tr><th>Word</th><th>IPA</th><th>Note</th></tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
    const warn = problems.length ? `<ul class="notes">${problems.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    return `<div class="card"><div class="script-sentence">${body || '<p class="sub">Nothing to write.</p>'}</div>${warn}${table}<p class="sub">Written ${esc(W.direction === 'rtl' ? 'right to left' : 'left to right')}${W.boustrophedon ? ', boustrophedon' : ''}. Punctuation is not written.</p></div>`;
}

function cistercianHtml(N, sign, table) {
    const c = N.cistercian;
    const how = `${c.system === 'standard' ? 'Lines only: 1 and 2 are strokes at the top and below it, 3 and 4 the two diagonals, 5 is 4 and 1 together, 6 a vertical stub, 7 = 1 + 6, 8 = 2 + 6, 9 = 1 + 2 + 6.' : 'The early system: 1 and 2 are strokes, 3 and 4 have the shapes that the standard system gives to 7 and 8 (and the other way round), 5 and 6 are one and two dots, 9 is a triangle on the stave.'} A sign writes a number from 1 to 9999 on one stave: units at the top right, tens at the top left (mirrored), hundreds at the bottom right (turned over), thousands at the bottom left (both). An empty corner is a zero; there is no sign for the digit zero. The stave is ${c.orientation}${c.orientation === 'horizontal' ? ' (the vertical sign turned a quarter turn counterclockwise)' : ''}. Larger numbers are written as groups of four digits, the largest group first. The numbers are written in decimal, whatever the base of the spoken numerals.`;
    const rows = c.table.map(r => `<h5>${esc(r.label)}</h5><div class="sign-grid">${r.cells.map(x => sign(x.svg, String(x.v))).join('')}</div>`).join('');
    const ex = N.examples.map(e => [N.write(e.n, 44), String(e.n), esc(e.word), esc(ipaText(e.word))]);
    return `<h4>Numerals</h4><p class="sub">${esc(c.label)}. ${esc(how)}</p>${rows}<h5>Examples</h5>${table(['Written', 'Value', 'Spoken', 'IPA'], ex)}<p class="sub">Check: ${N.failures === 0 ? 'all sample numbers read back correctly' : `${N.failures} numbers do not read back`}.</p>`;
}

export function directionText(W, mode = 'auto') {
    const d = W.directionInfo, pct = x => `${(100 * x).toFixed(1)}%`, name = W.direction === 'rtl' ? 'right to left' : 'left to right';
    const how = W.boustrophedon ? `boustrophedon: the first line runs ${name}, the next one the opposite way with mirrored letters, and so on`
        : `${name}`;
    const why = mode === 'auto' ? ` Chosen from the age of the language (${d.age >= 0.75 ? 'ancient' : d.age >= 0.45 ? 'no clear era' : 'recent'}) and the kind of script: right-to-left odds ${pct(d.rtl)} (8.5% of living scripts, 21% of all scripts in Unicode, ancient ones more often), boustrophedon ${pct(d.share)}.` : ' Chosen by the user.';
    return `Written ${how}.${why}`;
}
export function writingHtml(lang, choice = 'auto', directionMode = 'auto', numeralOption = {}) {
    setStress(stressOf(lang));
    const W = buildWriting(lang, choice, directionMode);
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
    if (W.joined && W.forms) {
        const ex = consonants.slice(0, 4);
        ligHtml += `<h4>Joining forms</h4><p class="sub">A cursive hand: letters join along a baseline and change shape by position; some letters never join to the next one.</p>${table(['Letter', 'Isolated', 'Initial', 'Medial', 'Final'], ex.map(l => [esc(l), ...W.forms(l).map(f => f.svg)]))}`;
    }
    const N = buildNumberSigns(lang, W, numeralOption);
    const numHtml = (() => {
        if (N.cistercian) return cistercianHtml(N, sign, table);
        const MODE = { derived: 'derived from the script: same technology and radicals as the letters', autonomous: 'an independent system with its own technology and forms', counting: 'derived from tally counting: strokes grouped by fives, a separate sign for zero', imported: 'an independent system adapted to the script (its proportions and stroke weight)' };
        const how0 = `Glyphs are ${MODE[N.mode]}. `;
        const how = how0 + (N.restricted ? `This language counts only up to ${N.limit}: numbers are tally strokes, and anything larger is written with a single sign for “many”.`
            : N.composite ? `Base-${N.base} positional notation. Digits are made of dots (1) and bars (5) with a shell for zero; the digits are written left to right, largest place first.`
                : `Base-${N.base} positional notation with a glyph for every digit, zero included, written left to right, largest place first (also inside right-to-left text).`);
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
    const lines = sample(lang, 5).map(x => `<div class="script-sentence">${W.line(x.words, 0, 34, false)}<div class="sub">${esc(x.words.join(' '))} — ${esc(x.english)}</div></div>`).join('');
    const check = W.failures === 0 ? 'every word of the language reads back as it was written' : `${W.failures} words do not read back correctly`;
    return `<div class="card"><h3>${esc(WRITING_LABELS[W.type])}</h3>
<p class="sub">${esc(intro)} ${W.graphics ? esc(graphicsText(W)) : ''} The language is shown in Latin transcription everywhere else.</p>
<h4>Direction</h4><p class="sub">${esc(directionText(W, directionMode))}</p>
<h4>Signs</h4>${signs}
${ligHtml}${numHtml}
<h4>Reading rules</h4><ul class="notes">${rulesList.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
<p class="sub">Check: ${esc(check)}.</p>
<h4>Examples</h4>${table(W.type === 'abjad' ? ['Ordinary text', 'Pointed', 'Spoken', 'IPA', 'English'] : ['Script', 'Spoken', 'IPA', 'Spelled', 'English'], pick.map(e => W.type === 'abjad' ? [W.wordSvg(e.form, 38, false), W.wordSvg(e.form), esc(e.form), esc(ipaText(e.form)), esc(label(e))] : [W.wordSvg(e.form), esc(e.form), esc(ipaText(e.form)), esc(W.spelled(e.form) === e.form ? '—' : W.spelled(e.form)), esc(label(e))]))}
<h4>Sample sentences</h4>${lines}${W.boustrophedon ? `<p class="sub">Boustrophedon: the same sentence on two consecutive lines, the second one reversed and mirrored.</p><div class="script-sentence">${(() => { const x = sample(lang, 8).sort((p, q) => q.words.length - p.words.length)[0]; return x ? W.line(x.words, 0, 34, false) + W.line(x.words.slice().reverse(), 1, 34, false) : ''; })()}</div>` : ''}</div>`;
}
