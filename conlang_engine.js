/* ConLang Generator — core engine v0.10.2 */
(() => {
    'use strict';

    const VERSION = '0.10.2';
    const arr = v => Array.isArray(v) ? v.filter(x => x !== null && x !== undefined && x !== '').map(String) : (v === null || v === undefined || v === '' ? [] : [String(v)]);
    const norm = v => String(v ?? '').toLowerCase().replace(/^to\s+/, '').trim();

    let vocabulary = [];
    let generated = [];

    function classify(e) {
        const t = norm(e.word_type);
        const c = norm(e.category);
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

    function has(set, values) { return values.some(v => set.has(norm(v))); }
    function concept(e, values) { return values.some(v => norm(e.concept) === norm(v)); }

    function candidates(list, q = {}) {
        const out = list.filter(e => !q.kinds || !q.kinds.length || q.kinds.includes(e.kind));
        if (q.concepts?.length) return out.filter(e => concept(e, q.concepts));
        return out.filter(e => {
            const m = meta(e);
            if (q.anyTags?.length && !has(m.tags, q.anyTags)) return false;
            if (q.anyFeatures?.length && !has(m.features, q.anyFeatures)) return false;
            if (q.anyGroups?.length && !has(m.groups, q.anyGroups)) return false;
            if (q.excludeTags?.length && has(m.tags, q.excludeTags)) return false;
            return true;
        });
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
        const ranked = vocabulary.map(e => ({ ...e, kind: classify(e), score: score(e, c) }));
        const required = ['i', 'you', 'we', 'they', 'me', 'my', 'this', 'that', 'here', 'there', 'today', 'tomorrow', 'yesterday', 'who', 'what', 'where', 'when', 'why', 'how', 'many', 'all', 'nothing', 'not', 'can', 'have', 'be', 'to', 'from', 'with', 'in', 'the'];
        const selected = [];
        const seen = new Set();

        ranked.filter(e => required.some(x => norm(e.concept) === x || norm(e.concept) === 'to ' + x)).forEach(e => {
            if (!seen.has(e.id)) { seen.add(e.id); selected.push(e); }
        });

        const groups = ['verb', 'adjective', 'pronoun', 'function', 'number', 'noun'];
        for (const kind of groups) {
            const pool = ranked.filter(e => e.kind === kind && !seen.has(e.id)).sort((a, b) => b.score - a.score);
            for (const e of pool.slice(0, kind === 'noun' ? 180 : 60)) { seen.add(e.id); selected.push(e); }
        }

        const rest = ranked.filter(e => !seen.has(e.id)).sort((a, b) => b.score - a.score);
        for (const e of rest) {
            if (selected.length >= 600) break;
            seen.add(e.id);
            selected.push(e);
        }

        return selected.slice(0, 600);
    }

    function generate(c) {
        if (!vocabulary.length) throw new Error('Vocabulary is not loaded yet.');

        const config = {
            region: Array.isArray(c?.region) ? c.region : [],
            culture: Array.isArray(c?.culture) ? c.culture : [],
            biome: Array.isArray(c?.biome) ? c.biome : [],
            temporal_setting: Array.isArray(c?.temporal_setting) ? c.temporal_setting : [],
            tags: Array.isArray(c?.tags) ? c.tags : [],
            vowels: c?.vowels || 'standard', consonants: c?.consonants || 'european',
            mean: Number(c?.mean) || 2.2, seed: String(c?.seed ?? 'auto'),
            order: c?.order || 'SVO', morphology: c?.morphology || 'isolating'
        };

        const selected = selectVocabulary(config);
        const make = window.ConlangPhonology.createWordFactory(config);
        const seen = new Set();

        generated = selected.map(e => {
            const x = { ...e };
            if (!x.conlang || seen.has(x.conlang)) x.conlang = make();
            seen.add(x.conlang);
            return x;
        });

        return { config, lexicon: generated.slice() };
    }

    function loadVocabulary(data) {
        const list = Array.isArray(data) ? data : (Array.isArray(data?.vocabulary) ? data.vocabulary : []);
        vocabulary = list.slice();
        generated = [];
        return vocabulary.slice();
    }

    function languageName(seed, options = {}) {
        const requestedSeed = String(seed ?? 'auto');
        const modelKey = options.consonants || 'european';
        const vowels = options.vowels || 'standard';
        const mean = Number(options.mean) || 2.2;
        const nameSeed = requestedSeed + '|language-name';

        if (window.ConlangPhonology?.createWordFactory) {
            const make = window.ConlangPhonology.createWordFactory({ consonants: modelKey, vowels, mean: Math.max(1, Math.min(4, mean * 0.8)), seed: nameSeed });
            return make();
        }

        return 'language-' + String(Math.floor(rng(nameSeed)() * 900) + 100);
    }

    window.ConlangEngine = Object.freeze({ version: VERSION, generate, loadVocabulary, getVocabulary: () => vocabulary.slice(), getGenerated: () => generated.slice(), languageName });
})();