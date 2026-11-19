// Description of a language in the manner of an encyclopedia entry: infobox, lead and sections. Pure and deterministic:
// everything comes from the language object (spec, phonology, history, writing, syntax strategies, lexicon, texts), and the few
// facts that a generator cannot know (number of speakers, region, status, code) are invented from the seed within what the
// genre, era, culture and biome allow. No text is written by a model: sentences are templates with 3-5 variants each.
//
// Inline markers inside the strings, resolved by the renderers (render.js, wikitext.js):
//   ⟦s|section-id|text⟧  link to a section of the entry      ⟦t|Wikipedia title|text⟧  linguistic term
//   ⟦p|Page title|text⟧  page of the wiki that does not exist (region, people, mother language, sister language)
import { rng, pick } from '../core/rng.js';
import { GENRES } from '../genres.js';
import { historyStory } from '../history/story.js';
import { buildWriting, WRITING_LABELS } from '../writing/system.js';
import { generateNames } from '../names.js';
import { languageName } from '../engine.js';
import { STRESS_SYSTEMS, ipaWord, stressOf } from '../ipa.js';
import { tokenText } from '../syntax/realize.js';
import { NUMERAL_LABELS } from '../numerals/choose.js';

const S = (id, text) => `⟦s|${id}|${text}⟧`;
const T = (title, text = title) => `⟦t|${title}|${text}⟧`;
const P = (title, text = title) => `⟦p|${title}|${text}⟧`;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const list = a => a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`;
const num = n => n.toLocaleString('en');
const plain = s => String(s).replace(/⟦[a-z]\|[^|⟧]*\|([^⟧]*)⟧/g, '$1');
export { plain as plainText };

// ---- facts that are invented from the seed ----
const ERA_SPEAKERS = { prehistoric: [300, 4000], ancient: [5000, 400000], medieval: [20000, 3000000], renaissance: [100000, 6000000], modern: [500000, 80000000], futuristic: [2000000, 900000000] };
const ERA_SETTLEMENT = { prehistoric: 'camps and seasonal settlements', ancient: 'villages and a few walled towns', medieval: 'villages, market towns and fortified seats', renaissance: 'market towns and ports', modern: 'towns and cities', futuristic: 'cities and habitats' };
const BIOME = { alpine: 'high alpine valleys', arctic: 'ice and arctic coast', desert: 'desert oases and caravan routes', forest: 'forests', freshwater: 'lakes and rivers', grassland: 'open grassland', mountain: 'mountain ranges', ocean: 'islands and coasts', savanna: 'savanna', space: 'orbital habitats and stations', temperate: 'temperate lowlands', tropical: 'tropical lowlands', tundra: 'tundra', wetland: 'marshes and wetlands' };
const TECH = { stone: 'carved in stone', clay: 'pressed into clay', brush: 'painted with a brush', pen: 'written with a pen', print: 'set in type' };
const CULTURE_FACTOR = { nomadic: 0.2, tribal: 0.2, hunter_gatherer: 0.1, shamanic: 0.3, animist: 0.4, sisterhood: 0.05, occult: 0.1, monastic: 0.1, urban: 2, imperial: 2.5, industrial: 2, post_industrial: 2, colonial: 1.8, bureaucratic: 1.6 };
const BIOME_FACTOR = { arctic: 0.3, tundra: 0.3, desert: 0.5, alpine: 0.5, space: 1 };
const GENRE_STATUS = {
    sacred: { kind: 'liturgical', text: 'Liturgical language: used in worship and learning, with no community of native speakers.' },
    undead: { kind: 'extinct', text: 'Extinct as a spoken language; it survives in ritual use.' },
    thieves: { kind: 'secret', text: 'A secret cant, not taught outside the trade.' },
    women: { kind: 'secret', text: 'A secret language, handed down between women and not taught to outsiders.' },
    machine: { kind: 'machine', text: 'Working language of machines, learned by human operators as a second language.' },
    merchant: { kind: 'trade', text: 'Language of trade, widely used as a second language.' },
    war: { kind: 'military', text: 'Language of command in the armies of the speakers.' }
};
const GENRE_SCALE = { thieves: 0.02, women: 0.02, machine: 0.5, merchant: 0.6, war: 0.2, giant: 0.1, draconic: 0.01, infernal: 0.02, arcane: 0.03 };
const ORDER = { SVO: ['Subject–verb–object', 'subject–verb–object'], SOV: ['Subject–object–verb', 'subject–object–verb'], VSO: ['Verb–subject–object', 'verb–subject–object'], VOS: ['Verb–object–subject', 'verb–object–subject'], OSV: ['Object–subject–verb', 'object–subject–verb'], OVS: ['Object–verb–subject', 'object–verb–subject'] };

const roundSig = (n, d = 2) => { if (n < 10) return Math.round(n); const p = 10 ** (Math.floor(Math.log10(n)) - d + 1); return Math.round(n / p) * p; };
const approx = n => n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '')} million` : num(n);

