// HTML builders for the generator page. Pure: (language) -> string. No DOM access.
import { esc } from '../core/text.js';
import { label } from '../lexicon/schema.js';
import { inflect, genderOf } from '../morphology/inflect.js';

export const PHONOTACTIC_INFO = {
    isolated: { title: 'Minimalist Isolating Pattern (Hawaiian-type)', description: 'The pattern categorically excludes consonant clusters and reduces the syllable to its minimum.', pattern: '(C)V' },
    japanese: { title: 'Controlled Open Syllable Pattern (Japanese-type)', description: 'Allows minimal onsets and only the nasal in the coda, producing clean internal transitions.', pattern: '(C)(G)V(N)' },
    european: { title: 'Balanced European Pattern (Italian / Finnish-type)', description: 'Balances open and closed syllables, distributing consonants and vowels for a smooth and stable phonotactic profile.', pattern: '(S)(C)(L/G)V(L/N/S)' },
    english: { title: 'Dynamic Anglo-Saxon Pattern (English-type)', description: 'Allows extensive consonant clusters in both onsets and codas, with strong vowel compression.', pattern: '(S)(C)(L/G)V(L/N)(C)(S)' },
    slavic: { title: 'Compact Slavic Pattern (Croatian / Polish-type)', description: 'Allows dense consonant structures and permits liquids to function as syllable nuclei.', pattern: '(C)(C)(C)(V/L)(C)(C)(C)' },
    semitic: { title: 'Semitic Root-and-Pattern Model (Arabic-type)', description: 'Uses a rigid alternation that prevents both consonant and vowel accumulation.', pattern: 'CV(C)' }
};

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
    notes.push('Case endings attach directly to the lexical stem, never to an already inflected form.');
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

const tokenHtml = t => t.kind === 'alts'
    ? `[${t.options.map(o => o.map(tokenHtml).join(' ')).join('|')}]`
    : `<span class="sample-word" data-meaning="${esc(t.gloss)}">${t.parts.map(p => p.kind === 'stem' ? esc(p.text) : `<span class="morph-ending">${esc(p.text)}</span>`).join('')}</span>`;

export function samplesHtml(lang) {
    const pills = lang.samples.map(s => `<div class="sample-pill"><div class="en"><b>${s.number}.</b> ${esc(s.english)}</div><div class="cl"><b>${s.number}.</b> ${s.tokens.map(tokenHtml).join(' ')}</div></div>`).join('');
    const sk = lang.skippedSamples.length ? `<div class="morph-note">${lang.skippedSamples.length} sentence(s) skipped because the lexicon lacks: ${esc([...new Set(lang.skippedSamples.map(s => s.missing))].join(', '))}.</div>` : '';
    const s = lang.syntax;
    return `<div class="sample-frame"><h3>Sample sentences</h3><div class="morph-note">Word order ${esc(s.order)} · ${s.adpositionPosition === 'before' ? 'prepositions' : 'postpositions'} · adjective ${esc(s.adjectivePosition)} the noun</div>${pills}${sk}</div>`;
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
    const chips = [s.region[0], s.culture[0], s.biome[0], s.order].filter(Boolean);
    const notes = lang.notes.length ? `<div class="card"><h3>Adjusted options</h3>${lang.notes.map(n => `<div class="morph-note">${esc(n)}</div>`).join('')}</div>` : '';
    return `<div class="hero"><div><div class="lang-name">Name of language: ${esc(lang.name)}</div><div class="chips">${chips.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div><div class="sub">Seed: <code id="used-seed">${esc(s.seed)}</code> <button type="button" class="btn ghost" id="keep-seed">Use this seed</button></div></div><div class="status">${lang.lexicon.length} lexical entries</div></div><div class="grid">${morphemeInventoryHtml(lang)}${nominalCategoriesHtml(lang)}${notes}</div>`;
}
