// Merges the specialised-vocabulary sources (tools/lexicon/*.txt) into data/vocabulary.json.
// Idempotent: entries whose id already exists are left alone. Duplicated senses are reported and skipped.
//
// Source format (one block per file, see the .txt files):
//   @domain war            default domain for the following lines
//   @era a,b  @culture a,b  @biome a,b  @region a,b  @tags a,b   defaults (empty value resets)
//   @animacy human         default animacy of nouns (default: inanimate)
//   @tier common           default tier (default: domain)
//   ## group | tags=a,b | era=a,b | culture=a,b | biome=a,b | animacy=human | tier=common | domain=x
//   lemma, lemma (gloss), v:lemma, vi:lemma (intransitive verb), a:lemma, adv:lemma
//   @rel opposite | war of position | war of movement      (lemmas must be unambiguous nouns)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateVocabulary, closeRelations, DOMAINS } from '../../src/lexicon/schema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = path.join(root, 'data/vocabulary.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const vocabulary = data.vocabulary;
const norm = s => s.toLowerCase().trim();
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const list = v => v.split(',').map(x => x.trim()).filter(Boolean);
const POSMAP = { p: ['particle'], v: ['verb', 'transitive'], vi: ['verb', 'intransitive'], a: ['adjective'], adv: ['adverb'], n: ['noun'], c: ['conjunction'] };

const ids = new Set(vocabulary.map(e => e.id));
const senses = new Set(vocabulary.map(e => `${norm(e.lemma)}|${e.pos}|${norm(e.gloss ?? '')}`));
const added = [], skipped = [], pendingRels = [];

const sources = fs.readdirSync(path.dirname(fileURLToPath(import.meta.url))).filter(f => f.endsWith('.txt')).sort();
for (const f of sources) {
    const D = { domain: null, era: [], culture: [], biome: [], region: [], tags: [], animacy: 'inanimate', tier: 'domain' };
    let G = null;
    const lines = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), f), 'utf8').split('\n');
    lines.forEach((raw, ln) => {
        const line = raw.trim();
        const where = `${f}:${ln + 1}`;
        if (!line || line.startsWith('#') && !line.startsWith('##')) return;
        if (line.startsWith('@rel')) { const parts = line.split('|').map(x => x.trim()); pendingRels.push({ type: parts[0].split(/\s+/)[1], a: parts[1], b: parts[2], where }); return; }
        if (line.startsWith('@')) {
            const m = line.match(/^@(\w+)\s*(.*)$/);
            const [, key, val] = m;
            if (key === 'domain') { if (!DOMAINS.includes(val)) throw new Error(`${where}: unknown domain ${val}`); D.domain = val; }
            else if (['era', 'culture', 'biome', 'region', 'tags'].includes(key)) D[key] = list(val);
            else if (key === 'animacy' || key === 'tier') D[key] = val || (key === 'tier' ? 'domain' : 'inanimate');
            else throw new Error(`${where}: unknown directive ${key}`);
            G = null;
            return;
        }
        if (line.startsWith('##')) {
            const [name, ...opts] = line.slice(2).split('|').map(x => x.trim());
            G = { group: name, domain: D.domain, tags: [], era: D.era, culture: D.culture, biome: D.biome, region: D.region, animacy: D.animacy, tier: D.tier };
            for (const o of opts) {
                const [k, v] = o.split('=').map(x => x.trim());
                if (['tags', 'era', 'culture', 'biome', 'region'].includes(k)) G[k] = list(v ?? '');
                else if (['animacy', 'tier', 'domain'].includes(k)) G[k] = v;
                else throw new Error(`${where}: unknown group option ${k}`);
            }
            return;
        }
        if (!G) throw new Error(`${where}: entry before any "## group" line`);
        // split on commas that are not inside parentheses
        const tokens = []; let depth = 0, cur = '';
        for (const ch of line) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { tokens.push(cur); cur = ''; } else cur += ch; }
        tokens.push(cur);
        for (let tok of tokens.map(t => t.trim()).filter(Boolean)) {
            let pos = 'noun', transitivity = null;
            const pm = tok.match(/^(v|vi|a|adv|n|p|c):\s*(.*)$/);
            if (pm) { [pos, transitivity] = POSMAP[pm[1]]; tok = pm[2]; }
            let gloss;
            const gm = tok.match(/^(.*?)\s*\((.*)\)$/);
            if (gm) { tok = gm[1]; gloss = gm[2].trim(); }
            const lemma = tok.trim();
            if (!lemma) throw new Error(`${where}: empty lemma`);
            const key = `${norm(lemma)}|${pos}|${norm(gloss ?? '')}`;
            if (senses.has(key)) { skipped.push(`${where}: ${lemma} (${pos}) already exists`); continue; }
            let id = `${G.domain}.${slug(lemma)}`;
            if (ids.has(id)) id += `_${pos === 'adjective' ? 'adj' : pos === 'adverb' ? 'adv' : pos === 'verb' ? 'v' : 'n'}`;
            if (ids.has(id) && gloss) id += `_${slug(gloss)}`;
            if (ids.has(id)) { skipped.push(`${where}: id clash ${id}`); continue; }
            const features = pos === 'noun' ? { animacy: G.animacy } : pos === 'verb' ? { transitivity } : {};
            const entry = { id, lemma, ...(gloss ? { gloss } : {}), pos, domain: G.domain, group: G.group, tier: G.tier,
                region: [...G.region], culture: [...G.culture], biome: [...G.biome], era: [...G.era],
                tags: [...new Set([...G.tags, ...D.tags])], features, relations: {} };
            ids.add(id); senses.add(key); vocabulary.push(entry); added.push(entry);
        }
    });
}

const byLemma = lemma => {
    const hits = vocabulary.filter(e => norm(e.lemma) === norm(lemma) && e.pos === 'noun' && !e.gloss);
    return hits.length === 1 ? hits[0] : hits.length ? hits.sort((a, b) => added.includes(b) - added.includes(a))[0] : null;
};
for (const { type, a, b, where } of pendingRels) {
    const A = byLemma(a), B = byLemma(b);
    if (!A || !B) { skipped.push(`${where}: relation ${type} ${a} / ${b}: not found`); continue; }
    if (A.id === B.id) continue;
    (A.relations[type] ??= []).includes(B.id) || A.relations[type].push(B.id);
}
closeRelations(vocabulary);
const errors = validateVocabulary(vocabulary);
if (errors.length) { console.error(errors.slice(0, 40).join('\n')); console.error(`${errors.length} errors, nothing written`); process.exit(1); }
// one entry per line keeps the file small and diff-friendly
fs.writeFileSync(file, `{\n "schema": ${data.schema},\n "vocabulary": [\n${vocabulary.map(e => '  ' + JSON.stringify(e)).join(',\n')}\n ]\n}\n`);
const perDomain = {};
for (const e of added) perDomain[e.domain] = (perDomain[e.domain] ?? 0) + 1;
console.log(`added ${added.length}, skipped ${skipped.length}, total ${vocabulary.length}`);
console.log(JSON.stringify(perDomain));
if (skipped.length) console.log(skipped.join('\n'));
