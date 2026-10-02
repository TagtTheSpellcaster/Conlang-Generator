/* ConLang Generator — core engine v0.11.4 */
(() => {
    'use strict';

    const VERSION = window.CONLANG_GENERATOR_VERSION || '0.11.4';
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

    function score(e, c) {
        let s = e.scope === 'universal' ? 1 : 0;
        for (const f of ['region', 'culture', 'biome', 'temporal_setting', 'tags']) {
            if (!c[f].length) continue;
            const v = arr(e[f]);
            s += v.some(x => c[f].includes(x)) ? (f === 'tags' ? 1.25 : 2) : -0.15;
        }
        return s;
    }

    function articleAllowed(conceptName, mode) {
        const c = norm(conceptName);
        const m = norm(mode || 'none');
        if (!['the', 'a', 'an'].includes(c)) return true;
        if (m === 'none') return false;
        if (c === 'the') return ['both', 'definite', 'partitive'].includes(m);
        return ['both', 'indefinite', 'partitive'].includes(m);
    }

    function requiredArticles(mode) {
        const m = norm(mode || 'none');
        if (m === 'definite') return ['the'];
        if (m === 'indefinite') return ['a', 'an'];
        if (m === 'both' || m === 'partitive') return ['the', 'a', 'an'];
        return [];
    }

    function selectVocabulary(c) {
        const articleMode = norm(c.articles || 'none');
        const ranked = vocabulary
            .map(e => ({ ...e, kind: classify(e), score: score(e, c) }))
            .filter(e => articleAllowed(e.concept, articleMode));

        const required = [
            'i', 'you', 'we', 'they', 'me', 'my', 'your', 'this', 'that', 'here', 'there',
            'today', 'tomorrow', 'yesterday', 'who', 'what', 'where', 'when', 'why', 'how',
            'many', 'all', 'nothing', 'not', 'can', 'have', 'be', 'to', 'from', 'with', 'in',
            ...requiredArticles(articleMode)
        ];

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

    const SHORT_WORD_CONCEPTS = new Set([
        'this', 'that', 'these', 'those', 'here', 'there',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'you', 'him', 'her', 'us', 'them',
        'my', 'your', 'his', 'her', 'our', 'their', 'mine', 'yours', 'ours', 'theirs',
        'who', 'what', 'which', 'thing', 'not', 'no', 'yes', 'already', 'maybe', 'but', 'also'
    ]);

    function isShortWord(e) {
        const t = norm(e.word_type);
        const c = norm(e.category);
        if (['preposition', 'conjunction', 'determiner', 'interrogative', 'pronoun', 'particle'].includes(t)) return true;
        if (c.includes('preposition') || c.includes('conjunction') || c.includes('determiner') || c.includes('interrogative') || c.includes('pronoun')) return true;
        return SHORT_WORD_CONCEPTS.has(norm(e.concept));
    }

    const CASE_DEFINITIONS = Object.freeze({
        minimal: Object.freeze(['nominative', 'accusative']),
        moderate: Object.freeze(['nominative', 'accusative', 'genitive', 'dative']),
        extensive: Object.freeze(['nominative', 'accusative', 'genitive', 'dative', 'locative', 'ablative', 'instrumental'])
    });

    function buildMorphologyModel(c) {
        const relationModel = ['prepositions', 'cases', 'mixed'].includes(c?.relations) ? c.relations : 'prepositions';
        const caseSystem = ['minimal', 'moderate', 'extensive'].includes(c?.caseSystem) ? c.caseSystem : 'moderate';
        const cases = relationModel === 'prepositions' ? [] : CASE_DEFINITIONS[caseSystem].slice();
        return Object.freeze({
            relationModel,
            caseSystem: relationModel === 'prepositions' ? null : caseSystem,
            cases,
            stemRule: 'endings attach to the lexical stem, never to an already inflected form',
            realization: relationModel === 'prepositions' ? 'particles' : (relationModel === 'cases' ? 'case-endings' : 'mixed')
        });
    }

    function generate(c) {
        if (!vocabulary.length) throw new Error('Vocabulary is not loaded yet.');

        const config = {
            region: Array.isArray(c?.region) ? c.region : [], culture: Array.isArray(c?.culture) ? c.culture : [],
            biome: Array.isArray(c?.biome) ? c.biome : [], temporal_setting: Array.isArray(c?.temporal_setting) ? c.temporal_setting : [],
            tags: Array.isArray(c?.tags) ? c.tags : [], vowels: c?.vowels || 'standard', consonants: c?.consonants || 'european',
            mean: Number(c?.mean) || 2.2, seed: String(c?.seed ?? 'auto'), order: c?.order || 'SVO',
            morphology: c?.morphology || 'isolating', articles: c?.articles || 'none', plural: c?.plural || 'suffix',
            relations: c?.relations || 'prepositions', caseSystem: c?.caseSystem || 'moderate',
            adjectivePosition: c?.adjectivePosition || c?.adjPosition || 'after'
        };

        const morphologyModel = buildMorphologyModel(config);
        const selected = selectVocabulary(config);
        const make = window.ConlangPhonology.createWordFactory(config);
        const seen = new Set();

        generated = selected.map(e => {
            const x = { ...e };
            if (!x.conlang || seen.has(x.conlang)) x.conlang = make({ short: isShortWord(x) });
            seen.add(x.conlang);
            return x;
        });

        return { config, morphology: morphologyModel, lexicon: generated.slice() };
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
        return 'language-' + String(Math.floor(Math.random() * 900) + 100);
    }

    window.ConlangEngine = Object.freeze({ version: VERSION, generate, loadVocabulary, getVocabulary: () => vocabulary.slice(), getGenerated: () => generated.slice(), languageName, buildMorphologyModel });
})();