function invent(lang) {
    const { spec } = lang, r = rng(`${spec.seed}|description`), G = lang.genre ? GENRES[lang.genre.id] : null;
    const eras = Object.keys(ERA_SPEAKERS);
    const era = spec.era[0] ?? G?.profile?.era ?? pick(['ancient', 'medieval', 'medieval', 'renaissance', 'modern'], r);
    const culture = spec.culture[0] ?? G?.profile?.culture ?? null;
    const biome = spec.biome[0] ?? G?.profile?.biome ?? (era === 'futuristic' && culture === 'spacefaring' ? 'space' : pick(Object.keys(BIOME).filter(b => b !== 'space'), r));
    const [lo, hi] = ERA_SPEAKERS[eras.includes(era) ? era : 'medieval'];
    let l1 = Math.exp(Math.log(lo) + r() * (Math.log(hi) - Math.log(lo)));
    l1 *= (CULTURE_FACTOR[culture] ?? 1) * (BIOME_FACTOR[biome] ?? 1) * (GENRE_SCALE[lang.genre?.id] ?? 1);
    const status = GENRE_STATUS[lang.genre?.id] ?? null;
    const donors = lang.history?.loans?.donors ?? [];
    const spread = donors.some(d => d.role === 'conqueror' || d.role === 'trade') ? 0.3 + r() * 1.7 : 0.05 + r() * 0.3;
    let nativeSpeakers = status?.kind === 'liturgical' || status?.kind === 'extinct' || status?.kind === 'machine' ? 0 : Math.max(20, roundSig(l1));
    const l2 = Math.max(status ? 100 : 0, roundSig((nativeSpeakers || l1) * spread * (status?.kind === 'liturgical' ? 0.6 : 1)));
    let vitality = 'Safe';
    if (status) vitality = status.kind === 'extinct' ? 'Extinct' : status.kind === 'secret' ? 'Vulnerable' : 'Safe';
    else {
        const v = r();
        vitality = nativeSpeakers < 3000 ? (v < 0.5 ? 'Severely endangered' : 'Endangered') : nativeSpeakers < 60000 ? (v < 0.4 ? 'Endangered' : v < 0.75 ? 'Vulnerable' : 'Safe') : (v < 0.2 ? 'Vulnerable' : 'Safe');
    }
    const code = `q${'abcdefghijklmnopqrst'[Math.floor(r() * 20)]}${'abcdefghijklmnopqrstuvwxyz'[Math.floor(r() * 26)]}`;
    const places = generateNames(lang, { kind: 'place', count: 4, salt: 'description' });
    return { r, era, culture, biome, nativeSpeakers, l2, status, vitality, code, places };
}

const V = (r, options) => pick(options, r);
const cultureText = c => c ? c.replace(/_/g, ' ') : null;

