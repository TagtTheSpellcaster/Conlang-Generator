/* ConLang Generator — vocabulary-driven engine v0.7.2 */
(() => {
    'use strict';

    const VERSION = '0.7.2';
    const $ = id => document.getElementById(id);

    const arr = value =>
        Array.isArray(value)
            ? value.filter(Boolean).map(String)
            : value == null || value === ''
                ? []
                : [String(value)];

    const uniq = values => [...new Set(values)];
    const norm = value => String(value ?? '').toLowerCase().replace(/^to\s+/, '').trim();
    const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));

    const P = {
        vowels: {
            standard: ['a', 'e', 'i', 'o', 'u'],
            minimal: ['a', 'i', 'u'],
            extended: ['a', 'e', 'i', 'o', 'u', 'y', 'ø', 'æ']
        },
        consonants: {
            balanced: ['p', 't', 'k', 'b', 'd', 'g', 'm', 'n', 's', 'r', 'l', 'f', 'v'],
            guttural: ['k', 'q', 'x', 'g', 'r', 'kh', 'gh', 't', 'd'],
            sibilant: ['s', 'z', 'sh', 'zh', 'f', 'v', 'r', 'l', 'th'],
            soft: ['m', 'n', 'l', 'r', 'w', 'j', 'v', 'dh']
        }
    };

    const S = {
        standard: ['CV', 'CVC', 'CVV', 'VC'],
        musical: ['CV', 'V', 'CVV', 'CVC'],
        guttural: ['CVC', 'CCVC', 'CVCC'],
        soft: ['CV', 'CVV', 'CVC', 'V']
    };

    let vocabulary = [];
    let generated = null;

    function hash(text) {
        let h = 2166136261;
        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
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

    function choice(values, random) {
        return values.length ? values[Math.floor(random() * values.length)] : null;
    }

    function selected(id) {
        const element = $(id);
        return element
            ? [...element.selectedOptions].map(option => option.value).filter(Boolean)
            : [];
    }

    function vals(field) {
        return uniq(vocabulary.flatMap(entry => arr(entry[field])))
            .sort((a, b) => a.localeCompare(b));
    }

    function populate() {
        ['region', 'culture', 'biome', 'temporal_setting', 'tags'].forEach(field => {
            const element = $(field);
            if (!element) return;

            element.innerHTML =
                '<option value="">Any</option>' +
                vals(field)
                    .map(value => `<option value="${esc(value)}">${esc(value)}</option>`)
                    .join('');
        });
    }

    function randomize() {
        ['region', 'culture', 'biome', 'temporal_setting', 'tags'].forEach(id => {
            const element = $(id);
            if (element && element.options.length > 1) {
                element.value = choice(
                    [...element.options].slice(1).map(option => option.value),
                    Math.random
                );
            }
        });

        [
            'vowels', 'consonants', 'word-order', 'morphology',
            'adj-position', 'articles', 'plural', 'relations'
        ].forEach(id => {
            const element = $(id);
            if (element) {
                element.value = choice([...element.options].map(option => option.value), Math.random);
            }
        });

        $('mean').value = (1 + Math.random() * 2.5).toFixed(1);
        $('seed').value = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    }

    function configFromUI() {
        return {
            region: selected('region'),
            culture: selected('culture'),
            biome: selected('biome'),
            temporal_setting: selected('temporal_setting'),
            tags: selected('tags'),
            vowels: $('vowels').value,
            consonants: $('consonants').value,
            mean: Math.max(1, Math.min(5, Number($('mean').value) || 2.2)),
            seed: $('seed').value.trim() || String(Date.now()),
            order: $('word-order').value,
            morphology: $('morphology').value,
            adjectivePosition: $('adj-position').value,
            articles: $('articles').value,
            plural: $('plural').value,
            relations: $('relations').value
        };
    }

    function score(entry, config) {
        let value = entry.scope === 'universal' ? 1 : 0;

        for (const field of ['region', 'culture', 'biome', 'temporal_setting', 'tags']) {
            if (!config[field].length) continue;

            const values = arr(entry[field]);
            value += values.some(item => config[field].includes(item))
                ? field === 'tags' ? 1.25 : 2
                : -0.15;
        }

        return value;
    }

    function classify(entry) {
        const type = norm(entry.word_type);
        const category = norm(entry.category);

        if (type === 'verb' || category.includes('verb')) return 'verb';
        if (type === 'adjective' || category.includes('adjective')) return 'adjective';
        if (type === 'pronoun' || category.includes('pronoun')) return 'pronoun';
        if (
            type === 'preposition' ||
            type === 'particle' ||
            type === 'conjunction' ||
            type === 'determiner' ||
            type === 'interrogative' ||
            type === 'adverb' ||
            category.includes('function')
        ) return 'function';
        if (type === 'number' || category.includes('number') || category.includes('quantity')) return 'number';

        return 'noun';
    }

    function metadata(entry) {
        return {
            tags: new Set(arr(entry.tags).map(norm)),
            features: new Set(arr(entry.features).map(norm)),
            groups: new Set([
                norm(entry.semantic_group),
                norm(entry.category)
            ].filter(Boolean))
        };
    }

    function hasAny(set, values) {
        return values.some(value => set.has(norm(value)));
    }

    function hasAll(set, values) {
        return values.every(value => set.has(norm(value)));
    }

    function conceptEquals(entry, concepts) {
        const concept = norm(entry.concept);
        return concepts.some(value => concept === norm(value));
    }

    /*
     * Strict semantic selector.
     * Exact concepts are checked before semantic metadata. Metadata values
     * are matched as complete values, never as substrings. A grammatical
     * kind is a hard constraint whenever one is supplied.
     */
    function selectCandidates(lexicon, query) {
        let candidates = lexicon.slice();

        if (query.kinds?.length) {
            candidates = candidates.filter(entry => query.kinds.includes(entry.kind));
        }

        if (query.concepts?.length) {
            const exact = candidates.filter(entry => conceptEquals(entry, query.concepts));
            if (exact.length) return exact;
        }

        return candidates.filter(entry => {
            const meta = metadata(entry);

            if (query.anyTags?.length && !hasAny(meta.tags, query.anyTags)) return false;
            if (query.allTags?.length && !hasAll(meta.tags, query.allTags)) return false;
            if (query.anyFeatures?.length && !hasAny(meta.features, query.anyFeatures)) return false;
            if (query.allFeatures?.length && !hasAll(meta.features, query.allFeatures)) return false;
            if (query.anyGroups?.length && !hasAny(meta.groups, query.anyGroups)) return false;
            if (query.allGroups?.length && !hasAll(meta.groups, query.allGroups)) return false;
            if (query.excludeTags?.length && hasAny(meta.tags, query.excludeTags)) return false;
            if (query.excludeFeatures?.length && hasAny(meta.features, query.excludeFeatures)) return false;

            return true;
        });
    }

    function selectOne(lexicon, random, query) {
        const candidates = selectCandidates(lexicon, query);
        return candidates.length ? choice(candidates, random) : null;
    }

    function factory(config, salt) {
        const vowels = P.vowels[config.vowels] || P.vowels.standard;
        const consonants = P.consonants[config.consonants] || P.consonants.balanced;

        const style =
            config.consonants === 'guttural'
                ? 'guttural'
                : config.consonants === 'soft'
                    ? 'soft'
                    : config.vowels === 'extended'
                        ? 'musical'
                        : 'standard';

        const syllables = S[style];
        const random = rng(`${config.seed}|${salt}`);
        const used = new Set();

        const build = pattern =>
            pattern.replace(/[CV]/g, symbol =>
                symbol === 'C'
                    ? choice(consonants, random)
                    : choice(vowels, random)
            );

        return () => {
            for (let attempt = 0; attempt < 300; attempt++) {
                let word = '';
                const count = Math.max(
                    1,
                    Math.min(5, Math.round(config.mean + (random() - 0.5) * 1.6))
                );

                for (let i = 0; i < count; i++) {
                    word += build(choice(syllables, random));
                }

                if (word.length > 1 && !used.has(word)) {
                    used.add(word);
                    return word.toLowerCase();
                }
            }

            return `${build('CVC')}${Math.floor(random() * 10)}`;
        };
    }

    function weighted(config, ranked, count) {
        const random = rng(`${config.seed}|lexicon`);
        const pool = ranked.slice();
        const result = [];

        while (pool.length && result.length < count) {
            const weights = pool.map(item =>
                Math.exp(Math.max(-2, Math.min(7, item.score)) * 0.72)
            );

            const total = weights.reduce((sum, value) => sum + value, 0);
            let cursor = random() * total;
            let index = pool.length - 1;

            for (let i = 0; i < weights.length; i++) {
                cursor -= weights[i];
                if (cursor <= 0) {
                    index = i;
                    break;
                }
            }

            result.push(pool[index]);
            pool.splice(index, 1);
        }

        return result;
    }

    const REQUIRED_CONCEPTS = [
        'i', 'you', 'we', 'they', 'me', 'my',
        'this', 'that', 'here', 'there',
        'today', 'tomorrow', 'yesterday',
        'who', 'what', 'where', 'when', 'why', 'how', 'many',
        'all', 'nothing', 'not', 'can', 'have', 'be',
        'to', 'from', 'with', 'in', 'the'
    ];

    const SAMPLE_SEMANTIC_QUERIES = [
        { kinds: ['noun'], anyTags: ['person', 'social_role'], excludeTags: ['inanimate_object'] },
        { kinds: ['noun'], anyTags: ['relationship'] },
        { kinds: ['noun'], anyTags: ['inanimate_object'], excludeTags: ['person', 'living_being'] },
        { kinds: ['noun'], anyTags: ['natural_element'] },
        { kinds: ['noun'], anyTags: ['food'] },
        { kinds: ['noun'], anyTags: ['liquid'] },
        { kinds: ['noun'], anyTags: ['animal'] },
        { kinds: ['noun'], anyTags: ['living_being'] },
        { kinds: ['noun'], anyTags: ['resource'] },
        { kinds: ['noun'], anyTags: ['vital_resource'] },
        { kinds: ['noun'], anyTags: ['threat'] },
        { kinds: ['noun'], anyTags: ['place', 'geographical_place', 'geographical_feature'] },
        { kinds: ['noun'], anyTags: ['cosmic'] },
        { kinds: ['noun'], anyTags: ['natural_zone'] },
        { kinds: ['noun'], anyTags: ['body_part'] },
        { kinds: ['noun'], anyTags: ['path'] },
        { kinds: ['noun'], anyTags: ['entity'] },
        { kinds: ['adjective'], anyTags: ['physical'] },
        { kinds: ['adjective'], anyFeatures: ['large', 'quantity'] },
        { kinds: ['adjective'], anyFeatures: ['small', 'quantity'] },
        { kinds: ['adjective'], anyFeatures: ['readiness'] },
        { kinds: ['noun'], anyFeatures: ['need', 'bodily_function'] },
        { kinds: ['verb'], anyTags: ['copula'] },
        { kinds: ['verb'], anyTags: ['consumption'] },
        { kinds: ['verb'], anyTags: ['perception'] },
        { kinds: ['verb'], anyTags: ['violence', 'hunting'] },
        { kinds: ['verb'], anyTags: ['activity', 'action'] },
        { kinds: ['verb'], anyTags: ['emotion_positive'] },
        { kinds: ['verb'], anyTags: ['emotion_negative'] },
        { kinds: ['verb'], anyTags: ['movement'] },
        { kinds: ['verb'], anyTags: ['air_water_movement'] },
        { kinds: ['verb'], anyTags: ['ground_movement'] },
        { kinds: ['verb'], anyTags: ['gravity'] },
        { kinds: ['verb'], anyTags: ['stasis'] },
        { kinds: ['verb'], anyTags: ['volition'] },
        { kinds: ['verb'], anyTags: ['cognition'] },
        { kinds: ['verb'], anyTags: ['help'] },
        { kinds: ['verb'], anyTags: ['prohibition'] },
        { kinds: ['verb'], anyTags: ['pain'] },
        { kinds: ['verb'], anyTags: ['rest'] },
        { kinds: ['verb'], anyTags: ['process'] },
        { kinds: ['verb'], anyTags: ['event', 'change', 'activity'] }
    ];

    function isRequired(entry) {
        const concept = norm(entry.concept);
        return REQUIRED_CONCEPTS.some(required =>
            concept === norm(required) || concept === norm(`to ${required}`)
        );
    }

    function addSemanticRequirements(ranked, selected, random) {
        const chosen = new Set(selected.map(item => item.entry.id));
        const lexicalEntries = ranked.map(item => ({
            ...item.entry,
            kind: classify(item.entry)
        }));

        for (const query of SAMPLE_SEMANTIC_QUERIES) {
            const candidates = selectCandidates(lexicalEntries, query);
            if (!candidates.length) continue;

            const candidate = choice(candidates, random);
            const original = ranked.find(item => item.entry.id === candidate.id);

            if (original && !chosen.has(original.entry.id)) {
                selected.push(original);
                chosen.add(original.entry.id);
            }
        }

        return selected;
    }

    function generateLexicon(config) {
        const make = factory(config, 'lexicon');

        const ranked = vocabulary
            .filter(entry => String(entry.concept || '').trim())
            .map(entry => ({
                entry,
                score: score(entry, config)
            }));

        const required = ranked.filter(item => isRequired(item.entry));
        const selected = required.slice();

        addSemanticRequirements(
            ranked,
            selected,
            rng(`${config.seed}|semantic-requirements`)
        );

        const target = Math.min(600, ranked.length);
        const selectedIds = new Set(selected.map(item => item.entry.id));
        const remaining = ranked.filter(item => !selectedIds.has(item.entry.id));

        selected.push(...weighted(
            config,
            remaining,
            Math.max(0, target - selected.length)
        ));

        const seen = new Set();
        const result = [];

        for (const item of selected) {
            const entry = item.entry;
            const key = `${norm(entry.concept)}|${entry.id || ''}`;

            if (seen.has(key)) continue;
            seen.add(key);

            result.push({
                ...entry,
                english: String(entry.concept || '').replace(/^to\s+/i, '').trim(),
                kind: classify(entry),
                word: make(),
                score: score(entry, config)
            });
        }

        return result;
    }

    /* Strict semantic helpers used by the 50 sample sentence frames. */
    function noun(lexicon, random, terms) {
        const lower = terms.map(norm);

        if (lower.includes('person') || lower.includes('occupation') || lower.includes('profession') || lower.includes('role')) {
            return selectOne(lexicon, random, {
                kinds: ['noun'],
                anyTags: ['person', 'social_role'],
                excludeTags: ['inanimate_object']
            });
        }

        if (lower.includes('animal')) {
            return selectOne(lexicon, random, { kinds: ['noun'], anyTags: ['animal'] });
        }

        if (lower.includes('living_being')) {
            return selectOne(lexicon, random, {
                kinds: ['noun'],
                anyTags: ['living_being'],
                excludeTags: ['inanimate_object']
            });
        }

        if (lower.includes('inanimate_object') || lower.includes('object')) {
            return selectOne(lexicon, random, {
                kinds: ['noun'],
                anyTags: ['inanimate_object'],
                excludeTags: ['person', 'living_being']
            });
        }

        if (lower.includes('natural_zone')) {
            return selectOne(lexicon, random, { kinds: ['noun'], anyTags: ['natural_zone'] });
        }

        if (lower.includes('geographical_feature') || lower.includes('geographical_place')) {
            return selectOne(lexicon, random, {
                kinds: ['noun'],
                anyTags: ['geographical_feature', 'geographical_place']
            });
        }

        if (lower.includes('place')) {
            return selectOne(lexicon, random, {
                kinds: ['noun'],
                anyTags: ['place', 'geographical_place', 'geographical_feature']
            });
        }

        if (lower.includes('liquid')) {
            return selectOne(lexicon, random, { kinds: ['noun'], anyTags: ['liquid'] });
        }

        if (lower.includes('food')) {
            return selectOne(lexicon, random, { kinds: ['noun'], anyTags: ['food'] });
        }

        if (lower.includes('vital_resource') || lower.includes('fundamental_resource')) {
            return selectOne(lexicon, random, {
                kinds: ['noun'],
                anyTags: ['vital_resource', 'fundamental_resource']
            });
        }

        if (lower.includes('resource')) {
            return selectOne(lexicon, random, { kinds: ['noun'], anyTags: ['resource'] });
        }

        if (lower.includes('threat') || lower.includes('danger')) {
            return selectOne(lexicon, random, { kinds: ['noun'], anyTags: ['threat'] });
        }

        if (lower.includes('body_part')) {
            return selectOne(lexicon, random, { kinds: ['noun'], anyTags: ['body_part'] });
        }

        if (lower.includes('path') || lower.includes('road')) {
            return selectOne(lexicon, random, { kinds: ['noun'], anyTags: ['path'] });
        }

        if (lower.includes('cosmic') || lower.includes('space') || lower.includes('astronomical')) {
            return selectOne(lexicon, random, { kinds: ['noun'], anyTags: ['cosmic'] });
        }

        if (lower.includes('natural_element')) {
            return selectOne(lexicon, random, { kinds: ['noun'], anyTags: ['natural_element'] });
        }

        if (lower.includes('relationship') || lower.includes('friend') || lower.includes('kinship')) {
            return selectOne(lexicon, random, { kinds: ['noun'], anyTags: ['relationship'] });
        }

        if (lower.includes('need') || lower.includes('bodily_function')) {
            return selectOne(lexicon, random, {
                kinds: ['noun'],
                anyFeatures: ['need', 'bodily_function']
            });
        }

        if (lower.includes('entity')) {
            return selectOne(lexicon, random, { kinds: ['noun'], anyTags: ['entity'] });
        }

        return selectOne(lexicon, random, { kinds: ['noun'], anyTags: terms });
    }

    function adjective(lexicon, random, terms) {
        const lower = terms.map(norm);

        if (lower.includes('physical')) {
            return selectOne(lexicon, random, { kinds: ['adjective'], anyTags: ['physical'] });
        }

        if (lower.includes('large') || lower.includes('many')) {
            return selectOne(lexicon, random, {
                kinds: ['adjective', 'function'],
                anyFeatures: ['large', 'quantity']
            });
        }

        if (lower.includes('small') || lower.includes('few')) {
            return selectOne(lexicon, random, {
                kinds: ['adjective', 'function'],
                anyFeatures: ['small', 'quantity']
            });
        }

        if (lower.includes('readiness') || lower.includes('ready')) {
            return selectOne(lexicon, random, {
                kinds: ['adjective'],
                anyFeatures: ['readiness']
            });
        }

        return selectOne(lexicon, random, { kinds: ['adjective'], anyTags: terms });
    }

    function verbCandidate(lexicon, random, terms) {
        const lower = terms.map(norm);

        if (lower.includes('be') || lower.includes('copula')) {
            return selectOne(lexicon, random, {
                kinds: ['verb'],
                concepts: ['be', 'to be'],
                anyTags: ['copula']
            }) || selectOne(lexicon, random, {
                kinds: ['verb'],
                anyTags: ['copula']
            });
        }

        if (lower.includes('air') || lower.includes('water')) {
            return selectOne(lexicon, random, {
                kinds: ['verb'],
                anyTags: ['air_water_movement']
            });
        }

        if (lower.includes('ground') || lower.includes('locomotion')) {
            return selectOne(lexicon, random, {
                kinds: ['verb'],
                anyTags: ['ground_movement']
            });
        }

        if (lower.includes('gravity') || lower.includes('fall')) {
            return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['gravity'] });
        }

        if (lower.includes('stasis') || lower.includes('stop')) {
            return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['stasis'] });
        }

        if (lower.includes('consumption')) return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['consumption'] });
        if (lower.includes('perception')) return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['perception'] });
        if (lower.includes('violence') || lower.includes('hunting')) return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['violence', 'hunting'] });
        if (lower.includes('emotion_positive')) return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['emotion_positive'] });
        if (lower.includes('emotion_negative')) return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['emotion_negative'] });
        if (lower.includes('volition') || lower.includes('desire')) return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['volition'] });
        if (lower.includes('cognition') || lower.includes('know')) return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['cognition'] });
        if (lower.includes('help')) return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['help'] });
        if (lower.includes('prohibition')) return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['prohibition'] });
        if (lower.includes('pain')) return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['pain'] });
        if (lower.includes('rest')) return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['rest'] });
        if (lower.includes('process')) return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['process'] });
        if (lower.includes('activity') || lower.includes('action')) return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['activity', 'action'] });
        if (lower.includes('event') || lower.includes('change')) return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['event', 'change', 'activity'] });
        if (lower.includes('movement') || lower.includes('motion') || lower.includes('natural_movement')) return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['movement'] });
        if (lower.includes('existence')) return selectOne(lexicon, random, { kinds: ['verb'], anyTags: ['existence'] });

        return selectOne(lexicon, random, { kinds: ['verb'], anyTags: terms });
    }

    function functionWord(lexicon, random, terms) {
        const exact = selectOne(lexicon, random, {
            kinds: ['function', 'pronoun'],
            concepts: terms
        });

        if (exact) return exact;

        return selectOne(lexicon, random, {
            kinds: ['function', 'pronoun'],
            anyTags: terms
        });
    }

    function pronoun(lexicon, random, terms) {
        const exact = selectOne(lexicon, random, {
            kinds: ['pronoun', 'function'],
            concepts: terms
        });

        if (exact) return exact;

        const lower = terms.map(norm);

        if (lower.includes('i') || lower.includes('me')) {
            return selectOne(lexicon, random, {
                kinds: ['pronoun'],
                anyFeatures: ['first_person']
            });
        }

        if (lower.includes('you')) {
            return selectOne(lexicon, random, {
                kinds: ['pronoun'],
                anyFeatures: ['second_person']
            });
        }

        return functionWord(lexicon, random, terms);
    }

    function applyVerbMorphology(entry, config) {
        if (!entry) return null;
        if (config.morphology === 'isolating') return entry.word;
        if (config.morphology === 'agglutinative') return `${entry.word}-ta`;
        if (config.morphology === 'fusional') return `${entry.word}a`;
        return entry.word;
    }

    function token(word, english) {
        return { word, english };
    }

    function placeholder(label) {
        return `<${label}>`;
    }

    function renderSentenceTokens(tokens) {
        return tokens.map(item => {
            if (item.placeholder) return `<span class="sample-placeholder">${esc(item.text)}</span>`;
            return `<span class="sample-word" title="${esc(item.english)}" data-meaning="${esc(item.english)}">${esc(item.word)}</span>`;
        }).join(' ');
    }

    function samples(config, lexicon) {
        const random = rng(`${config.seed}|sentences`);
        const N = terms => noun(lexicon, random, terms);
        const A = terms => adjective(lexicon, random, terms);
        const V = terms => verbCandidate(lexicon, random, terms);
        const F = terms => functionWord(lexicon, random, terms);
        const Pn = terms => pronoun(lexicon, random, terms);
        const ph = label => ({ placeholder: true, text: placeholder(label) });
        const subject = entry => entry ? token(entry.word, entry.english) : ph('subject');
        const verb = (entry, label) => entry ? token(applyVerbMorphology(entry, config), entry.english) : ph(label);

        const I = Pn(['i']);
        const YOU = Pn(['you']);
        const WE = Pn(['we']);
        const THEY = Pn(['they']);
        const ME = Pn(['me']);
        const MY = F(['my']);
        const THIS = Pn(['this']);
        const THAT = Pn(['that']);
        const WHO = Pn(['who']);
        const WHAT = Pn(['what']);
        const WHERE = Pn(['where']);
        const WHEN = Pn(['when']);
        const WHY = Pn(['why']);
        const HOW = Pn(['how']);
        const MANY = Pn(['many']);
        const ALL = Pn(['all']);
        const NOTHING = Pn(['nothing']);

        const BE = V(['be']);
        const HAVE = V(['have', 'possession']);
        const NOT = F(['not']);
        const CAN = F(['can']);
        const TO = F(['to']);
        const FROM = F(['from']);
        const WITH = F(['with']);
        const IN = F(['in']);
        const THE = F(['the']);
        const HERE = F(['here']);
        const THERE = F(['there']);
        const TODAY = F(['today']);
        const TOMORROW = F(['tomorrow']);
        const YESTERDAY = F(['yesterday']);

        const role = N(['person', 'occupation', 'profession', 'role']);
        const relation = N(['relationship']);
        const natural1 = N(['natural_element']);
        const natural2 = N(['natural_element']);
        const food = N(['food']);
        const liquid = N(['liquid']);
        const living1 = N(['living_being']);
        const living2 = N(['living_being']);
        const resource = N(['vital_resource', 'fundamental_resource']);
        const threat = N(['threat']);
        const place = N(['geographical_feature', 'geographical_place']);
        const cosmic = N(['cosmic']);
        const inert = N(['inanimate_object']);
        const direction = N(['entity']);
        const zone = N(['natural_zone']);
        const organ = N(['body_part']);
        const path = N(['path']);
        const need = N(['need', 'bodily_function']);
        const entity = N(['entity']);

        const consume = V(['consumption']);
        const perception = V(['perception']);
        const violence = V(['violence', 'hunting']);
        const generic = V(['activity', 'action']);
        const emotionPos = V(['emotion_positive']);
        const emotionNeg = V(['emotion_negative']);
        const movement = V(['movement']);
        const naturalMove = V(['natural_movement']);
        const gravity = V(['gravity']);
        const airWater = V(['air', 'water']);
        const ground = V(['ground']);
        const stop = V(['stasis']);
        const moveImp = V(['movement']);
        const futureMove = V(['movement']);
        const will = V(['volition']);
        const limited = V(['activity', 'action']);
        const cognition = V(['cognition']);
        const help = V(['help']);
        const forbidden = V(['prohibition']);
        const pain = V(['pain']);
        const rest = V(['rest']);
        const negativeExist = V(['existence']);
        const presentAct = V(['activity', 'action']);
        const futureAct = V(['activity', 'action']);
        const pastEvent = V(['event', 'change', 'activity']);
        const process = V(['process']);
        const quantityLarge = A(['large']);
        const quantitySmall = A(['small']);
        const readiness = A(['readiness']);

        const out = [];
        const add = (english, parts) => ({ ...parts, english });

        out.push(add('I am <name/role>.', { S: subject(I), V: verb(BE, 'be'), O: ph('name/role') }));
        out.push(add('You are my <relationship/friendship>.', { S: subject(YOU), V: verb(BE, 'be'), O: token(MY?.word || placeholder('my'), 'my'), extra: [ph('relationship/friendship')], extraIndex: 3 }));
        out.push(add('This is <near object>.', { S: subject(THIS), V: verb(BE, 'be'), O: ph('near object') }));
        out.push(add('That is <distant object>.', { S: subject(THAT), V: verb(BE, 'be'), O: ph('distant object') }));
        out.push(add('We are <near place adverb>.', { S: subject(WE), V: verb(BE, 'be'), O: ph('near place adverb') }));
        out.push(add('They are <distant place adverb>.', { S: subject(THEY), V: verb(BE, 'be'), O: ph('distant place adverb') }));
        out.push(add('I have <fundamental resource>.', { S: subject(I), V: verb(HAVE, 'have'), O: ph('fundamental resource') }));
        out.push(add('You have <fundamental resource>.', { S: subject(YOU), V: verb(HAVE, 'have'), O: ph('fundamental resource') }));
        out.push(add('<natural element> is <physical adjective 1>.', { S: ph('natural element'), V: verb(BE, 'be'), O: ph('physical adjective 1') }));
        out.push(add('<natural element> is <physical adjective 2>.', { S: ph('natural element'), V: verb(BE, 'be'), O: ph('physical adjective 2') }));
        out.push(add('<living being 1> <consumption verb> <food resource>.', { S: subject(living1), V: verb(consume, 'consumption verb'), O: ph('food resource') }));
        out.push(add('<living being 2> <consumption verb> <liquid>.', { S: subject(living2), V: verb(consume, 'consumption verb'), O: ph('liquid') }));
        out.push(add('I <perception verb> you.', { S: subject(I), V: verb(perception, 'perception verb'), O: subject(YOU) }));
        out.push(add('You <perception verb> me.', { S: subject(YOU), V: verb(perception, 'perception verb'), O: subject(ME) }));
        out.push(add('<living being 1> <violence/hunting verb> <living being 2>.', { S: subject(living1), V: verb(violence, 'violence/hunting verb'), O: subject(living2) }));
        out.push(add('We <generic action verb> this.', { S: subject(WE), V: verb(generic, 'generic action verb'), O: subject(THIS) }));
        out.push(add('I <positive emotion verb> <living being 1>.', { S: subject(I), V: verb(emotionPos, 'positive emotion verb'), O: subject(living1) }));
        out.push(add('I <negative emotion verb> <threat>.', { S: subject(I), V: verb(emotionNeg, 'negative emotion verb'), O: ph('threat') }));
        out.push(add('I <movement verb> toward <geographical place>.', { S: subject(I), V: verb(movement, 'movement verb'), O: ph('geographical place'), extra: [token(TO?.word || placeholder('to'), 'to')], extraIndex: 2 }));
        out.push(add('You <movement verb> from <geographical place>.', { S: subject(YOU), V: verb(movement, 'movement verb'), O: ph('geographical place'), extra: [token(FROM?.word || placeholder('from'), 'from')], extraIndex: 2 }));
        out.push(add('<cosmic element> <natural movement verb>.', { S: ph('cosmic element'), V: verb(naturalMove, 'natural movement verb') }));
        out.push(add('<inanimate object> <gravity movement verb>.', { S: ph('inanimate object'), V: verb(gravity, 'gravity movement verb') }));
        out.push(add('<animal> <air/water movement verb> in <vertical direction>.', { S: ph('animal'), V: verb(airWater, 'air/water movement verb'), O: ph('vertical direction'), extra: [token(IN?.word || placeholder('in'), 'in')], extraIndex: 2 }));
        out.push(add('<living being> <ground movement verb> in the <natural zone>.', { S: ph('living being'), V: verb(ground, 'ground movement verb'), O: ph('natural zone'), extra: [token(IN?.word || placeholder('in'), 'in'), token(THE?.word || placeholder('the'), 'the')], extraIndex: 2 }));
        out.push(add('<stop imperative verb> here.', { V: verb(stop, 'stop imperative verb'), O: subject(HERE) }));
        out.push(add('<movement imperative verb> with me.', { V: verb(moveImp, 'movement imperative verb'), O: subject(ME), extra: [token(WITH?.word || placeholder('with'), 'with')], extraIndex: 1 }));
        out.push(add('Who are you?', { S: subject(WHO), V: verb(BE, 'be'), O: subject(YOU) }));
        out.push(add('What is this?', { S: subject(WHAT), V: verb(BE, 'be'), O: subject(THIS) }));
        out.push(add('Where are we?', { S: subject(WHERE), V: verb(BE, 'be'), O: subject(WE) }));
        out.push(add('When <future movement verb> you?', { S: subject(WHEN), V: verb(futureMove, 'future movement verb'), O: subject(YOU) }));
        out.push(add('Why <action verb> this?', { S: subject(WHY), V: verb(generic, 'action verb'), O: subject(THIS) }));
        out.push(add('How many are <plural entities>?', { S: token(MANY?.word || placeholder('how many'), 'how many'), V: verb(BE, 'be'), O: ph('plural entities') }));
        out.push(add('How is this <process verb>?', { S: subject(HOW), V: verb(process, 'process verb'), O: subject(THIS) }));
        out.push(add('Where is <vital resource>?', { S: subject(WHERE), V: verb(BE, 'be'), O: ph('vital resource') }));
        out.push(add('I do not <will verb> this.', { S: subject(I), V: verb(will, 'will verb'), O: subject(THIS), extra: [token(NOT?.word || placeholder('not'), 'not')], extraIndex: 1 }));
        out.push(add('You cannot <limited action verb>.', { S: subject(YOU), V: verb(limited, 'limited action verb'), extra: [token(NOT?.word || placeholder('not'), 'not'), token(CAN?.word || placeholder('can'), 'can')], extraIndex: 1 }));
        out.push(add('I do not <cognition verb>.', { S: subject(I), V: verb(cognition, 'cognition verb'), extra: [token(NOT?.word || placeholder('not'), 'not')], extraIndex: 1 }));
        out.push(add('I <cognition verb> this <path/road>.', { S: subject(I), V: verb(cognition, 'cognition verb'), O: subject(THIS), extra: [ph('path/road')], extraIndex: 3 }));
        out.push(add('I can <help action verb> you.', { S: subject(I), V: verb(help, 'help action verb'), O: subject(YOU), extra: [token(CAN?.word || placeholder('can'), 'can')], extraIndex: 1 }));
        out.push(add('Do not <forbidden action verb> this.', { V: verb(forbidden, 'forbidden action verb'), O: subject(THIS), extra: [token(NOT?.word || placeholder('not'), 'not')], extraIndex: 0 }));
        out.push(add('I have <physical need/state>.', { S: subject(I), V: verb(HAVE, 'have'), O: ph('physical need/state') }));
        out.push(add('My <organ/body part> <pain verb>.', { S: token(MY?.word || placeholder('my'), 'my'), V: verb(pain, 'pain verb'), O: ph('organ/body part') }));
        out.push(add('I <will verb> <rest verb>.', { S: subject(I), V: verb(will, 'will verb'), O: verb(rest, 'rest verb') }));
        out.push(add('This is <large quantity>.', { S: subject(THIS), V: verb(BE, 'be'), O: quantityLarge ? token(quantityLarge.word, quantityLarge.english) : ph('large quantity') }));
        out.push(add('This is <small quantity>.', { S: subject(THIS), V: verb(BE, 'be'), O: quantitySmall ? token(quantitySmall.word, quantitySmall.english) : ph('small quantity') }));
        out.push(add('Everything is <readiness state>.', { S: token(ALL?.word || placeholder('everything'), 'everything'), V: verb(BE, 'be'), O: readiness ? token(readiness.word, readiness.english) : ph('readiness state') }));
        out.push(add('Nothing <negative existence verb>.', { S: token(NOTHING?.word || placeholder('nothing'), 'nothing'), V: verb(negativeExist, 'negative existence verb') }));
        out.push(add('Today we <present activity verb>.', { S: subject(WE), V: verb(presentAct, 'present activity verb'), extra: [token(TODAY?.word || placeholder('today'), 'today')], extraIndex: 0 }));
        out.push(add('Tomorrow we <future activity verb>.', { S: subject(WE), V: verb(futureAct, 'future activity verb'), extra: [token(TOMORROW?.word || placeholder('tomorrow'), 'tomorrow')], extraIndex: 0 }));
        out.push(add('Yesterday <past event verb> <entity>.', { S: token(YESTERDAY?.word || placeholder('yesterday'), 'yesterday'), V: verb(pastEvent, 'past event verb'), O: ph('entity') }));

        return out.map((sentence, index) => ({ ...sentence, number: index + 1 }));
    }

    function orderTokens(sentence, config) {
        const core = { S: sentence.S, V: sentence.V, O: sentence.O };
        const ordered = config.order.split('').map(key => core[key]).filter(Boolean);
        const extras = sentence.extra || [];

        if (extras.length) {
            ordered.splice(
                Math.min(ordered.length, sentence.extraIndex ?? ordered.length),
                0,
                ...extras
            );
        }

        return ordered;
    }

    function sentenceHtml(sentence, config) {
        return renderSentenceTokens(orderTokens(sentence, config));
    }

    function ensureStyles() {
        if ($('sample-sentence-styles')) return;

        const style = document.createElement('style');
        style.id = 'sample-sentence-styles';
        style.textContent = `
            .sample-list{display:grid;gap:10px}
            .sample-pill{background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:10px 16px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;line-height:1.45}
            .sample-pill .sample-number{font-weight:700;color:var(--accent);min-width:26px}
            .sample-pill .sample-english{color:var(--text);font-weight:500}
            .sample-pill .sample-arrow{color:var(--muted)}
            .sample-pill .sample-conlang{font-weight:700}
            .sample-word{position:relative;cursor:help;border-bottom:1px dotted var(--muted)}
            .sample-placeholder{color:var(--muted);font-weight:500}
            .sample-tooltip{position:fixed;z-index:9999;pointer-events:none;background:#070b14;color:#fff;border:1px solid var(--line);border-radius:6px;padding:5px 8px;font-size:12px;box-shadow:0 4px 18px rgba(0,0,0,.35);display:none}
        `;
        document.head.appendChild(style);

        const tooltip = document.createElement('div');
        tooltip.id = 'sample-tooltip';
        tooltip.className = 'sample-tooltip';
        document.body.appendChild(tooltip);
    }

    function renderSamples(list) {
        ensureStyles();
        return `<div class="sample-list">${list.map(sentence => `<div class="sample-pill"><span class="sample-number">${sentence.number}.</span><span class="sample-english">${esc(sentence.english)}</span><span class="sample-arrow">→</span><span class="sample-conlang">${sentenceHtml(sentence, generated.config)}</span></div>`).join('')}</div>`;
    }

    function bindTooltips() {
        document.querySelectorAll('.sample-word').forEach(element => {
            element.addEventListener('mouseenter', () => {
                const tooltip = $('sample-tooltip');
                if (!tooltip) return;
                tooltip.textContent = element.dataset.meaning || element.title;
                tooltip.style.display = 'block';
                const rect = element.getBoundingClientRect();
                tooltip.style.left = `${Math.min(window.innerWidth - 180, Math.max(8, rect.left))}px`;
                tooltip.style.top = `${Math.max(8, rect.top - 34)}px`;
            });
            element.addEventListener('mouseleave', () => {
                const tooltip = $('sample-tooltip');
                if (tooltip) tooltip.style.display = 'none';
            });
        });
    }

    function addVersionTag() {
        const heading = document.querySelector('header h1');
        if (!heading || heading.querySelector('.version-tag')) return;
        const tag = document.createElement('span');
        tag.className = 'chip version-tag';
        tag.textContent = `v${VERSION}`;
        tag.style.marginLeft = '8px';
        tag.style.verticalAlign = 'middle';
        heading.appendChild(tag);
    }

    function render() {
        if (!generated) return;

        const chips = [
            ...generated.config.region,
            ...generated.config.culture,
            ...generated.config.biome,
            ...generated.config.temporal_setting,
            ...generated.config.tags
        ];

        $('generation-output').className = 'result';
        $('generation-output').innerHTML = `
            <div class="hero"><div>
                <div class="lang-name">${esc(generated.name)} <span class="chip">v${VERSION}</span></div>
                <div class="sub">${esc(generated.config.order)} · ${esc(generated.config.morphology)}</div>
                <div class="chips">${chips.map(value => `<span class="chip">${esc(value)}</span>`).join('')}</div>
            </div></div>
            <div class="grid">
                <div class="card"><h3>Phonology</h3><div class="kv">
                    <b>Vowels</b><span>${esc(generated.config.vowels)}</span>
                    <b>Consonants</b><span>${esc(generated.config.consonants)}</span>
                    <b>Mean syllables</b><span>${esc(generated.config.mean)}</span>
                </div></div>
                <div class="card"><h3>Sample sentences</h3>${renderSamples(generated.samples)}</div>
            </div>`;

        $('lexicon-output').innerHTML = `<div class="lexicon">${generated.lexicon.map(entry => `<div class="lex-row"><div class="word">${esc(entry.word)}</div><div class="eng">${esc(entry.english)}</div><div class="meta">${esc(entry.kind)} · ${esc(entry.category || '')}</div></div>`).join('')}</div>`;
        renderDictionary();
        bindTooltips();
    }

    function renderDictionary() {
        if (!generated) {
            $('dictionary-output').className = 'empty';
            $('dictionary-output').textContent = 'Generate a language to populate the dictionary.';
            return;
        }

        const direction = $('dictionary-direction').value;
        const query = norm($('dictionary-search').value);
        const rows = generated.lexicon
            .filter(entry => {
                const searchable = direction === 'conlang-en' ? norm(entry.word) : norm(entry.english);
                return !query || searchable.includes(query);
            })
            .sort((a, b) => {
                const aa = direction === 'conlang-en' ? a.word : a.english;
                const bb = direction === 'conlang-en' ? b.word : b.english;
                return aa.localeCompare(bb);
            });

        $('dictionary-output').className = 'dictionary';
        $('dictionary-output').innerHTML = rows.map(entry => direction === 'conlang-en'
            ? `<div class="dict-row"><strong>${esc(entry.word)}</strong><span>${esc(entry.english)}</span><span class="meta">${esc(entry.kind)}</span></div>`
            : `<div class="dict-row"><strong>${esc(entry.english)}</strong><span>${esc(entry.word)}</span><span class="meta">${esc(entry.kind)}</span></div>`
        ).join('') || '<div class="empty">No matches.</div>';
    }

    async function loadVocabulary() {
        try {
            const response = await fetch('vocabulary.json', { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            vocabulary = Array.isArray(data)
                ? data
                : Array.isArray(data.vocabulary)
                    ? data.vocabulary
                    : [];

            if (!vocabulary.length) throw new Error('Unsupported vocabulary JSON structure.');

            populate();
            $('db-status').textContent = `Vocabulary loaded: ${vocabulary.length} entries`;
        } catch (error) {
            $('db-status').textContent = 'Vocabulary load failed';
            $('message').textContent = error.message;
        }
    }

    function makeName(config) {
        const make = factory(config, 'name');
        return `${make()} ${make()}`;
    }

    function generate() {
        const config = configFromUI();
        generated = {
            config,
            name: makeName(config),
            lexicon: generateLexicon(config),
            samples: []
        };
        generated.samples = samples(config, generated.lexicon);
        render();
        $('message').textContent = `Generated ${generated.name} · ${generated.lexicon.length} lemmas · ${generated.samples.length} sample sentences.`;
    }

    $('generate')?.addEventListener('click', () => {
        randomize();
        generate();
    });

    $('regenerate')?.addEventListener('click', () => {
        if (!generated) {
            generate();
            return;
        }

        const config = configFromUI();
        generated = {
            ...generated,
            config,
            lexicon: generateLexicon(config)
        };
        generated.samples = samples(config, generated.lexicon);
        render();
        $('message').textContent = `Regenerated ${generated.lexicon.length} lemmas.`;
    });

    $('dictionary-direction')?.addEventListener('change', renderDictionary);
    $('dictionary-search')?.addEventListener('input', renderDictionary);

    addVersionTag();
    loadVocabulary();
})();
