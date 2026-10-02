/* ConLang Generator — generator UI controller v0.11.16 */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const arr = v => Array.isArray(v) ? v.filter(x => x !== null && x !== undefined && x !== '').map(String) : (v === null || v === undefined || v === '' ? [] : [String(v)]);
    const norm = v => String(v ?? '').toLowerCase().replace(/^to\s+/, '').trim();
    const uniq = a => [...new Set(a)];
    const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const PHONOTACTIC_INFO = {
        isolated: { title: 'Minimalist Isolating Pattern (Hawaiian-type)', description: 'The pattern categorically excludes consonant clusters and reduces the syllable to its minimum.', pattern: '(C)V' },
        japanese: { title: 'Controlled Open Syllable Pattern (Japanese-type)', description: 'Allows minimal onsets and only the nasal in the coda, producing clean internal transitions.', pattern: '(C)(G)V(N)' },
        european: { title: 'Balanced European Pattern (Italian / Finnish-type)', description: 'Balances open and closed syllables, distributing consonants and vowels for a smooth and stable phonotactic profile.', pattern: '(S)(C)(L/G)V(L/N/S)' },
        english: { title: 'Dynamic Anglo-Saxon Pattern (English-type)', description: 'Allows extensive consonant clusters in both onsets and codas, with strong vowel compression.', pattern: '(S)(C)(L/G)V(L/N)(C)(S)' },
        slavic: { title: 'Compact Slavic Pattern (Croatian / Polish-type)', description: 'Allows dense consonant structures and permits liquids to function as syllable nuclei.', pattern: '(C)(C)(C)(V/L)(C)(C)(C)' },
        semitic: { title: 'Semitic Root-and-Pattern Model (Arabic-type)', description: 'Uses a rigid alternation that prevents both consonant and vowel accumulation.', pattern: 'CV(C)' }
    };
    function populateFilters(vocabulary) { ['region', 'culture', 'biome', 'temporal_setting', 'tags'].forEach(id => { const el = $(id); if (!el) return; const values = uniq(vocabulary.flatMap(e => arr(e[id]))).sort((a, b) => a.localeCompare(b)); el.innerHTML = '<option value="">Any</option>' + values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join(''); }); }
    function selected(id) { const element = $(id); return element ? [...element.selectedOptions].map(o => o.value).filter(Boolean) : []; }
    function freshSeed() { if (globalThis.crypto?.getRandomValues) { const values = new Uint32Array(2); globalThis.crypto.getRandomValues(values); return `auto-${Date.now()}-${values[0].toString(36)}-${values[1].toString(36)}`; } return `auto-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
    function readConfig() { const requestedSeed = $('seed')?.value.trim() || ''; const seed = requestedSeed && requestedSeed.toLowerCase() !== 'auto' ? requestedSeed : freshSeed(); return { region: selected('region'), culture: selected('culture'), biome: selected('biome'), temporal_setting: selected('temporal_setting'), tags: selected('tags'), vowels: $('vowels')?.value || 'standard', consonants: $('consonants')?.value || 'european', mean: Number($('mean')?.value) || 2.2, seed, order: $('word-order')?.value || 'SVO', morphology: $('morphology')?.value || 'isolating', articles: $('articles')?.value || 'none', plural: $('plural')?.value || 'suffix', relations: $('relations')?.value || 'prepositions', caseSystem: $('case-system')?.value || 'moderate', adjPosition: $('adj-position')?.value || 'after' }; }
    function installMeanSlider() {
        const mean = $('mean'); if (!mean || mean.type === 'range') return;
        mean.type = 'range'; mean.min = '1'; mean.max = '5'; mean.step = '0.1';
        const field = mean.closest('.field'); const label = field?.querySelector('label[for="mean"]');
        if (label && !label.querySelector('.mean-value')) {
            const value = document.createElement('span'); value.className = 'mean-value'; value.style.cssText = 'float:right;color:var(--text);font-variant-numeric:tabular-nums'; label.appendChild(value);
        }
        const update = () => { const value = Number(mean.value) || 2.2; const display = label?.querySelector('.mean-value'); if (display) display.textContent = value.toFixed(1); const info = document.querySelector('.phonotactic-info'); if (info) renderPhonotacticInfo(info); };
        mean.addEventListener('input', update); update();
    }
    function synthesisIndex(value) { const mean = Number(value); if (mean <= 1.5) return 'short'; if (mean < 2.2) return 'short-balanced'; if (mean <= 2.8) return 'balanced'; if (mean <= 3.5) return 'balanced-long'; return 'long'; }
    function renderPhonotacticInfo(info) { const select = $('consonants'); const data = PHONOTACTIC_INFO[select?.value] || PHONOTACTIC_INFO.european; const mean = Number($('mean')?.value) || 2.2; info.innerHTML = `<div style="color:var(--text);font-weight:700;margin-bottom:4px">${esc(data.title)}</div><div>${esc(data.description)}</div><div style="margin-top:5px"><strong style="color:var(--text)">Formal pattern:</strong> <code>${esc(data.pattern)}</code></div><div style="margin-top:5px"><strong style="color:var(--text)">Synthesis index:</strong> ${esc(synthesisIndex(mean))}</div>`; }
    function installPhonotacticInfo() {
        const select = $('consonants'); if (!select) return; const field = select.closest('.field'); if (!field) return;
        const label = field.querySelector('label[for="consonants"]'); if (label) label.textContent = 'Phonotactic pattern';
        const grid = field.closest('.compact-grid'); let info = grid?.querySelector('.phonotactic-info') || field.querySelector('.phonotactic-info');
        if (!info) { info = document.createElement('div'); info.className = 'phonotactic-info'; info.style.cssText = 'grid-column:1 / -1;margin-top:0;padding-top:8px;border-top:1px solid var(--line);color:var(--muted);font-size:11px;line-height:1.45'; if (grid) { const fields = [...grid.querySelectorAll(':scope > .field')]; const meanField = fields.find(item => item.querySelector('#mean')); const seedField = fields.find(item => item.querySelector('#seed')); const afterField = seedField || meanField; if (afterField) afterField.insertAdjacentElement('afterend', info); else grid.appendChild(info); } else field.insertAdjacentElement('afterend', info); }
        select.addEventListener('change', () => renderPhonotacticInfo(info)); const mean = $('mean'); if (mean) mean.addEventListener('input', () => renderPhonotacticInfo(info)); renderPhonotacticInfo(info);
    }
    function findExampleNoun(list) {
        return list.find(e => norm(e.word_type) === 'noun' || norm(e.category).includes('noun') || norm(e.semantic_group).includes('noun')) || list.find(e => !['verb', 'adjective', 'pronoun', 'preposition', 'conjunction', 'determiner', 'particle', 'number'].includes(norm(e.word_type))) || list[0] || null;
    }
    function countSyllables(word, vowels) {
        const set = new Set((vowels || ['a', 'e', 'i', 'o', 'u']).map(String));
        let count = 0;
        let previous = false;
        for (const char of String(word || '').toLowerCase()) {
            const current = set.has(char);
            if (current && !previous) count++;
            previous = current;
        }
        return count;
    }
    function generateNumberMarker(config, used) {
        if (!config || config.plural === 'none' || !window.ConlangPhonology?.createWordFactory) return '';
        const vowels = { standard: ['a', 'e', 'i', 'o', 'u'], minimal: ['a', 'i', 'u'], extended: ['a', 'e', 'i', 'o', 'u', 'y', 'ø', 'æ'] }[config.vowels] || ['a', 'e', 'i', 'o', 'u'];
        const factory = window.ConlangPhonology.createWordFactory({ consonants: config.consonants, vowels: config.vowels, mean: 1, seed: `${config.seed}|morphology|number` });
        for (let guard = 0; guard < 200; guard++) {
            const marker = factory({ short: true });
            if (marker && countSyllables(marker, vowels) <= 1 && !used.has(marker)) return marker;
        }
        return '';
    }
    function applyNumber(stem, marker, mode) { if (!marker) return stem; return mode === 'prefix' ? marker + stem : stem + marker; }
    function renderMorphemeInventory(morphemes, list, config) {
        if (!morphemes || !morphemes.cases?.length) return '';
        const noun = findExampleNoun(list);
        if (!noun?.conlang) return '';
        const stem = String(noun.conlang);
        const translation = String(noun.concept || '—');
        const endings = morphemes.caseEndings || {};
        const used = new Set(Object.values(endings).filter(Boolean));
        const pluralMarker = generateNumberMarker(config, used);
        const caseForm = (base, caseName) => {
            const ending = endings[caseName] || '';
            return `${esc(base)}${ending ? `<span class="morph-ending">${esc(ending)}</span>` : '<span class="morph-empty">∅</span>'}`;
        };
        const rowsForNumber = (label, base, translationLabel) => {
            const rows = morphemes.cases.map(caseName => `<div class="morph-example-row" style="display:grid;grid-template-columns:minmax(100px,1fr) minmax(180px,1.4fr) minmax(130px,1fr);gap:14px;align-items:center;padding:6px 0;border-bottom:1px solid #1d2739"><span class="morph-case" style="color:var(--muted)">${esc(caseName)}</span><span class="morph-form" style="font-family:ui-monospace,monospace;font-size:14px">${caseForm(base, caseName)}</span><span class="morph-translation" style="color:#d9e2ef">${esc(translationLabel)}</span></div>`).join('');
            return `<div class="morph-number-block" style="margin-top:12px"><div class="morph-number-title" style="font-weight:700;color:var(--text);margin-bottom:4px">${esc(label)}</div><div class="morph-example-table"><div class="morph-example-head" style="display:grid;grid-template-columns:minmax(100px,1fr) minmax(180px,1.4fr) minmax(130px,1fr);gap:14px;padding:5px 0;border-bottom:1px solid var(--line);color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.04em"><span>Case</span><span>Example</span><span>Translation</span></div>${rows}</div></div>`;
        };
        const singular = rowsForNumber('Singular', stem, translation);
        const plural = pluralMarker ? rowsForNumber('Plural', applyNumber(stem, pluralMarker, config.plural), `${translation} (plural)`) : '';
        const dualMarker = morphemes.numberMarkers?.dual || '';
        const dual = dualMarker ? rowsForNumber('Dual', applyNumber(stem, dualMarker, morphemes.numberMarkers.dualMode || 'suffix'), `${translation} (dual)`) : '';
        const numberNote = pluralMarker ? `<div class="morph-note">Plural marker: <span class="morph-ending">${esc(pluralMarker)}</span> (${config.plural})</div>` : '<div class="morph-note">No productive plural marker.</div>';
        return `<div class="card morph-inventory"><h3>Grammatical morphemes</h3><div class="sub morph-noun-label">Example noun: <strong>${esc(translation)}</strong> — <span class="morph-stem">${esc(stem)}</span></div>${singular}${plural}${dual}${numberNote}<div class="morph-note">Case endings attach directly to the lexical stem, never to an already inflected form.</div></div>`;
    }
    function renderSamples(list, config) { const box = $('generation-output'); if (!box || !window.ConlangSentenceEngine) return; const samples = window.ConlangSentenceEngine.generateSamples(list, config); const style = `<style id="sample-v718">.sample-frame{margin-top:16px;background:#11182a;border:1px solid #26324a;border-radius:10px;padding:14px}.sample-pill{background:#0d1424;border:1px solid #26324a;border-radius:999px;padding:9px 14px;margin:7px 0}.sample-pill .en{font-weight:400}.sample-pill .cl{font-weight:700;margin-top:4px}.sample-word{cursor:help;border-bottom:1px dotted #55c7ff;position:relative}.sample-word:hover::after{content:attr(data-meaning);position:absolute;left:0;bottom:calc(100% + 6px);background:#050914;color:#fff;border:1px solid #3d5277;border-radius:6px;padding:4px 7px;white-space:nowrap;font:12px/1.2 system-ui;z-index:50}</style>`; const html = samples.map(x => `<div class="sample-pill"><div class="en"><b>${x.number}.</b> ${esc(x.english)}</div><div class="cl"><b>${x.number}.</b> ${x.html}</div></div>`).join(''); box.insertAdjacentHTML('beforeend', style + `<div class="sample-frame"><h3>Sample sentences</h3>${html}</div>`); }
    function renderLexicon(list) { const box = $('lexicon-output'); if (!box) return; box.className = 'card'; box.innerHTML = `<h3>Generated lexicon</h3><div class="lexicon">${list.map(e => `<div class="lex-row"><span class="word">${esc(e.conlang || '—')}</span><span class="eng">${esc(e.concept || '—')}</span><span class="meta">${esc(e.category || e.semantic_group || e.word_type || '')}</span></div>`).join('')}</div>`; }
    const xlocale = (a, b) => String(a).localeCompare(String(b));
    function renderDictionary(list) { const box = $('dictionary-output'); if (!box) return; const dir = $('dictionary-direction')?.value || 'conlang-en'; const q = norm($('dictionary-search')?.value || ''); let rows = list.map(e => ({ l: dir === 'conlang-en' ? e.conlang : e.concept, r: dir === 'conlang-en' ? e.concept : e.conlang, m: e.category || e.semantic_group || e.word_type || '' })).filter(x => x.l && x.r); if (q) rows = rows.filter(x => `${x.l} ${x.r} ${x.m}`.toLowerCase().includes(q)); rows.sort((a, b) => xlocale(a.l, b.l)); box.innerHTML = `<div class="card"><h3>${dir === 'conlang-en' ? 'Conlang → English' : 'English → Conlang'}</h3><div class="sub" style="margin-bottom:10px">${rows.length} matching entries</div><div class="dictionary">${rows.map(x => `<div class="dict-row"><strong>${esc(x.l)}</strong><span>${esc(x.r)}</span><span class="meta">${esc(x.m)}</span></div>`).join('')}</div></div>`; }
    function renderResult(result) { const box = $('generation-output'); if (!box) return; const c = result.config; const list = result.lexicon; const name = window.ConlangEngine.languageName(c.seed, c); const chips = [c.region[0], c.culture[0], c.biome[0], c.order].filter(Boolean); box.className = 'result'; box.innerHTML = `<div class="hero"><div><div class="lang-name">Name of language: ${esc(name)}</div><div class="chips">${chips.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div></div><div class="status">${list.length} lexical entries</div></div><div class="grid">${renderMorphemeInventory(result.morphemes, list, c)}</div>`; renderSamples(list, c); renderLexicon(list); renderDictionary(list); }
    function generate() { try { const result = window.ConlangEngine.generate(readConfig()); renderResult(result); if ($('message')) $('message').textContent = `Generated ${result.lexicon.length} entries.`; window.dispatchEvent(new CustomEvent('conlang:generated', { detail: result })); } catch (e) { console.error(e); if ($('message')) $('message').textContent = 'Generation error: ' + e.message; if ($('generation-output')) { $('generation-output').className = 'result'; $('generation-output').innerHTML = `<div class="error">${esc(e.message)}</div>`; } } }
    function regenerate() { randomize(); generate(); }
    function randomize() { ['region', 'culture', 'biome', 'temporal_setting', 'tags'].forEach(id => { const e = $(id); if (e && e.options.length > 1) { const options = [...e.options].slice(1).map(o => o.value); e.value = options[Math.floor(Math.random() * options.length)]; } }); ['vowels', 'consonants', 'word-order', 'morphology', 'adj-position', 'articles', 'plural', 'relations'].forEach(id => { const e = $(id); if (e && e.options.length) e.value = e.options[Math.floor(Math.random() * e.options.length)].value; }); if ($('mean')) { $('mean').value = (1 + Math.random() * 2.5).toFixed(1); $('mean').dispatchEvent(new Event('input')); } if ($('seed')) $('seed').value = 'auto'; $('consonants')?.dispatchEvent(new Event('change')); }
    function preset(type) { const map = { historical: { temporal_setting: 'historical', tags: 'historical' }, fantasy: { tags: 'fantasy' }, modern: { temporal_setting: 'modern' }, scifi: { tags: 'sci-fi' } }; const p = map[type]; if (!p) return; ['region', 'culture', 'biome', 'temporal_setting', 'tags'].forEach(id => { const e = $(id); if (e) e.value = p[id] || ''; }); }
    function wire() { installMeanSlider(); installPhonotacticInfo(); $('generate')?.addEventListener('click', generate); $('regenerate')?.addEventListener('click', regenerate); $('randomize')?.addEventListener('click', randomize); $('clear-filters')?.addEventListener('click', () => ['region', 'culture', 'biome', 'temporal_setting', 'tags'].forEach(id => { const e = $(id); if (e) e.value = ''; })); [['preset-historical', 'historical'], ['preset-fantasy', 'fantasy'], ['preset-modern', 'modern'], ['preset-scifi', 'scifi']].forEach(([id, type]) => $(id)?.addEventListener('click', () => preset(type))); $('dictionary-direction')?.addEventListener('change', () => renderDictionary(window.ConlangEngine.getGenerated())); $('dictionary-search')?.addEventListener('input', () => renderDictionary(window.ConlangEngine.getGenerated())); }
    async function loadVocabulary() { const status = $('db-status'); try { const response = await fetch('vocabulary.json', { cache: 'no-store' }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const data = await response.json(); const vocabulary = window.ConlangEngine.loadVocabulary(data); populateFilters(vocabulary); if (status) status.textContent = `Vocabulary loaded: ${vocabulary.length} entries`; } catch (e) { console.error(e); if (status) status.textContent = 'Vocabulary load failed'; if ($('message')) $('message').textContent = 'Vocabulary load failed: ' + e.message; } }
    function loadSentenceEngine() { if (window.ConlangSentenceEngine) return Promise.resolve(); return new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'sentence_engine.js'; script.onload = resolve; script.onerror = () => reject(new Error('Unable to load sentence_engine.js.')); document.head.appendChild(script); }); }
    window.ConlangGeneratorUI = Object.freeze({ generate, regenerate, randomize, renderLexicon, renderDictionary });
    async function start() { try { await loadSentenceEngine(); wire(); await loadVocabulary(); } catch (e) { console.error(e); if ($('message')) $('message').textContent = e.message; } }
    start();
})();