// Prints, for every genre, what the lexicon looks like (domain mix, own-vocabulary share, sample words, skipped templates).
import fs from 'node:fs';
import { generateLanguage } from '../src/engine.js';
import { GENRE_IDS } from '../src/genres.js';
import { tokenText } from '../src/syntax/realize.js';
const V = JSON.parse(fs.readFileSync(new URL('../data/vocabulary.json', import.meta.url))).vocabulary;
const T = JSON.parse(fs.readFileSync(new URL('../data/sentence-templates.json', import.meta.url))).templates;
const only = process.argv[2];
for (const id of ['none', ...GENRE_IDS]) {
    if (only && id !== only) continue;
    const L = generateLanguage({ seed: 'probe', genre: id }, V, T);
    const dom = {}; for (const e of L.lexicon) dom[e.domain] = (dom[e.domain] ?? 0) + 1;
    const top = Object.entries(dom).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k, n]) => `${k}:${n}`).join(' ');
    const avg = (L.lexicon.reduce((n, e) => n + e.form.length, 0) / L.lexicon.length).toFixed(1);
    const sample = L.lexicon.filter(e => e.tier !== 'core').slice(0, 6).map(e => `${e.form}=${e.lemma}`).join(' ');
    console.log(`\n== ${id}  name=${L.name} avgLen=${avg} skipped=${L.skippedSamples.length} notes=${L.notes.length}`);
    console.log(' ', top);
    console.log(' ', sample);
    console.log(' ', L.samples.slice(0, 2).map(s => tokenText(s.tokens)).join(' | '));
}