function phonologySection(lang, id, r) {
    const ph = lang.phonology, used = ph.used, inv = lang.history?.inventory ?? { gained: [], lost: [] };
    const stress = STRESS_SYSTEMS.find(s => s.id === ph.stress)?.text ?? ph.stress;
    const paras = [];
    paras.push(V(r, [
        `${cap(lang.name)} has ${used.consonants.length} consonant and ${used.vowels.length} vowel letters. The consonants are ${used.consonants.join(' ')}; the vowels are ${used.vowels.join(' ')}.`,
        `The spelling distinguishes ${used.consonants.length} consonants (${used.consonants.join(' ')}) and ${used.vowels.length} vowels (${used.vowels.join(' ')}).`,
        `The sound system is written with ${used.consonants.length} consonants (${used.consonants.join(' ')}) and ${used.vowels.length} vowels (${used.vowels.join(' ')}).`
    ]));
    const clusters = [...(ph.clusters ?? []), ...(ph.codaClusters ?? [])];
    paras.push(`Syllables have the shapes ${ph.patterns.join(', ')}; ${ph.clusters?.length ? `word-initial clusters such as ${ph.clusters.slice(0, 4).join(', ')} are allowed` : 'there are no word-initial clusters'}${ph.codaClusters?.length ? ` and so are final clusters such as ${ph.codaClusters.slice(0, 3).join(', ')}` : clusters.length ? '' : ', and no final clusters'}. Words average about ${ph.meanSyllables} syllables (${ph.lengthProfile} words). Phonotactics follow the ${ph.name} pattern.`);
    paras.push(V(r, [`Word stress: ${stress}.`, `Stress is regular: ${stress}.`]));
    if (inv.gained.length || inv.lost.length) paras.push(`Compared with the earlier language, the sound system ${inv.gained.length ? `gained ${inv.gained.join(' ')}` : ''}${inv.gained.length && inv.lost.length ? ' and ' : ''}${inv.lost.length ? `lost ${inv.lost.join(' ')}` : ''}. See ${S('history', 'Classification and history')}.`);
    return { id, title: 'Phonology', paragraphs: paras };
}

const an = (w, shown = w) => `${/^[aeiou]/i.test(w) ? 'an' : 'a'} ${shown}`;
function writingSection(lang, W, id, r) {
    const kind = WRITING_LABELS[W.type].toLowerCase();
    const unit = W.type === 'syllabary' ? 'signs' : 'letters';
    const n = W.type === 'syllabary' ? W.letters.syllables.length : W.type === 'abugida' ? W.letters.consonants.length : W.letters.base.length;
    const dir = W.boustrophedon ? 'in boustrophedon, with alternate lines running in opposite directions' : W.direction === 'rtl' ? 'from right to left' : 'from left to right';
    const term = T(WRITING_LABELS[W.type], kind);
    const p = [];
    p.push(V(r, [
        `${cap(lang.name)} is written with ${an(kind, term)} of ${n} basic ${unit}, ${dir}.`,
        `The native script is ${an(kind, term)} with ${n} basic ${unit}; lines run ${dir}.`,
        `Writing uses ${an(kind, term)} (${n} basic ${unit}) written ${dir}.`
    ]));
    if (W.type === 'abjad') p.push('Only consonants and a few vowel letters are written; the reader supplies the other vowels, which are marked with points in teaching, sacred and poetic texts.');
    if (W.type === 'abugida') p.push(`Each consonant letter carries the inherent vowel ${W.inherent}; other vowels are written with signs attached to the letter.`);
    p.push(`The signs have ${an(W.tradition?.form ?? W.style)} design${W.tradition?.tech ? ` and are ${TECH[W.tradition.tech]}` : ''}${W.joined ? '; letters are joined within the word' : ''}.`);
    if (W.ruleText.length) p.push(`Spelling is phonemic except for ${W.ruleText.length === 1 ? 'one convention' : `${W.ruleText.length} conventions`}: ${W.ruleText.map(x => x.replace(/\.$/, '')).join('; ')}.`);
    else p.push('Spelling is fully phonemic.');
    p.push(`Numbers have their own ${T('Numeral system', 'numeral system')} (see ${S('vocabulary', 'Vocabulary')}). The Writing tab shows the full set of signs.`);
    return { id, title: 'Writing system', paragraphs: p };
}

