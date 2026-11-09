// One-off migration: vocabulary v1 ({concept, category, word_type, scope, ...}) -> schema v2.
// Usage: node tools/migrate-vocabulary.mjs <old.json> <new.json> [report.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { SCHEMA_VERSION, validateVocabulary, closeRelations } from '../src/lexicon/schema.js';

const [src, dst, reportPath] = process.argv.slice(2);
if (!src || !dst) { console.error('usage: node tools/migrate-vocabulary.mjs <old.json> <new.json> [report.json]'); process.exit(2); }
const old = JSON.parse(readFileSync(src, 'utf8')).vocabulary;
const report = { dropped_tags: {}, retagged: [], transitivity_set: 0, notes: [] };

const POS_MAP = { noun: 'noun', verb: 'verb', adjective: 'adjective', adverb: 'adverb', pronoun: 'pronoun', determiner: 'determiner',
    number: 'numeral', numeral: 'numeral', quantifier: 'quantifier', preposition: 'adposition', adposition: 'adposition',
    conjunction: 'conjunction', particle: 'particle', function: 'auxiliary' };
const DOMAIN_MAP = { verb: 'action', adjective: 'quality', function_word: 'grammar', pronoun: 'grammar', interrogative: 'grammar',
    demonstrative: 'grammar', number_quantity: 'number', number: 'number', person: 'society', reproduction: 'body' };
// Core = the senses the sample sentences and the morphology examples depend on (lemma -> required pos).
const CORE = new Map();
const core = (pos, words) => words.split(' ').forEach(w => CORE.set(w, pos));
core('noun', 'friend sister father enemy hunter farmer hand water food bread milk sword house tree boat village city forest way road sun moon stone wolf dog horse bird fish today tomorrow yesterday');
core('verb', 'be have eat drink see touch kill hunt love trust help fear go come rise fall move walk stay sleep want work travel enter know exist build hurt do make');
core('adjective', 'good hot cold bright dark small large hungry ready many');
core('adverb', 'here there up down where why how');
core('determiner', 'my your this that the a much little all');
core('pronoun', 'i you we they me who what nothing everything');
core('particle', 'not can');
core('adposition', 'to from with in');
core('conjunction', 'when');
const GRAMMAR_POS = new Set(['pronoun', 'adposition', 'conjunction', 'determiner', 'particle', 'auxiliary']);
const TAG_SYNONYM = { animals: 'animal', relationships: 'relationship', emotion_and_feeling: 'emotion', time_and_change: 'time_change' };
const DROP_TAGS = new Set(['universal', 'entity', 'verb', 'adjective', 'function_word', 'grammar', 'number', 'quantity', 'natural_element_dup']);

const INTRANSITIVE = new Set(['go', 'come', 'rise', 'fall', 'walk', 'stay', 'sleep', 'work', 'travel', 'enter', 'exist', 'run', 'sit', 'stand', 'live', 'die', 'sing', 'dance', 'laugh', 'cry', 'swim', 'fly', 'arrive', 'leave', 'wait', 'rain', 'snow', 'grow', 'move', 'wake', 'rest', 'smile', 'hurt', 'begin', 'end', 'stop']);
const TRANSITIVE = new Set(['do', 'have', 'eat', 'drink', 'see', 'touch', 'kill', 'hunt', 'love', 'trust', 'help', 'fear', 'know', 'want', 'build', 'find', 'lose', 'open', 'close', 'cut', 'break', 'catch', 'choose', 'decide', 'hold', 'keep', 'carry', 'bring', 'take', 'make', 'hear', 'smell', 'taste', 'follow', 'attack', 'defend', 'learn', 'teach', 'understand', 'remember', 'forget', 'like', 'wash', 'cook', 'call', 'visit', 'respect', 'marry', 'push', 'pull', 'throw', 'burn', 'plant', 'draw', 'write', 'read', 'buy', 'sell', 'use', 'lead']);
const DITRANSITIVE = new Set(['give', 'send', 'show', 'tell', 'offer', 'teach']);
const HUMAN_NOUNS = /^(family|social)\./;

const clean = s => s.trim();
const seenTags = {};

