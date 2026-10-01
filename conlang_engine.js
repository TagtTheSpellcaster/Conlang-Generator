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

    const VOWELS = {
        standard: ['a', 'e', 'i', 'o', 'u'],
        minimal: ['a', 'i', 'u'],
        extended: ['a', 'e', 'i', 'o', 'u', 'y', 'ø', 'æ']
    };
    const CONSONANTS = {
        balanced: ['p', 't', 'k', 'b', 'd', 'g', 'm', 'n', 's', 'r', 'l', 'f', 'v'],
        guttural: ['k', 'q', 'x', 'g', 'r', 'kh', 'gh', 't', 'd'],
        sibilant: ['s', 'z', 'sh', 'zh', 'f', 'v', 'r', 'l', 'th'],
        soft: ['m', 'n', 'l', 'r', 'w', 'j', 'v', 'dh']
    };

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

    function makeWordFactory(c) {
        const vowels = VOWELS[c.vowels] || VOWELS.standard;
        const consonants = CONSONANTS[c.consonants] || CONSONANTS.balanced;
        const patterns = c.consonants === 'guttural' ? ['CVC', 'CCVC', 'CVCC'] : c.consonants === 'soft' ? ['CV', 'CVV', 'CVC', 'V'] : ['CV', 'CVC', 'CVV', 'VC'];
        const r = rng(c.seed + '|words'),
            used = new Set();
        return () => {
            for (let n = 0; n < 300; n++) {
                let w = '';
                const count = Math.max(1, Math.min(5, Math.round(c.mean + (r() - .5) * 1.6)));
                for (let i = 0; i < count; i++)
                    for (const ch of choice(patterns, r)) w += ch === 'C' ? choice(consonants, r) : choice(vowels, r);
                w = w.toLowerCase();
                if (w.length > 1 && !used.has(w)) {
                    used.add(w);
                    return w;
                }
            }
            return 'lex' + Math.floor(r() * 1e6);
        };
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
        const r = rng(c.seed + '|selection');
        const pool = ranked.filter(e => !seen.has(e.id)).sort((a, b) => b.score - a.score);
        while (pool.length && selected.length < 600) {
            const top = pool.slice(0, Math.min(40, pool.length));
            const e = choice(top, r);
            selected.push(e);
            seen.add(e.id);
            pool.splice(pool.indexOf(e), 1);
        }
        return selected;
    }

    function find(list, q, r) {
        const a = candidates(list, q);
        return choice(a, r);
    }

    function word(e) {
        return e?.conlang || '';
    }

    function translateConcreteTemplates(list, c) {
        const r = rng(c.seed + '|samples');
        const verbTag = x => find(list, {
            kinds: ['verb'],
            anyTags: [x]
        }, r);
        const byConcept = (...x) => find(list, {
            concepts: x
        }, r);
        const pron = x => byConcept(x);
        const func = x => byConcept(x);
        const alt = (...concepts) => concepts.map(x => byConcept(x)).filter(Boolean);
        const T = e => e ? `<span class="sample-word" data-meaning="${esc(e.concept||e.english)}">${esc(e.conlang)}</span>` : '';
        const A = es => `[${es.map(T).join('|')}]`;
        const I = pron('i'),
            YOU = pron('you'),
            WE = pron('we'),
            THEY = pron('they'),
            ME = pron('me'),
            MY = func('my'),
            THIS = pron('this'),
            THAT = pron('that'),
            HERE = func('here'),
            THERE = func('there');
        const BE = byConcept('be') || verbTag('copula'),
            HAVE = byConcept('have'),
            CAN = byConcept('can'),
            NOT = byConcept('not'),
            TO = func('to'),
            FROM = func('from'),
            WITH = func('with'),
            IN = func('in'),
            THE = func('the');
        const F = e => e ? T(e) : '';
        const V = e => e ? T(e) : '';
        const variants = {
            friend: alt('friend', 'sister', 'father'),
            resource: alt('water', 'food', 'bread'),
            animal: alt('wolf', 'dog', 'horse'),
            living: alt('wolf', 'dog', 'hunter'),
            liquid: alt('water', 'milk'),
            place: alt('village', 'city', 'forest'),
            threat: alt('sword', 'enemy', 'wolf'),
            action: alt('eat', 'drink', 'build'),
            emotion: alt('love', 'trust', 'help'),
            adjective: alt('hot', 'cold', 'bright'),
            quantity: alt('many', 'little')
        };
        const arrT = e => e.length ? A(e) : '';
        const rows = [
            ['I am your [friend|sister|father].', `${F(I)} ${F(BE)} ${F(MY)} ${arrT(variants.friend)}`],
            ['You are my [friend|sister|father].', `${F(YOU)} ${F(BE)} ${F(MY)} ${arrT(variants.friend)}`],
            ['This is [water|food|bread].', `${F(THIS)} ${F(BE)} ${arrT(variants.resource)}`],
            ['That is [a sword|a house|a tree].', `${F(THAT)} ${F(BE)} ${A([byConcept('sword'),byConcept('house'),byConcept('tree')].filter(Boolean))}`],
            ['We are here.', `${F(WE)} ${F(BE)} ${F(HERE)}`],
            ['They are there.', `${F(THEY)} ${F(BE)} ${F(THERE)}`],
            ['I have [water|food|bread].', `${F(I)} ${F(HAVE)} ${arrT(variants.resource)}`],
            ['You have [water|food|bread].', `${F(YOU)} ${F(HAVE)} ${arrT(variants.resource)}`],
            ['The [sun|moon|stone] is [hot|cold|bright].', `${F(THE)} ${arrT([byConcept('sun'),byConcept('moon'),byConcept('stone')].filter(Boolean))} ${F(BE)} ${arrT([byConcept('hot'),byConcept('cold'),byConcept('bright')].filter(Boolean))}`],
            ['I eat [food|bread].', `${F(I)} ${V(verbTag('consumption'))} ${arrT([byConcept('food'),byConcept('bread')].filter(Boolean))}`],
            ['[The wolf|the dog] drinks [water|milk].', `${F(THE)} ${arrT([byConcept('wolf'),byConcept('dog')].filter(Boolean))} ${V(verbTag('consumption'))} ${arrT(variants.liquid)}`],
            ['I see you.', `${F(I)} ${V(verbTag('perception'))} ${F(YOU)}`],
            ['You see me.', `${F(YOU)} ${V(verbTag('perception'))} ${F(ME)}`],
            ['The hunter [kills|hunts] the wolf.', `${F(THE)} ${F(byConcept('hunter'))} ${arrT([byConcept('kill'),byConcept('hunt')].filter(Boolean))} ${F(THE)} ${F(byConcept('wolf'))}`],
            ['I [love|trust|help] you.', `${F(I)} ${arrT([byConcept('love'),byConcept('trust'),byConcept('help')].filter(Boolean))} ${F(YOU)}`],
            ['I fear [the sword|the enemy].', `${F(I)} ${V(verbTag('emotion_negative'))} ${F(THE)} ${arrT([byConcept('sword'),byConcept('enemy')].filter(Boolean))}`],
            ['I go to the [village|city|forest].', `${F(I)} ${V(verbTag('movement'))} ${F(TO)} ${F(THE)} ${arrT(variants.place)}`],
            ['You come from the [village|city].', `${F(YOU)} ${V(verbTag('movement'))} ${F(FROM)} ${F(THE)} ${arrT([byConcept('village'),byConcept('city')].filter(Boolean))}`],
            ['The sun rises.', `${F(THE)} ${F(byConcept('sun'))} ${V(verbTag('natural_movement'))}`],
            ['The stone falls.', `${F(THE)} ${F(byConcept('stone'))} ${V(verbTag('gravity'))}`],
            ['The [bird|fish] moves [up|down].', `${F(THE)} ${arrT([byConcept('bird'),byConcept('fish')].filter(Boolean))} ${V(verbTag('air_water_movement'))} ${arrT([byConcept('up'),byConcept('down')].filter(Boolean))}`],
            ['The wolf walks in the forest.', `${F(THE)} ${F(byConcept('wolf'))} ${V(verbTag('ground_movement'))} ${F(IN)} ${F(THE)} ${F(byConcept('forest'))}`],
            ['Stay here.', `${V(verbTag('stasis'))} ${F(HERE)}`],
            ['Come with me.', `${V(verbTag('movement'))} ${F(WITH)} ${F(ME)}`],
            ['Who are you?', `${F(byConcept('who'))} ${F(BE)} ${F(YOU)}`],
            ['What is this?', `${F(byConcept('what'))} ${F(BE)} ${F(THIS)}`],
            ['Where are we?', `${F(byConcept('where'))} ${F(BE)} ${F(WE)}`],
            ['When do you go?', `${F(byConcept('when'))} ${V(verbTag('movement'))} ${F(YOU)}`],
            ['Why do you do this?', `${F(byConcept('why'))} ${V(verbTag('activity'))} ${F(THIS)}`],
            ['How does this work?', `${F(byConcept('how'))} ${V(verbTag('process'))} ${F(THIS)}`],
            ['Where is the water?', `${F(byConcept('where'))} ${F(BE)} ${F(THE)} ${F(byConcept('water'))}`],
            ['I do not want this.', `${F(I)} ${F(NOT)} ${V(verbTag('volition'))} ${F(THIS)}`],
            ['You cannot enter.', `${F(YOU)} ${F(NOT)} ${F(CAN)} ${V(verbTag('movement'))}`],
            ['I do not know.', `${F(I)} ${F(NOT)} ${V(verbTag('cognition'))}`],
            ['I know the way.', `${F(I)} ${V(verbTag('cognition'))} ${F(THE)} ${F(byConcept('way')||byConcept('road'))}`],
            ['I can help you.', `${F(I)} ${F(CAN)} ${V(verbTag('help'))} ${F(YOU)}`],
            ['Do not touch this.', `${F(NOT)} ${V(verbTag('prohibition'))} ${F(THIS)}`],
            ['I am hungry.', `${F(I)} ${F(BE)} ${F(byConcept('hungry'))}`],
            ['My hand hurts.', `${F(MY)} ${F(byConcept('hand'))} ${V(verbTag('pain'))}`],
            ['I want to sleep.', `${F(I)} ${V(verbTag('volition'))} ${V(verbTag('rest'))}`],
            ['This is [much|little].', `${F(THIS)} ${F(BE)} ${arrT([byConcept('much'),byConcept('little')].filter(Boolean))}`],
            ['Everything is ready.', `${F(byConcept('all'))} ${F(BE)} ${F(byConcept('ready'))}`],
            ['Nothing exists.', `${F(byConcept('nothing'))} ${V(verbTag('existence'))}`],
            ['Today we work.', `${F(byConcept('today'))} ${F(WE)} ${V(verbTag('activity'))}`],
            ['Tomorrow we travel.', `${F(byConcept('tomorrow'))} ${F(WE)} ${V(verbTag('movement'))}`],
            ['Yesterday the hunter came.', `${F(byConcept('yesterday'))} ${F(THE)} ${F(byConcept('hunter'))} ${V(verbTag('movement'))}`],
            ['The [dog|wolf|horse] sees the [hunter|farmer].', `${F(THE)} ${arrT([byConcept('dog'),byConcept('wolf'),byConcept('horse')].filter(Boolean))} ${V(verbTag('perception'))} ${F(THE)} ${arrT([byConcept('hunter'),byConcept('farmer')].filter(Boolean))}`],
            ['I [eat|drink] [food|water].', `${F(I)} ${arrT([byConcept('eat'),byConcept('drink')].filter(Boolean))} ${arrT([byConcept('food'),byConcept('water')].filter(Boolean))}`],
            ['The [sun|moon] is [bright|dark].', `${F(THE)} ${arrT([byConcept('sun'),byConcept('moon')].filter(Boolean))} ${F(BE)} ${arrT([byConcept('bright'),byConcept('dark')].filter(Boolean))}`],
            ['[The hunter|the farmer] has [food|water].', `${F(THE)} ${arrT([byConcept('hunter'),byConcept('farmer')].filter(Boolean))} ${F(HAVE)} ${arrT([byConcept('food'),byConcept('water')].filter(Boolean))}`],
            ['I see [the house|the village].', `${F(I)} ${V(verbTag('perception'))} ${F(THE)} ${arrT([byConcept('house'),byConcept('village')].filter(Boolean))}`],
            ['We build [a house|a boat].', `${F(WE)} ${V(verbTag('construction'))} ${arrT([byConcept('house'),byConcept('boat')].filter(Boolean))}`],
            ['The [bird|fish] is [small|large].', `${F(THE)} ${arrT([byConcept('bird'),byConcept('fish')].filter(Boolean))} ${F(BE)} ${arrT([byConcept('small'),byConcept('large')].filter(Boolean))}`]
        ];
        return rows.map(([english, html], i) => ({
            number: i + 1,
            english,
            html
        }));
    }

    function renderSamples(c, list) {
        const box = $('generation-output');
        if (!box) return;
        const rows = translateConcreteTemplates(list, c);
        const style = `<style id="sample-v718">.sample-frame{margin-top:16px;background:#11182a;border:1px solid #26324a;border-radius:10px;padding:14px}.sample-pill{background:#0d1424;border:1px solid #26324a;border-radius:999px;padding:9px 14px;margin:7px 0}.sample-pill .en{font-weight:400}.sample-pill .cl{font-weight:700;margin-top:4px}.sample-word{cursor:help;border-bottom:1px dotted #55c7ff;position:relative}.sample-word:hover::after{content:attr(data-meaning);position:absolute;left:0;bottom:calc(100% + 6px);background:#050914;color:#fff;border:1px solid #3d5277;border-radius:6px;padding:4px 7px;white-space:nowrap;font:12px/1.2 system-ui;z-index:50}` + '</style>';
        const html = rows.map(x => `<div class="sample-pill"><div class="en"><b>${x.number}.</b> ${esc(x.english)}</div><div class="cl"><b>${x.number}.</b> ${x.html}</div></div>`).join('');
        const existing = box.innerHTML;
        box.innerHTML = existing + style + `<div class="sample-frame"><h3>Sample sentences</h3>${html}</div>`;
    }

    function renderLexicon(list) {
        const box = $('lexicon-output');
        if (!box) return;
        const rows = list.slice().sort((a, b) => String(a.concept || '').localeCompare(String(b.concept || '')));
        box.innerHTML = `<div class="card"><h3>Generated lexicon</h3><div class="sub" style="margin-bottom:10px">${rows.length} entries</div><div class="lexicon">${rows.map(e=>`<div class="lex-row"><div class="word">${esc(e.conlang)}</div><div class="eng">${esc(e.concept||e.english||'')}</div><div class="meta">${esc(e.category||e.semantic_group||e.word_type||'')}</div></div>`).join('')}</div></div>`;
    }

    function renderDictionary(list) {
        const box = $('dictionary-output');
        if (!box) return;
        const dir = $('dictionary-direction')?.value || 'conlang-en';
        const q = ($('dictionary-search')?.value || '').trim().toLowerCase();
        let rows = list.map(e => ({
            l: dir === 'conlang-en' ? e.conlang : (e.concept || e.english || ''),
            r: dir === 'conlang-en' ? (e.concept || e.english || '') : e.conlang,
            m: e.category || e.semantic_group || e.word_type || ''
        }));
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
            const make = makeWordFactory(c);
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
        if ($('seed')) $('seed').value = Date.now() + '-' + Math.floor(Math.random() * 1e6);
    }

    async function loadVocabulary() {
        const res = await fetch('vocabulary.json', {
            cache: 'no-store'
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        vocabulary = Array.isArray(data) ? data : (Array.isArray(data.vocabulary) ? data.vocabulary : (Array.isArray(data.entries) ? data.entries : []));
        if (!vocabulary.length) throw new Error('No vocabulary entries found.');
        vocabulary = vocabulary.map(e => ({
            ...e,
            kind: classify(e)
        }));
        populateFilters();
        if ($('db-status')) $('db-status').textContent = `Vocabulary loaded: ${vocabulary.length} entries`;
    }

    function init() {
        $('generate')?.addEventListener('click', generate);
        $('regenerate')?.addEventListener('click', generate);
        $('dictionary-direction')?.addEventListener('change', () => renderDictionary(generated));
        $('dictionary-search')?.addEventListener('input', () => renderDictionary(generated));
        $('clear-filters')?.addEventListener('click', () => ['region', 'culture', 'biome', 'temporal_setting', 'tags'].forEach(id => {
            if ($(id)) $(id).value = '';
        }));
        ['preset-historical', 'preset-fantasy', 'preset-modern', 'preset-scifi'].forEach(id => $(id)?.addEventListener('click', () => randomize()));
        const h1 = document.querySelector('header h1');
        if (h1 && !h1.querySelector('.version-badge')) {
            const b = document.createElement('span');
            b.className = 'chip version-badge';
            b.textContent = 'v' + VERSION;
            b.style.marginLeft = '8px';
            h1.appendChild(b);
        }
        loadVocabulary().catch(e => {
            console.error(e);
            if ($('db-status')) $('db-status').textContent = 'Vocabulary load error: ' + e.message;
            if ($('message')) $('message').textContent = 'Vocabulary load error: ' + e.message;
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {
        once: true
    });
    else init();
})();
