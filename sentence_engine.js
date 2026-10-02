/* ConLang Generator — sentence engine v0.10.0 */
(() => {
    'use strict';

    const norm = v => String(v ?? '').toLowerCase().replace(/^to\s+/, '').trim();
    const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));

    function hash(s) {
        let h = 2166136261;
        for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
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

    function find(list, q, r) {
        let out = list;
        if (q.concepts?.length) out = out.filter(e => q.concepts.some(x => norm(e.concept) === norm(x)));
        else if (q.kinds?.length || q.anyTags?.length) {
            out = out.filter(e => {
                if (q.kinds?.length && !q.kinds.includes(e.kind)) return false;
                if (q.anyTags?.length) {
                    const tags = Array.isArray(e.tags) ? e.tags : [e.tags];
                    if (!tags.some(t => q.anyTags.includes(norm(t)))) return false;
                }
                return true;
            });
        }
        return out.length ? out[Math.floor(r() * out.length)] : null;
    }

    function applyOrder(order, parts) {
        const normalized = String(order || 'SOV').toUpperCase();
        const sequence = /^[SOV]{3}$/.test(normalized) && new Set(normalized).size === 3 ? normalized : 'SOV';
        const map = { S: parts.S, V: parts.V, O: parts.O };
        return sequence.split('').map(key => map[key]).filter(Boolean).join(' ');
    }

    function generateSamples(list, config = {}) {
        const r = rng(String(config.seed || 'auto') + '|samples');
        const order = String(config.order || 'SOV').toUpperCase();
        const articles = norm(config.articles || 'none');
        const hasDefinite = ['both', 'definite', 'partitive'].includes(articles);
        const hasIndefinite = ['both', 'indefinite', 'partitive'].includes(articles);
        const verbTag = x => find(list, { kinds: ['verb'], anyTags: [x] }, r);
        const byConcept = (...x) => find(list, { concepts: x }, r);
        const pron = x => byConcept(x);
        const func = x => byConcept(x);
        const alt = (...concepts) => concepts.map(x => byConcept(x)).filter(Boolean);
        const T = e => e ? `<span class="sample-word" data-meaning="${esc(e.concept || e.english)}">${esc(e.conlang)}</span>` : '';
        const A = es => es.length ? `[${es.map(T).join('|')}]` : '';
        const F = e => e ? T(e) : '';
        const V = e => e ? T(e) : '';
        const article = type => {
            if (type === 'definite') return hasDefinite ? F(func('the')) : '';
            if (type === 'indefinite') {
                if (!hasIndefinite) return '';
                const a = func('a');
                const an = func('an');
                return F(a || an);
            }
            return '';
        };
        const NP = (noun, type = 'definite') => `${article(type)} ${noun}`.trim();

        const I = pron('i'), YOU = pron('you'), WE = pron('we'), THEY = pron('they'), ME = pron('me');
        const MY = func('my'), YOUR = func('your'), THIS = pron('this'), THAT = pron('that'), HERE = func('here'), THERE = func('there');
        const BE = byConcept('be') || verbTag('copula'), HAVE = byConcept('have'), CAN = byConcept('can'), NOT = byConcept('not');
        const TO = func('to'), FROM = func('from'), WITH = func('with'), IN = func('in');
        const variants = {
            friend: alt('friend', 'sister', 'father'), resource: alt('water', 'food', 'bread'), animal: alt('wolf', 'dog', 'horse'),
            living: alt('wolf', 'dog', 'hunter'), liquid: alt('water', 'milk'), place: alt('village', 'city', 'forest'),
            threat: alt('sword', 'enemy', 'wolf'), action: alt('eat', 'drink', 'build'), emotion: alt('love', 'trust', 'help')
        };
        const C = (...concepts) => A(concepts.map(byConcept).filter(Boolean));
        const SVO = (s, v, o) => applyOrder(order, { S: s, V: v, O: o });

        const rows = [
            ['I am your [friend|sister|father].', SVO(F(I), F(BE), `${F(YOUR)} ${A(variants.friend)}`)],
            ['You are my [friend|sister|father].', SVO(F(YOU), F(BE), `${F(MY)} ${A(variants.friend)}`)],
            ['This is [water|food|bread].', SVO(F(THIS), F(BE), A(variants.resource))],
            ['That is [a sword|a house|a tree].', SVO(F(THAT), F(BE), NP(C('sword','house','tree'), 'indefinite'))],
            ['We are here.', SVO(F(WE), F(BE), F(HERE))],
            ['They are there.', SVO(F(THEY), F(BE), F(THERE))],
            ['I have [water|food|bread].', SVO(F(I), F(HAVE), A(variants.resource))],
            ['You have [water|food|bread].', SVO(F(YOU), F(HAVE), A(variants.resource))],
            ['The [sun|moon|stone] is [hot|cold|bright].', SVO(NP(C('sun','moon','stone')), F(BE), C('hot','cold','bright'))],
            ['I eat [food|bread].', SVO(F(I), V(verbTag('consumption')), C('food','bread'))],
            ['[The wolf|the dog] drinks [water|milk].', SVO(NP(C('wolf','dog')), V(verbTag('consumption')), A(variants.liquid))],
            ['I see you.', SVO(F(I), V(verbTag('perception')), F(YOU))],
            ['You see me.', SVO(F(YOU), V(verbTag('perception')), F(ME))],
            ['The hunter [kills|hunts] the wolf.', SVO(NP(F(byConcept('hunter'))), C('kill','hunt'), NP(F(byConcept('wolf'))))],
            ['I [love|trust|help] you.', SVO(F(I), C('love','trust','help'), F(YOU))],
            ['I fear [the sword|the enemy].', SVO(F(I), V(verbTag('emotion_negative')), NP(C('sword','enemy')))],
            ['I go to the [village|city|forest].', SVO(F(I), V(verbTag('movement')), `${F(TO)} ${NP(A(variants.place))}`)],
            ['You come from the [village|city].', SVO(F(YOU), V(verbTag('movement')), `${F(FROM)} ${NP(C('village','city'))}`)],
            ['The sun rises.', SVO(NP(F(byConcept('sun'))), V(verbTag('natural_movement')), '')],
            ['The stone falls.', SVO(NP(F(byConcept('stone'))), V(verbTag('gravity')), '')],
            ['The [bird|fish] moves [up|down].', SVO(NP(C('bird','fish')), V(verbTag('air_water_movement')), C('up','down'))],
            ['The wolf walks in the forest.', SVO(NP(F(byConcept('wolf'))), V(verbTag('ground_movement')), `${F(IN)} ${NP(F(byConcept('forest')))}`)],
            ['Stay here.', `${V(verbTag('stasis'))} ${F(HERE)}`],
            ['Come with me.', `${V(verbTag('movement'))} ${F(WITH)} ${F(ME)}`],
            ['Who are you?', `${F(byConcept('who'))} ${F(BE)} ${F(YOU)}`],
            ['What is this?', `${F(byConcept('what'))} ${F(BE)} ${F(THIS)}`],
            ['Where are we?', `${F(byConcept('where'))} ${F(BE)} ${F(WE)}`],
            ['When do you go?', `${F(byConcept('when'))} ${V(verbTag('movement'))} ${F(YOU)}`],
            ['Why do you do this?', `${F(byConcept('why'))} ${V(verbTag('activity'))} ${F(THIS)}`],
            ['How does this work?', `${F(byConcept('how'))} ${V(verbTag('process'))} ${F(THIS)}`],
            ['Where is the water?', `${F(byConcept('where'))} ${F(BE)} ${NP(F(byConcept('water')))}`],
            ['I do not want this.', `${F(I)} ${F(NOT)} ${V(verbTag('volition'))} ${F(THIS)}`],
            ['You cannot enter.', `${F(YOU)} ${F(NOT)} ${F(CAN)} ${V(verbTag('movement'))}`],
            ['I do not know.', `${F(I)} ${F(NOT)} ${V(verbTag('cognition'))}`],
            ['I know the way.', `${F(I)} ${V(verbTag('cognition'))} ${NP(F(byConcept('way') || byConcept('road')))}`],
            ['I can help you.', `${F(I)} ${F(CAN)} ${V(verbTag('help'))} ${F(YOU)}`],
            ['Do not touch this.', `${F(NOT)} ${V(verbTag('prohibition'))} ${F(THIS)}`],
            ['I am hungry.', `${F(I)} ${F(BE)} ${F(byConcept('hungry'))}`],
            ['My hand hurts.', `${F(MY)} ${F(byConcept('hand'))} ${V(verbTag('pain'))}`],
            ['I want to sleep.', `${F(I)} ${V(verbTag('volition'))} ${V(verbTag('rest'))}`],
            ['This is [much|little].', `${F(THIS)} ${F(BE)} ${C('much','little')}`],
            ['Everything is ready.', `${F(byConcept('all'))} ${F(BE)} ${F(byConcept('ready'))}`],
            ['Nothing exists.', `${F(byConcept('nothing'))} ${V(verbTag('existence'))}`],
            ['Today we work.', `${F(byConcept('today'))} ${F(WE)} ${V(verbTag('activity'))}`],
            ['Tomorrow we travel.', `${F(byConcept('tomorrow'))} ${F(WE)} ${V(verbTag('movement'))}`],
            ['Yesterday the hunter came.', `${F(byConcept('yesterday'))} ${NP(F(byConcept('hunter')))} ${V(verbTag('movement'))}`],
            ['The [dog|wolf|horse] sees the [hunter|farmer].', SVO(NP(C('dog','wolf','horse')), V(verbTag('perception')), NP(C('hunter','farmer')))],
            ['I [eat|drink] [food|water].', SVO(F(I), C('eat','drink'), C('food','water'))],
            ['The [sun|moon] is [bright|dark].', SVO(NP(C('sun','moon')), F(BE), C('bright','dark'))],
            ['[The hunter|the farmer] has [food|water].', SVO(NP(C('hunter','farmer')), F(HAVE), C('food','water'))],
            ['I see [the house|the village].', SVO(F(I), V(verbTag('perception')), NP(C('house','village')))],
            ['We build [a house|a boat].', SVO(F(WE), V(verbTag('construction')), NP(C('house','boat'), 'indefinite'))],
            ['The [bird|fish] is [small|large].', SVO(NP(C('bird','fish')), F(BE), C('small','large'))]
        ];
        return rows.map(([english, html], i) => ({ number: i + 1, english, html }));
    }

    window.ConlangSentenceEngine = Object.freeze({ version: '0.10.0', generateSamples });
})();