const out = old.map(e => {
    let lemma = e.concept.trim();
    let gloss;
    const m = /^(.*?)\s*\(([^)]+)\)$/.exec(lemma);
    if (m) { lemma = m[1].trim(); gloss = m[2].trim(); }
    lemma = lemma.replace(/^to\s+/i, '');
    if (e.id === 'pronoun.second_person_plural') { lemma = 'you'; gloss = 'plural'; }
    if (e.id === 'pronoun.second_person_singular_object') { lemma = 'you'; gloss = 'object'; }
    if (e.id === 'pronoun.first_person_singular') lemma = 'I';
    if (e.id === 'function.that_relative') { lemma = 'that'; gloss = 'relative'; }

    let pos = POS_MAP[e.word_type] ?? 'noun';
    if (e.word_type === 'function') {
        const l = lemma.toLowerCase();
        pos = ['shall', 'need', 'dare', 'used to'].includes(l) ? 'auxiliary' : 'particle';
    }
    const domain = DOMAIN_MAP[e.category] ?? e.category;

    // filters: "world" means everywhere, "space" is an environment
    const region = e.region.filter(r => r !== 'world' && r !== 'space');
    const biome = [...e.biome];
    if (e.region.includes('space') && !biome.includes('space')) biome.push('space');

    // features: typed
    const features = {};
    const tagSet = new Set(e.tags.map(t => TAG_SYNONYM[t] ?? t));
    const feats = new Set(e.features);
    if (pos === 'noun') {
        if (tagSet.has('person') || feats.has('human') || (feats.has('person') && !feats.has('kinship'))) features.animacy = 'human';
        else if (tagSet.has('living_being') || feats.has('animate') || feats.has('living')) features.animacy = 'animate';
        else if (tagSet.has('inanimate_object')) features.animacy = 'inanimate';
        if (HUMAN_NOUNS.test(e.id) && !features.animacy) features.animacy = 'human';
        if (feats.has('countable')) features.countable = true;
    }
    if (e.id === 'food.farmer') { features.animacy = 'human'; report.retagged.push('food.farmer: animacy human (was inanimate_object)'); }
    if (pos === 'verb') {
        const l = lemma.toLowerCase();
        if (l === 'be') features.transitivity = 'copula';
        else if (DITRANSITIVE.has(l) && l !== 'teach') features.transitivity = 'ditransitive';
        else if (TRANSITIVE.has(l)) features.transitivity = 'transitive';
        else if (INTRANSITIVE.has(l)) features.transitivity = 'intransitive';
        if (features.transitivity) report.transitivity_set++;
    }
    if (pos === 'pronoun') {
        const id = e.id;
        const person = /first_person/.test(id) ? 1 : /second_person/.test(id) ? 2 : /third_person/.test(id) ? 3 : null;
        if (person) {
            features.person = person;
            features.number = /plural/.test(id) ? 'plural' : 'singular';
            features.role = /_object$/.test(id) ? 'object' : 'subject';
        }
    }

    // tags: drop what is now structural, fix copied tags, keep leftovers of old features as tags
    const tags = [];
    const addTag = t => { if (t && !tags.includes(t)) tags.push(t); };
    for (const t of e.tags.map(x => TAG_SYNONYM[x] ?? x)) {
        let drop = DROP_TAGS.has(t) || ['living_being', 'inanimate_object', 'person'].includes(t) && pos === 'noun'
            || t === e.category || t === domain || t === pos;
        if (domain === 'material' && t === 'food') drop = true, (report.dropped_tags['food@material'] = (report.dropped_tags['food@material'] || 0) + 1);
        if (domain === 'transport' && t === 'natural' && !e.tags.includes('animal_power')) drop = true, (report.dropped_tags['natural@transport'] = (report.dropped_tags['natural@transport'] || 0) + 1);
        if (!drop) addTag(t);
    }
    const STRUCTURAL_FEATURES = new Set(['animate', 'living', 'human', 'person', 'countable']);
    for (const f of e.features) if (!STRUCTURAL_FEATURES.has(f)) addTag(f);

    // tier
    let tier = e.scope === 'universal' ? 'common' : 'domain';
    if (CORE.get(lemma.toLowerCase()) === pos && !gloss) tier = 'core';
    if (e.id === 'function.that_relative') tier = 'common';
    if (GRAMMAR_POS.has(pos) && e.scope === 'universal') tier = 'core';

    // relations: arrays everywhere
    const relations = {};
    for (const [k, v] of Object.entries(e.relations)) {
        if (k === 'grammatical_roles') { for (const t of v) addTag(`role_${t}`); continue; }
        relations[k] = (Array.isArray(v) ? v : [v]).filter(Boolean);
    }
    return { id: e.id, lemma, ...(gloss ? { gloss } : {}), pos, domain, group: e.semantic_group, tier,
        region, culture: [...e.culture], biome, era: [...e.temporal_setting], tags, features, relations };
});

// Senses the templates need and the old dictionary lacked.
if (!out.some(e => e.lemma === 'rise' && e.pos === 'verb')) {
    out.push({ id: 'verb.rise', lemma: 'rise', pos: 'verb', domain: 'action', group: 'motion', tier: 'core', region: [], culture: [], biome: [], era: [], tags: ['movement', 'natural_movement'], features: { transitivity: 'intransitive' }, relations: {} });
    report.notes.push('added verb.rise');
}
// A "gender_pair"/"opposite" target must exist; add stored inverses.
closeRelations(out);
const errors = validateVocabulary(out);
if (errors.length) { console.error(errors.slice(0, 40).join('\n')); console.error(`${errors.length} problems`); process.exit(1); }
writeFileSync(dst, JSON.stringify({ schema: SCHEMA_VERSION, vocabulary: out }, null, 1));
const count = k => out.reduce((m, e) => (m[e[k]] = (m[e[k]] || 0) + 1, m), {});
report.entries = out.length; report.by_pos = count('pos'); report.by_domain = count('domain'); report.by_tier = count('tier');
if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 1));
console.log(JSON.stringify({ entries: out.length, pos: report.by_pos, tier: report.by_tier, transitivity_set: report.transitivity_set }));
