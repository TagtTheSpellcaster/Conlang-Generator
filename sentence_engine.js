/* ConLang Generator — sentence engine v0.9.6 */
(() => {
    'use strict';

    const norm = v => String(v ?? '').toLowerCase().replace(/^to\s+/, '').trim();

    function findConcept(list, ...names) {
        const e = list.find(x => names.includes(norm(x.concept)) || names.includes(norm(x.concept).replace(/^to\s+/, '')));
        return e?.conlang || '—';
    }

    function generateSamples(list) {
        return [
            ['I am here.', `${findConcept(list, 'i')} ${findConcept(list, 'be')} ${findConcept(list, 'here')}.`],
            ['You are there.', `${findConcept(list, 'you')} ${findConcept(list, 'be')} ${findConcept(list, 'there')}.`],
            ['This is my home.', `${findConcept(list, 'this')} ${findConcept(list, 'be')} ${findConcept(list, 'my')} ${findConcept(list, 'home')}.`],
            ['We have water.', `${findConcept(list, 'we')} ${findConcept(list, 'have')} ${findConcept(list, 'water')}.`],
            ['They see the forest.', `${findConcept(list, 'they')} ${findConcept(list, 'see')} ${findConcept(list, 'the')} ${findConcept(list, 'forest')}.`],
            ['Who is there?', `${findConcept(list, 'who')} ${findConcept(list, 'be')} ${findConcept(list, 'there')}?`],
            ['Where is the river?', `${findConcept(list, 'where')} ${findConcept(list, 'be')} ${findConcept(list, 'the')} ${findConcept(list, 'river')}?`],
            ['I do not know.', `${findConcept(list, 'i')} ${findConcept(list, 'do')} ${findConcept(list, 'not')} ${findConcept(list, 'know')}.`],
            ['We can go today.', `${findConcept(list, 'we')} ${findConcept(list, 'can')} ${findConcept(list, 'go')} ${findConcept(list, 'today')}.`],
            ['How many are there?', `${findConcept(list, 'how')} ${findConcept(list, 'many')} ${findConcept(list, 'be')} ${findConcept(list, 'there')}?`]
        ].map(([english, conlang]) => ({ english, conlang }));
    }

    window.ConlangSentenceEngine = Object.freeze({
        version: '0.9.6',
        generateSamples
    });
})();