const ALIGN = { 'nominative-accusative': 'nominative–accusative', 'ergative-absolutive': 'ergative–absolutive' };
function grammarSection(lang, id, r) {
    const { spec, syntax } = lang, m = lang.morphology.model, aff = lang.morphology.affixes;
    const sub = [];
    const [orderTitle, orderLow] = ORDER[spec.order];
    const morphTitle = { isolating: 'Isolating language', agglutinative: 'Agglutination', fusional: 'Fusional language' }[spec.morphology];
    const intro = V(r, [
        `${cap(lang.name)} is ${an(spec.morphology, T(morphTitle, spec.morphology))} language with ${T(orderTitle, orderLow)} basic word order. ${cap(syntax.adjectivePosition)} the noun is where adjectives stand, and the language uses ${syntax.adpositionPosition === 'before' ? 'prepositions' : 'postpositions'}.`,
        `The basic word order is ${T(orderTitle, orderLow)}. The language is ${T(morphTitle, spec.morphology)}; adjectives ${syntax.adjectivePosition === 'after' ? 'follow' : 'precede'} the noun and it has ${syntax.adpositionPosition === 'before' ? 'prepositions' : 'postpositions'}.`,
        `Grammatically, ${cap(lang.name)} is ${T(morphTitle, spec.morphology)}, with ${T(orderTitle, orderLow)} order, ${syntax.adjectivePosition === 'after' ? 'adjectives after' : 'adjectives before'} the noun and ${syntax.adpositionPosition === 'before' ? 'prepositions' : 'postpositions'}.`
    ]);
    const nouns = [];
    nouns.push(spec.numbers.length > 1 ? `Nouns are marked for ${T('Grammatical number', 'number')} (${spec.numbers.join(', ')})${spec.plural === 'prefix' ? ', the plural by a prefix' : spec.plural === 'suffix' ? ', the plural by a suffix' : ''}.` : 'Nouns are not marked for number.');
    nouns.push(spec.genders.length ? `There are ${spec.genders.length} ${T('Grammatical gender', 'genders')}: ${spec.genders.join(', ')}.` : 'There is no grammatical gender.');
    nouns.push({ none: 'There are no articles.', both: 'Definite and indefinite articles are used.', definite: 'There is a definite article only.', indefinite: 'There is an indefinite article only.', partitive: 'There are definite, indefinite and partitive articles.' }[spec.articles]);
    if (m.cases.length) nouns.push(`Relations are expressed by ${T('Grammatical case', 'case')} (${m.cases.join(', ')}) in ${an(ALIGN[m.alignment] ?? m.alignment, T(m.alignment === 'ergative-absolutive' ? 'Ergative–absolutive alignment' : 'Nominative–accusative alignment', ALIGN[m.alignment] ?? m.alignment))} pattern.`);
    else nouns.push(`Relations are expressed by ${syntax.adpositionPosition === 'before' ? 'prepositions' : 'postpositions'}; nouns do not take case endings.`);
    if (aff.additive) nouns.push(spec.morphology === 'isolating' ? `The additive “also” is a separate particle, ${aff.additive}, placed after the word it applies to.` : `The additive clitic “also”, -${aff.additive}, closes the word after every other ending.`);
    const verbs = [];
    const v = aff.verb;
    verbs.push(spec.morphology === 'isolating' ? 'Verbs do not inflect; tense, aspect and negation are marked with particles.' : 'Verbs are inflected for tense and agree with their subject in person and number' + (syntax.prodrop ? '; subject pronouns are dropped because the verb carries the person.' : '; subject pronouns are always expressed.'));
    const loc = syntax.localText, val = syntax.valencyText, sb = syntax.subordinationText, inf = syntax.informationText;
    if (val) verbs.push(`Valency changes: passive — ${val.passive}; antipassive — ${val.antipassive}; causative — ${val.causative}; applicative — ${val.applicative}.`);
    if (loc) verbs.push(`Prohibition is expressed by ${loc.prohibitive}. ${cap(loc.evidentiality === 'not marked' ? 'Evidentiality is not marked' : `${T('Evidentiality')}: ${loc.evidentiality}`)}. Politeness: ${loc.register}.`);
    const syn = [];
    if (sb) syn.push(`Subordination — complement clauses: ${sb.complement}; adverbial clauses: ${sb.adverbial}; ${T('Converb', 'converbs')}: ${sb.converb}. ${T('Reported speech')}: ${sb.reported}; quotation: ${sb.quotative}.`);
    if (loc) syn.push(`Questions: ${loc.wh} (${T('Wh-movement', 'wh-words')}). ${cap(loc.tenseSequence)}.`);
    if (inf) syn.push(`Demonstratives: ${inf.demonstratives}. Reflexives: ${inf.reflexive}. Topic: ${inf.topic}. Focus: ${inf.focus}.`);
    return { id, title: 'Grammar', paragraphs: [intro], subsections: [{ title: 'Nouns', paragraphs: nouns }, { title: 'Verbs', paragraphs: verbs }, { title: 'Syntax', paragraphs: syn }] };
}

