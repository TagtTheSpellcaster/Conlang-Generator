/* ConLang Generator — core engine v0.11.27 */
(() => {
    'use strict';

    const VERSION = window.CONLANG_GENERATOR_VERSION || '0.11.27';
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

    const REQUIRED_SAMPLE_CONCEPTS = Object.freeze([
        'i', 'you', 'we', 'they', 'me', 'my', 'your', 'this', 'that', 'here', 'there',
        'today', 'tomorrow', 'yesterday', 'who', 'what', 'where', 'when', 'why', 'how',
        'many', 'all', 'nothing', 'not', 'can', 'have', 'be', 'to', 'from', 'with', 'in',
        'forest', 'good', 'friend', 'sister', 'father', 'water', 'food', 'bread', 'sun',
        'moon', 'stone', 'hot', 'cold', 'bright', 'see', 'eat'
    ]);

    const SAMPLE_VERB_CONCEPTS = new Set(['be', 'have', 'can', 'see', 'eat']);

    function selectVocabulary(c) {
        const articleMode = norm(c.articles || 'none');
        const ranked = vocabulary
            .map(e => ({
                ...e,
                kind: classify(e),
                score: score(e, c)
            }))
            .filter(e => articleAllowed(e.concept, articleMode));

        const selected = [];
        const seen = new Set();
        const add = e => {
            if (!e || seen.has(e.id)) return;
            seen.add(e.id);
            selected.push(e);
        };

        for (const concept of REQUIRED_SAMPLE_CONCEPTS) {
            const matches = ranked.filter(e => norm(e.concept) === concept || norm(e.concept) === 'to ' + concept);
            if (SAMPLE_VERB_CONCEPTS.has(concept)) add(matches.find(e => e.kind === 'verb') || matches[0]);
            else add(matches[0]);
        }

        const groups = ['verb', 'adjective', 'pronoun', 'function', 'number', 'noun'];
        for (const kind of groups) {
            const pool = ranked.filter(e => e.kind === kind && !seen.has(e.id)).sort((a, b) => b.score - a.score);
            const limit = kind === 'noun' ? 220 : 60;
            for (const e of pool.slice(0, limit)) add(e);
        }

        const rest = ranked.filter(e => !seen.has(e.id)).sort((a, b) => b.score - a.score);
        for (const e of rest) {
            if (selected.length >= 600) break;
            add(e);
        }

        return selected.slice(0, 600);
    }

    const SHORT_WORD_CONCEPTS = new Set([
        'this', 'that', 'these', 'those', 'here', 'there',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
        'my', 'your', 'his', 'our', 'their', 'mine', 'yours', 'ours', 'theirs',
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
        accusative: Object.freeze(['nominative', 'accusative']),
        moderate: Object.freeze(['nominative', 'accusative', 'genitive', 'dative']),
        extensive: Object.freeze(['nominative', 'accusative', 'genitive', 'dative', 'locative', 'ablative', 'instrumental']),
        ergative_minimal: Object.freeze(['absolutive', 'ergative']),
        ergative_moderate: Object.freeze(['absolutive', 'ergative', 'genitive', 'dative']),
        ergative_extensive: Object.freeze(['absolutive', 'ergative', 'genitive', 'dative', 'locative', 'ablative', 'instrumental'])
    });

    function buildMorphologyModel(c) {
        const relationModel = ['prepositions', 'cases', 'mixed', 'ergative'].includes(c?.relations) ? c.relations : 'prepositions';
        const caseSystem = ['minimal', 'moderate', 'extensive'].includes(c?.caseSystem) ? c.caseSystem : 'moderate';
        const ergative = relationModel === 'ergative';
        const cases = relationModel === 'prepositions' ? [] : (ergative ? CASE_DEFINITIONS[`ergative_${caseSystem}`].slice() : CASE_DEFINITIONS[caseSystem].slice());
        return Object.freeze({
            relationModel,
            alignment: ergative ? 'ergative-absolutive' : 'nominative-accusative',
            caseSystem: relationModel === 'prepositions' ? null : caseSystem,
            cases,
            stemRule: 'endings attach to the lexical stem, never to an already inflected form',
            realization: relationModel === 'prepositions' ? 'particles' : (relationModel === 'cases' || ergative ? 'case-endings' : 'mixed')
        });
    }

    function countSyllables(word, vowels) {
        const v = new Set((vowels || ['a', 'e', 'i', 'o', 'u']).map(String));
        let count = 0,
            previousWasVowel = false;
        for (const char of String(word || '').toLowerCase()) {
            const isVowel = v.has(char);
            if (isVowel && !previousWasVowel) count++;
            previousWasVowel = isVowel;
        }
        return count;
    }

    function generateOneSyllableEnding(factory, vowels, used) {
        for (let guard = 0; guard < 200; guard++) {
            const candidate = factory({
                short: true
            });
            if (candidate && countSyllables(candidate, vowels) <= 1 && !used.has(candidate)) return candidate;
        }
        return '';
    }

    function generateCaseEndings(config, morphologyModel) {
        if (!morphologyModel.cases.length) return {};
        if (!window.ConlangPhonology?.createWordFactory) throw new Error('Shared phonology engine is not available.');
        const vowelSets = {
            standard: ['a', 'e', 'i', 'o', 'u'],
            minimal: ['a', 'i', 'u'],
            extended: ['a', 'e', 'i', 'o', 'u', 'y', 'ø', 'æ']
        };
        const vowels = vowelSets[config.vowels] || vowelSets.standard;
        const factory = window.ConlangPhonology.createWordFactory({
            consonants: config.consonants,
            vowels: config.vowels,
            mean: 1,
            seed: `${config.seed}|morphology|case-endings`
        });
        const endings = {};
        const used = new Set();
        for (const grammaticalCase of morphologyModel.cases) {
            if (grammaticalCase === 'nominative' || grammaticalCase === 'absolutive') {
                endings[grammaticalCase] = '';
                continue;
            }
            const ending = generateOneSyllableEnding(factory, vowels, used);
            if (!ending) throw new Error(`Unable to generate a unique one-syllable ${grammaticalCase} case ending.`);
            used.add(ending);
            endings[grammaticalCase] = ending;
        }
        return Object.freeze(endings);
    }

    function generateNumberMarkers(config, caseEndings) {
        const result = {
            plural: '',
            dual: '',
            pluralMode: config.plural,
            dualMode: config.plural
        };
        if (!window.ConlangPhonology?.createWordFactory) return result;
        if (config.plural === 'none') return result;
        const number = config.number || 'singular-plural';
        const used = new Set(Object.values(caseEndings || {}).filter(Boolean));
        const vowels = {
            standard: ['a', 'e', 'i', 'o', 'u'],
            minimal: ['a', 'i', 'u'],
            extended: ['a', 'e', 'i', 'o', 'u', 'y', 'ø', 'æ']
        } [config.vowels] || ['a', 'e', 'i', 'o', 'u'];
        const factory = window.ConlangPhonology.createWordFactory({
            consonants: config.consonants,
            vowels: config.vowels,
            mean: 1,
            seed: `${config.seed}|morphology|number-markers`
        });
        result.plural = generateOneSyllableEnding(factory, vowels, used);
        if (number === 'singular-plural-dual') result.dual = generateOneSyllableEnding(factory, vowels, used);
        return result;
    }

    function generateMorphemeInventory(config, morphologyModel) {
        const caseEndings = generateCaseEndings(config, morphologyModel);
        const numberMarkers = generateNumberMarkers(config, caseEndings);
        return Object.freeze({
            relationModel: morphologyModel.relationModel,
            alignment: morphologyModel.alignment,
            caseSystem: morphologyModel.caseSystem,
            cases: morphologyModel.cases.slice(),
            caseEndings,
            numberMarkers,
            stemRule: morphologyModel.stemRule,
            generatedAt: 'language-generation'
        });
    }

    function generate(c) {
        if (!vocabulary.length) throw new Error('Vocabulary is not loaded yet.');
        const config = {
            region: Array.isArray(c?.region) ? c.region : [],
            culture: Array.isArray(c?.culture) ? c.culture : [],
            biome: Array.isArray(c?.biome) ? c.biome : [],
            temporal_setting: Array.isArray(c?.temporal_setting) ? c.temporal_setting : [],
            tags: Array.isArray(c?.tags) ? c.tags : [],
            vowels: c?.vowels || 'standard',
            consonants: c?.consonants || 'european',
            mean: Number(c?.mean) || 2.2,
            seed: String(c?.seed ?? 'auto'),
            order: c?.order || 'SVO',
            morphology: c?.morphology || 'isolating',
            articles: c?.articles || 'none',
            plural: c?.plural || 'suffix',
            number: c?.number || 'singular-plural',
            relations: c?.relations || 'prepositions',
            caseSystem: c?.caseSystem || 'moderate',
            adjectivePosition: c?.adjectivePosition || c?.adjPosition || 'after'
        };
        const morphologyModel = buildMorphologyModel(config);
        const morphemes = generateMorphemeInventory(config, morphologyModel);
        const selected = selectVocabulary(config);
        const make = window.ConlangPhonology.createWordFactory(config);
        const seen = new Set();
        generated = selected.map(e => {
            const x = {
                ...e
            };
            if (!x.conlang || seen.has(x.conlang)) x.conlang = make({
                short: isShortWord(x)
            });
            seen.add(x.conlang);
            return x;
        });
        return {
            config,
            morphology: morphologyModel,
            morphemes,
            lexicon: generated.slice()
        };
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
        if (window.ConlangPhonology?.createWordFactory) return window.ConlangPhonology.createWordFactory({
            consonants: modelKey,
            vowels,
            mean: Math.max(1, Math.min(4, mean * 0.8)),
            seed: requestedSeed + '|language-name'
        })();
        return 'language-' + String(Math.floor(Math.random() * 900) + 100);
    }
    window.ConlangEngine = Object.freeze({
        version: VERSION,
        generate,
        loadVocabulary,
        getVocabulary: () => vocabulary.slice(),
        getGenerated: () => generated.slice(),
        languageName,
        buildMorphologyModel,
        generateMorphemeInventory
    });
})();
