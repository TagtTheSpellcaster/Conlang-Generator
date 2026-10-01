/* ConLang Generator — self-contained engine v0.9.5 */
(() => {
    'use strict';

    const VERSION = '0.9.5';
    const $ = id => document.getElementById(id);
    const arr = v => Array.isArray(v) ? v.filter(x => x !== null && x !== undefined && x !== '').map(String) : (v === null || v === undefined || v === '' ? [] : [String(v)]);
    const norm = v => String(v ?? '').toLowerCase().replace(/^to\s+/, '').trim();
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    } [c]));
    const uniq = a => [...new Set(a)];

    let vocabulary = [];
    let generated = [];

    function hash(s) {
        let h = 2166136261;
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function rng(seed) {
        let x = hash(seed) || 1;
        return () => {
            x += 0x6D2B79F5;
            let t = x;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function choice(a, r) {
        return a.length ? a[Math.floor(r() * a.length)] : null;
    }

    function classify(e) {
        const t = norm(e.word_type),
            c = norm(e.category);
        if (t === 'verb' || c.includes('verb')) return 'verb';
        if (t === 'adjective' || c.includes('adjective')) return 'adjective';
        if (t === 'pronoun' || c.includes('pronoun')) return 'pronoun';
        if (['preposition', 'particle', 'conjunction', 'determiner', 'interrogative', 'adverb'].includes(t) || c.includes('function')) return 'function';
        if (t === 'number' || c.includes('number') || c.includes('quantity')) return 'number';
        return 'noun';
    }

    function meta(e) {
        return {
            tags: new Set(arr(e.tags).map(norm)),
            features: new Set(arr(e.features).map(norm)),
            groups: new Set([norm(e.semantic_group), norm(e.category)].filter(Boolean))
        };
    }

    function has(set, values) {
        return values.some(v => set.has(norm(v)));
    }

    function concept(e, values) {
        return values.some(v => norm(e.concept) === norm(v));
    }

    function candidates(list, q = {}) {
        let out = list.filter(e => !q.kinds || !q.kinds.length || q.kinds.includes(e.kind));

        // A concept query is an exact lookup. Never fall back to an arbitrary
        // vocabulary entry when the requested concept is absent: that was the
        // source of false translations such as wolf -> heel and milk -> year.
        if (q.concepts?.length) {
            return out.filter(e => concept(e, q.concepts));
        }

        return out.filter(e => {
            const m = meta(e);
            if (q.anyTags?.length && !has(m.tags, q.anyTags)) return false;
            if (q.anyFeatures?.length && !has(m.features, q.anyFeatures)) return false;
            if (q.anyGroups?.length && !has(m.groups, q.anyGroups)) return false;
            if (q.excludeTags?.length && has(m.tags, q.excludeTags)) return false;
            return true;
        });
    }

    function populateFilters() {
        ['region', 'culture', 'biome', 'temporal_setting', 'tags'].forEach(id => {
            const el = $(id);
            if (!el) return;
            const values = uniq(vocabulary.flatMap(e => arr(e[id]))).sort((a, b) => a.localeCompare(b));
            el.innerHTML = '<option value="">Any</option>' + values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
        });
    }

    function freshSeed() {
        if (globalThis.crypto?.getRandomValues) {
            const values = new Uint32Array(2);
            globalThis.crypto.getRandomValues(values);
            return `auto-${Date.now()}-${values[0].toString(36)}-${values[1].toString(36)}`;
        }
        return `auto-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    function config() {
        const selected = id => {
            const e = $(id);
            return e ? [...e.selectedOptions].map(o => o.value).filter(Boolean) : [];
        };
        const requestedSeed = $('seed')?.value.trim() || '';
        const seed = requestedSeed && requestedSeed.toLowerCase() !== 'auto'
            ? requestedSeed
            : freshSeed();
        return {
            region: selected('region'),
            culture: selected('culture'),
            biome: selected('biome'),
            temporal_setting: selected('temporal_setting'),
            tags: selected('tags'),
            vowels: $('vowels')?.value || 'standard',
            consonants: $('consonants')?.value || 'balanced',
            mean: Number($('mean')?.value) || 2.2,
            seed,
            order: $('word-order')?.value || 'SVO',
            morphology: $('morphology')?.value || 'isolating'
        };
    }

    function score(e, c) {
        let s = e.scope === 'universal' ? 1 : 0;
        for (const f of ['region', 'culture', 'biome', 'temporal_setting', 'tags']) {
            if (!c[f].length) continue;
            const v = arr(e[f]);
            s += v.some(x => c[f].includes(x)) ? (f === 'tags' ? 1.25 : 2) : -0.15;
        }
        return s;
    }

    function selectVocabulary(c) {
        const ranked = vocabulary.map(e => ({
            ...e,
            kind: classify(e),
            score: score(e, c)
        }));
        const required = ['i', 'you', 'we', 'they', 'me', 'my', 'this', 'that', 'here', 'there', 'today', 'tomorrow', 'yesterday', 'who', 'what', 'where', 'when', 'why', 'how', 'many', 'all', 'nothing', 'not', 'can', 'have', 'be', 'to', 'from', 'with', 'in', 'the'];
        const selected = [];
        const seen = new Set();
        ranked.filter(e => required.some(x => norm(e.concept) === x || norm(e.concept) === 'to ' + x)).forEach(e => {
            if (!seen.has(e.id)) {
                seen.add(e.id);
                selected.push(e);
            }
        });
        const groups = ['verb', 'adjective', 'pronoun', 'function', 'number', 'noun'];
        for (const kind of groups) {
            const pool = ranked.filter(e => e.kind === kind && !seen.has(e.id)).sort((a, b) => b.score - a.score);
            for (const e of pool.slice(0, kind === 'noun' ? 180 : 60)) {
                seen.add(e.id);
                selected.push(e);
            }
        }
        const rest = ranked.filter(e => !seen.has(e.id)).sort((a, b) => b.score - a.score);
        for (const e of rest) {
            if (selected.length >= 600) break;
            seen.add(e.id);
            selected.push(e);
        }
        return selected.slice(0, 600);
    }

    function renderSamples(c, list) {
        const box = $('generation-output');
        if (!box) return;
        const by = k => list.find(e => e.kind === k)?.conlang || list.find(e => norm(e.concept) === k)?.conlang || '—';
        const findConcept = (...names) => {
            const e = list.find(x => names.includes(norm(x.concept)) || names.includes(norm(x.concept).replace(/^to\s+/, '')));
            return e?.conlang || '—';
        };
        const samples = [
            ['I am here.', `${findConcept('i')} ${findConcept('be')} ${findConcept('here')}.`],
            ['You are there.', `${findConcept('you')} ${findConcept('be')} ${findConcept('there')}.`],
            ['This is my home.', `${findConcept('this')} ${findConcept('be')} ${findConcept('my')} ${findConcept('home')}.`],
            ['We have water.', `${findConcept('we')} ${findConcept('have')} ${findConcept('water')}.`],
            ['They see the forest.', `${findConcept('they')} ${findConcept('see')} ${findConcept('the')} ${findConcept('forest')}.`],
            ['Who is there?', `${findConcept('who')} ${findConcept('be')} ${findConcept('there')}?`],
            ['Where is the river?', `${findConcept('where')} ${findConcept('be')} ${findConcept('the')} ${findConcept('river')}?`],
            ['I do not know.', `${findConcept('i')} ${findConcept('do')} ${findConcept('not')} ${findConcept('know')}.`],
            ['We can go today.', `${findConcept('we')} ${findConcept('can')} ${findConcept('go')} ${findConcept('today')}.`],
            ['How many are there?', `${findConcept('how')} ${findConcept('many')} ${findConcept('be')} ${findConcept('there')}?`]
        ];
        box.insertAdjacentHTML('beforeend', `<div class="card"><h3>Sample sentences</h3><div class="dictionary">${samples.map(([en, co]) => `<div class="dict-row"><strong>${esc(en)}</strong><span>${esc(co)}</span></div>`).join('')}</div></div>`);
    }

    function renderLexicon(list) {
        const box = $('lexicon-output');
        if (!box) return;
        box.className = 'card';
        box.innerHTML = `<h3>Generated lexicon</h3><div class="lexicon">${list.map(e => `<div class="lex-row"><span class="word">${esc(e.conlang || '—')}</span><span class="eng">${esc(e.concept || '—')}</span><span class="meta">${esc(e.category || e.semantic_group || e.word_type || '')}</span></div>`).join('')}</div>`;
    }

    function renderDictionary(list) {
        const box = $('dictionary-output');
        if (!box) return;
        const dir = $('dictionary-direction')?.value || 'conlang-en';
        const q = norm($('dictionary-search')?.value || '');
        let rows = list.map(e => ({
            l: dir === 'conlang-en' ? e.conlang : e.concept,
            r: dir === 'conlang-en' ? e.concept : e.conlang,
            m: e.category || e.semantic_group || e.word_type || ''
        })).filter(x => x.l && x.r);
        if (q) rows = rows.filter(x => `${x.l} ${x.r} ${x.m}`.toLowerCase().includes(q));
        rows.sort((a, b) => xlocale(a.l, b.l));
        box.innerHTML = `<div class="card"><h3>${dir==='conlang-en'?'Conlang → English':'English → Conlang'}</h3><div class="sub" style="margin-bottom:10px">${rows.length} matching entries</div><div class="dictionary">${rows.map(x=>`<div class="dict-row"><strong>${esc(x.l)}</strong><span>${esc(x.r)}</span><span class="meta">${esc(x.m)}</span></div>`).join('')}</div></div>`;
    }
    const xlocale = (a, b) => String(a).localeCompare(String(b));

    function renderResult(c, list) {
        const box = $('generation-output');
        if (!box) return;
        const name = 'Language ' + String(Math.floor(rng(c.seed)() * 900) + 100);
        const chips = [c.region[0], c.culture[0], c.biome[0], c.temporal_setting[0], c.order].filter(Boolean);
        box.innerHTML = `<div class="hero"><div><div class="lang-name">${name}</div><div class="chips">${chips.map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div></div><div class="status">${list.length} lexical entries</div></div>`;
        renderSamples(c, list);
    }

    function generate() {
        try {
            const c = config();
            if (!vocabulary.length) throw new Error('Vocabulary is not loaded yet.');
            generated = selectVocabulary(c);
            const make = window.ConlangPhonology.createWordFactory(c);
            const seen = new Set();
            generated = generated.map(e => {
                const x = {
                    ...e
                };
                if (!x.conlang || seen.has(x.conlang)) {
                    x.conlang = make();
                }
                seen.add(x.conlang);
                return x;
            });
            renderResult(c, generated);
            renderLexicon(generated);
            renderDictionary(generated);
            $('message') && ($('message').textContent = `Generated ${generated.length} entries.`);
            window.dispatchEvent(new CustomEvent('conlang:generated', {
                detail: {
                    config: c,
                    lexicon: generated
                }
            }));
        } catch (e) {
            console.error(e);
            if ($('message')) $('message').textContent = 'Generation error: ' + e.message;
            if ($('generation-output')) $('generation-output').innerHTML = `<div class="error">${esc(e.message)}</div>`;
        }
    }

    function randomize() {
        ['region', 'culture', 'biome', 'temporal_setting', 'tags'].forEach(id => {
            const e = $(id);
            if (e && e.options.length > 1) e.value = choice([...e.options].slice(1).map(o => o.value), Math.random);
        });
        ['vowels', 'consonants', 'word-order', 'morphology', 'adj-position', 'articles', 'plural', 'relations'].forEach(id => {
            const e = $(id);
            if (e) e.value = choice([...e.options].map(o => o.value), Math.random);
        });
        if ($('mean')) $('mean').value = (1 + Math.random() * 2.5).toFixed(1);
        if ($('seed')) $('seed').value = 'auto';
    }

    function preset(type) {
        const map = {
            historical: { temporal_setting: 'historical', tags: 'historical' },
            fantasy: { tags: 'fantasy' },
            modern: { temporal_setting: 'modern' },
            scifi: { tags: 'sci-fi' }
        };
        const p = map[type];
        if (!p) return;
        ['region', 'culture', 'biome', 'temporal_setting', 'tags'].forEach(id => {
            const e = $(id);
            if (e) e.value = p[id] || '';
        });
    }

    function regenerate() {
        if (!vocabulary.length) return;
        generate();
    }

    function wire() {
        $('generate')?.addEventListener('click', generate);
        $('regenerate')?.addEventListener('click', regenerate);
        $('randomize')?.addEventListener('click', randomize);
        $('clear-filters')?.addEventListener('click', () => ['region', 'culture', 'biome', 'temporal_setting', 'tags'].forEach(id => {
            const e = $(id);
            if (e) e.value = '';
        }));
        [['preset-historical', 'historical'], ['preset-fantasy', 'fantasy'], ['preset-modern', 'modern'], ['preset-scifi', 'scifi']].forEach(([id, type]) => $(id)?.addEventListener('click', () => preset(type)));
        $('dictionary-direction')?.addEventListener('change', () => renderDictionary(generated));
        $('dictionary-search')?.addEventListener('input', () => renderDictionary(generated));
        window.addEventListener('conlang:phonology-reset', () => window.ConlangPhonology?.resetCycle());
    }

    async function loadVocabulary() {
        const status = $('db-status');
        try {
            const response = await fetch('vocabulary.json', { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            vocabulary = Array.isArray(data) ? data : (Array.isArray(data.vocabulary) ? data.vocabulary : []);
            populateFilters();
            if (status) status.textContent = `Vocabulary loaded: ${vocabulary.length} entries`;
        } catch (e) {
            console.error(e);
            if (status) status.textContent = 'Vocabulary load failed';
            if ($('message')) $('message').textContent = 'Vocabulary load failed: ' + e.message;
        }
    }

    window.ConlangEngine = Object.freeze({
        version: VERSION,
        generate,
        regenerate,
        randomize,
        getVocabulary: () => vocabulary.slice(),
        getGenerated: () => generated.slice()
    });

    wire();
    loadVocabulary();
})();