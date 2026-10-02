/* ConLang Generator — sentence vocabulary audit patch v0.11.27 */
(() => {
    'use strict';

    const norm = v => String(v ?? '').toLowerCase().replace(/^to\s+/, '').trim();
    const VERB_CONCEPTS = new Set([
        'be', 'have', 'can', 'eat', 'drink', 'see', 'touch', 'kill', 'hunt', 'love', 'trust', 'help',
        'fear', 'go', 'come', 'rise', 'fall', 'move', 'walk', 'stay', 'sleep', 'want', 'work', 'travel',
        'enter', 'know', 'exist', 'build'
    ]);
    const REQUIRED_SAMPLE_CONCEPTS = [
        'i', 'you', 'we', 'they', 'me', 'my', 'your', 'this', 'that', 'here', 'there',
        'friend', 'sister', 'father', 'water', 'food', 'bread', 'sword', 'house', 'tree',
        'sun', 'moon', 'stone', 'hot', 'cold', 'bright', 'dark', 'village', 'city', 'forest',
        'wolf', 'dog', 'horse', 'milk', 'hunter', 'farmer', 'bird', 'fish', 'up', 'down',
        'way', 'road', 'hand', 'hungry', 'ready', 'nothing', 'all', 'today', 'tomorrow', 'yesterday',
        'who', 'what', 'where', 'when', 'why', 'how', 'much', 'little', 'not', 'can', 'to', 'from', 'with', 'in'
    ];

    function kindOf(entry) {
        const t = norm(entry?.word_type);
        const c = norm(entry?.category);
        if (t === 'verb' || c.includes('verb')) return 'verb';
        if (t === 'adjective' || c.includes('adjective')) return 'adjective';
        if (t === 'pronoun' || c.includes('pronoun')) return 'pronoun';
        return t || c;
    }

    function preferredEntry(entries, concept) {
        const exact = entries.filter(e => norm(e?.concept) === norm(concept));
        if (!exact.length) return null;
        if (VERB_CONCEPTS.has(norm(concept))) {
            const verb = exact.find(e => kindOf(e) === 'verb');
            if (verb) return verb;
        }
        return exact[0];
    }

    function makeMissingEntries(lexicon, config) {
        const out = Array.isArray(lexicon) ? lexicon.slice() : [];
        const vocabulary = window.ConlangEngine?.getVocabulary?.() || [];
        const make = window.ConlangPhonology?.createWordFactory?.(config);
        const used = new Set(out.map(e => e?.conlang).filter(Boolean));
        if (!make) return out;

        for (const concept of REQUIRED_SAMPLE_CONCEPTS) {
            const candidates = vocabulary.filter(e => norm(e?.concept) === norm(concept));
            if (!candidates.length) continue;

            let existing = preferredEntry(out, concept);
            if (VERB_CONCEPTS.has(norm(concept))) existing = candidates.find(e => kindOf(e) === 'verb') || candidates[0];
            else existing = candidates[0];

            if (preferredEntry(out, concept)) {
                if (VERB_CONCEPTS.has(norm(concept)) && kindOf(preferredEntry(out, concept)) !== 'verb') {
                    const source = candidates.find(e => kindOf(e) === 'verb');
                    if (source) {
                        const replacement = { ...source, conlang: make({ short: false }) };
                        while (used.has(replacement.conlang)) replacement.conlang = make({ short: false });
                        used.add(replacement.conlang);
                        const index = out.findIndex(e => norm(e?.concept) === norm(concept) && kindOf(e) !== 'verb');
                        if (index >= 0) out.splice(index, 1, replacement);
                    }
                }
                continue;
            }

            const source = VERB_CONCEPTS.has(norm(concept))
                ? (candidates.find(e => kindOf(e) === 'verb') || candidates[0])
                : candidates[0];
            const entry = { ...source };
            do { entry.conlang = make({ short: false }); } while (used.has(entry.conlang));
            used.add(entry.conlang);
            out.push(entry);
        }
        return out;
    }

    function patchSentenceEngine() {
        const engine = window.ConlangSentenceEngine;
        if (!engine?.generateSamples || engine.generateSamples.__auditPatched) return;
        const original = engine.generateSamples;
        const patched = function(list, config = {}) {
            const safeList = Array.isArray(list) ? list : [];
            const prepared = [];
            const usedIds = new Set();

            // For exact concepts used as verbs, keep the verb entry and exclude competing
            // abstract entries from the sample resolver. Abstract meanings remain in the dictionary.
            const concepts = new Set(safeList.map(e => norm(e?.concept)));
            for (const entry of safeList) {
                const concept = norm(entry?.concept);
                if (VERB_CONCEPTS.has(concept)) {
                    const competingVerb = safeList.some(e => norm(e?.concept) === concept && kindOf(e) === 'verb');
                    if (competingVerb && kindOf(entry) !== 'verb') continue;
                }
                if (!usedIds.has(entry?.id)) {
                    prepared.push(entry);
                    usedIds.add(entry?.id);
                }
            }
            return original(prepared, config);
        };
        patched.__auditPatched = true;
        window.ConlangSentenceEngine = Object.freeze({ ...engine, generateSamples: patched });
    }

    function onGenerated(event) {
        const detail = event?.detail;
        if (!detail?.config || !Array.isArray(detail.lexicon)) return;
        detail.lexicon = makeMissingEntries(detail.lexicon, detail.config);
        patchSentenceEngine();
    }

    function init() {
        patchSentenceEngine();
        window.addEventListener('conlang:generated', onGenerated);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