function vocabularySection(lang, id, r) {
    const d = lang.derivation?.stats, h = lang.history, lo = h?.loans, sem = lang.semantics, p = [];
    p.push(V(r, [
        `The generated lexicon holds ${num(lang.lexicon.length)} words.${d ? ` Of these, ${num(d.applied)} are derived or compound words built from other words of the language.` : ''}`,
        `The lexicon has ${num(lang.lexicon.length)} entries${d ? `, ${num(d.applied)} of them formed by derivation or compounding` : ''}.`
    ]));
    if (lo) p.push(`${T('Loanword', 'Loanwords')} make up about ${Math.round(lo.share * 100)}% of the vocabulary, borrowed from ${lo.donors.length === 1 ? 'one language' : `${lo.donors.length} languages`}: ${list(lo.donors.map(x => P(x.name)))}.`);
    if (sem?.colours) p.push(`The language has ${sem.colours.terms} basic colour terms.`);
    if (sem?.kinship) p.push(`Kinship terms are ${sem.kinship.id === 'descriptive' ? 'descriptive: each relative has a word of its own' : 'classificatory: relatives are grouped under shared terms'}.`);
    const c = lang.numerals.config;
    p.push(`Counting is ${T('Numeral system', NUMERAL_LABELS[c.type].toLowerCase())}, with the numeral ${c.position === 'before' ? 'before' : 'after'} the noun${c.classifiers ? ' and obligatory classifiers' : ''}.`);
    if (lang.calendar) p.push(`Its calendar has ${lang.calendar.months.length ? `${lang.calendar.months.length} named months` : 'no named months'}${lang.calendar.week.length ? ` and a week of ${lang.calendar.week.length} named days` : ''}; the year is ${lang.calendar.yearLength}.`);
    return { id, title: 'Vocabulary', paragraphs: p };
}

// The first text of the language, as a table of lines
function sampleSection(lang, id) {
    const text = lang.texts?.[0];
    if (!text) return null;
    const rows = text.lines.map(l => ({ speaker: l.speaker ?? null, native: tokenText(l.tokens), english: l.en }));
    return { id, title: 'Sample text', paragraphs: [`“${text.title}”, a ${text.kind === 'dialogue' ? 'dialogue' : 'short narrative'} in ${cap(lang.name)}, with an English translation. More texts are in the Texts tab.`], sample: { title: text.title, rows } };
}

export function describeLanguage(lang, opts = {}) {
    const f = invent(lang), r = f.r, spec = lang.spec;
    const Name = cap(lang.name), story = lang.history ? historyStory(lang) : null;
    const proto = `Proto-${Name}`, sisterName = cap(languageName({ ...spec, seed: `${spec.seed}|sister-name` }));
    const region = f.places[0], towns = f.places.slice(1, 4);
    const W = buildWriting(lang, opts.writing ?? 'auto', opts.direction ?? 'auto');
    const [orderTitle, orderLow] = ORDER[spec.order];
    const align = lang.morphology.model.alignment;
    const landscape = BIOME[f.biome] ?? f.biome;
    const place = `${P(region.name)}, a land of ${landscape}`;
    const speakersText = f.nativeSpeakers ? `${approx(f.nativeSpeakers)} native speakers${f.l2 ? `, plus about ${approx(f.l2)} second-language speakers` : ''}` : f.l2 ? `no native speakers; about ${approx(f.l2)} users` : 'no living speakers';
    const sentences = [];

    // lead
    const typ = `${T(spec.morphology === 'isolating' ? 'Isolating language' : spec.morphology === 'fusional' ? 'Fusional language' : 'Agglutination', spec.morphology)} ${T(orderTitle, orderLow)}`;
    const lead = [];
    lead.push(V(r, [
        `${Name} is ${an('constructed')} ${typ} language of the ${P(Name + ' people')}${f.status?.kind === 'liturgical' ? ', used in worship and learning' : `, spoken in ${place}`}.`,
        `${Name} is ${an('constructed')} ${typ} language ${f.status?.kind === 'liturgical' ? 'used in the liturgy of' : 'spoken in'} ${place}${f.nativeSpeakers ? ` by the ${P(Name + ' people')}` : ''}.`,
        `${Name} is ${an('constructed')} ${typ} language${f.status ? '' : ` of the ${P(Name + ' people')}`}, ${f.status?.kind === 'liturgical' ? 'preserved in ritual in' : 'spoken in'} ${place}.`
    ]));
    lead.push(f.status ? f.status.text : V(r, [
        `It has ${speakersText}, and its vitality is ${f.vitality.toLowerCase()}.`,
        `Estimates put the language at ${speakersText}; it is classed as ${f.vitality.toLowerCase()}.`,
        `The language has ${speakersText}; it is ${f.vitality.toLowerCase()}.`
    ]));
    lead.push(V(r, [
        `It descends from ${P(proto)} and has a sister language, ${P(sisterName)}. See ${S('history', 'Classification and history')}.`,
        `${Name} and ${P(sisterName)} both descend from ${P(proto)}. See ${S('history', 'Classification and history')}.`,
        `${P(proto)} is its ancestor; ${P(sisterName)} is its sister. See ${S('history', 'Classification and history')}.`
    ]));
    lead.push(V(r, [
        `The language is written ${W.type === 'alphabet' ? 'with an alphabet' : `with ${WRITING_LABELS[W.type].toLowerCase() === 'abjad' ? 'an abjad' : WRITING_LABELS[W.type].toLowerCase() === 'abugida' ? 'an abugida' : 'a syllabary'}`} of its own (${S('writing', 'Writing system')}).`,
        `It has a native script, ${W.type === 'abjad' ? 'an abjad' : W.type === 'abugida' ? 'an abugida' : W.type === 'syllabary' ? 'a syllabary' : 'an alphabet'} (${S('writing', 'Writing system')}).`
    ]));

    // infobox
    const speakers = [];
    if (f.nativeSpeakers) speakers.push(`L1: ${approx(f.nativeSpeakers)}`);
    if (f.l2) speakers.push(`L2: ${approx(f.l2)}`);
    const dirText = W.boustrophedon ? 'boustrophedon' : W.direction === 'rtl' ? 'right to left' : 'left to right';
    const info = [
        ['Native name', Name],
        ['Region', `${P(region.name)} (${landscape})`],
        ['Ethnicity', P(`${Name} people`)],
        ['Native speakers', f.nativeSpeakers ? speakers.join('; ') : `none${f.l2 ? `; about ${approx(f.l2)} users` : ''}`],
        ['Language family', `Constructed › ${P(proto)} › ${Name}`],
        ['Early form', `${P(proto)} (c. ${story?.split ?? '?'} years ago)`],
        ['Sister language', P(sisterName)],
        ['Writing system', `${WRITING_LABELS[W.type]}, ${dirText}`],
        ['Word order', T(orderTitle)],
        ['Alignment', align === 'ergative-absolutive' ? T('Ergative–absolutive alignment', 'ergative–absolutive') : align === 'nominative-accusative' && lang.morphology.model.cases.length ? T('Nominative–accusative alignment', 'nominative–accusative') : 'none (adpositions)'],
        ['Status', f.status ? f.status.text.replace(/\.$/, '') : f.vitality],
        ['Language codes', `${f.code} (private-use range qaa–qtz; invented)`]
    ];

    const sections = [];
    // history
    const hist = [];
    if (story) {
        hist.push(V(r, [
            `${Name} is the daughter of ${P(proto)}, the language reconstructed as its mother. About ${story.split} years ago the community of ${P(proto)} divided: one part's speech became ${Name}, the other's ${P(sisterName)}, which went through ${lang.history.sister.rules?.length ?? 0} changes of its own.`,
            `The ancestor of ${Name} is ${P(proto)}. The speech community split about ${story.split} years ago, one branch becoming ${Name} and the other ${P(sisterName)} (${lang.history.sister.rules?.length ?? 0} changes of its own).`
        ]));
        const h = lang.history, first = h.rules[0], last = h.rules.at(-1);
        hist.push(`${Name} departs from its mother through ${h.stats.rules} ordered ${T('Sound change', 'sound changes')}. The earliest, c. ${first.years} years ago, was ${first.label}${first.example ? ` (${first.example})` : ''}; the most recent, c. ${last.years} years ago, was ${last.label}${last.example ? ` (${last.example})` : ''}. ${h.stats.unchanged} of ${h.stats.words} inherited words are still identical to the mother's, and ${h.stats.words - h.stats.unchanged} have changed.`);
        const contacts = story.events.filter(e => e.kind === 'contact');
        if (contacts.length) hist.push(`Contacts with other peoples left their mark. ${contacts.map(e => e.text).join(' ')}`);
        hist.push('The full table of changes, the loanwords and the comparison with the sister language are in the History tab.');
    } else hist.push('No history is recorded for this language.');
    sections.push({ id: 'history', title: 'Classification and history', paragraphs: hist });

    // geography
    const geo = [];
    const cul = cultureText(f.culture);
    geo.push(V(r, [
        `${Name} is ${f.status?.kind === 'liturgical' ? 'used' : 'spoken'} in ${place}${cul ? `, in a ${cul} society` : ''}, where the settlements are ${ERA_SETTLEMENT[f.era] ?? 'villages and towns'}.`,
        `The ${Name}-speaking area lies in ${place}${cul ? `; the society is ${cul}` : ''}. The settlements are ${ERA_SETTLEMENT[f.era] ?? 'villages and towns'}.`
    ]));
    geo.push(`Place names in the language include ${list(towns.map(t => `${P(t.name)}${t.meaning ? ` (“${t.meaning.replace(/-/g, ' ')}”)` : ''}`))}. The region itself, ${P(region.name)}${region.meaning ? ` (“${region.meaning.replace(/-/g, ' ')}”)` : ''}, gives its name to the area.`);
    geo.push(f.status ? f.status.text : V(r, [
        `The language has ${speakersText}. Its vitality is assessed as ${f.vitality.toLowerCase()}.`,
        `Estimates give ${speakersText}; the language is ${f.vitality.toLowerCase()}.`,
        `${cap(speakersText)}. Vitality: ${f.vitality.toLowerCase()}.`
    ]));
    geo.push('The speaker figures and the region are invented for this entry from the genre, era, culture and biome; they are not computed from the language.');
    sections.push({ id: 'distribution', title: 'Geographic distribution and status', paragraphs: geo });

    sections.push(phonologySection(lang, 'phonology', r));
    sections.push(writingSection(lang, W, 'writing', r));
    sections.push(grammarSection(lang, 'grammar', r));
    sections.push(vocabularySection(lang, 'vocabulary', r));
    const sample = sampleSection(lang, 'sample');
    if (sample) sections.push(sample);

    const ipa = ipaWord(lang.name, stressOf(lang));
    return { title: Name, native: Name, ipa: `/${ipa}/`, code: f.code, infobox: info, lead, sections, facts: { era: f.era, culture: f.culture, biome: f.biome, nativeSpeakers: f.nativeSpeakers, secondSpeakers: f.l2, vitality: f.vitality, region: region.name, proto, sisterName, status: f.status?.kind ?? null }, categories: ['Constructed languages', `${cap(spec.morphology)} languages`, `${orderTitle} languages`] };
}
