/* ConLang Generator — sentence vocabulary audit patch v0.11.30 */
(() => {
    'use strict';
    const norm = v => String(v ?? '').toLowerCase().replace(/^to\s+/, '').trim();
    const ADJECTIVE_CONCEPTS = new Set(['good']);
    const VERB_CONCEPTS = new Set([
        'be', 'have', 'can', 'eat', 'drink', 'see', 'touch', 'kill', 'hunt', 'love', 'trust', 'help',
        'fear', 'go', 'come', 'rise', 'fall', 'move', 'walk', 'stay', 'sleep', 'want', 'work', 'travel',
        'enter', 'know', 'exist', 'build'
    ]);
    const REQUIRED_SAMPLE_CONCEPTS = [
        'i', 'you', 'we', 'they', 'me', 'my', 'your', 'this', 'that', 'here', 'there',
        'friend', 'sister', 'father', 'good', 'water', 'food', 'bread', 'sword', 'house', 'tree',
        'sun', 'moon', 'stone', 'hot', 'cold', 'bright', 'dark', 'village', 'city', 'forest',
        'wolf', 'dog', 'horse', 'milk', 'hunter', 'farmer', 'bird', 'fish', 'up', 'down',
        'way', 'road', 'hand', 'hungry', 'ready', 'nothing', 'all', 'today', 'tomorrow', 'yesterday',
        'who', 'what', 'where', 'when', 'why', 'how', 'much', 'little', 'not', 'can', 'to', 'from', 'with', 'in'
    ];
    function kindOf(entry) {
        const t = norm(entry?.word_type), c = norm(entry?.category);
        if (t === 'verb' || c.includes('verb')) return 'verb';
        if (t === 'adjective' || c.includes('adjective')) return 'adjective';
        if (t === 'pronoun' || c.includes('pronoun')) return 'pronoun';
        return t || c;
    }
    function preferredEntry(entries, concept) {
        const exact = entries.filter(e => norm(e?.concept) === norm(concept));
        if (!exact.length) return null;
        if (VERB_CONCEPTS.has(norm(concept))) return exact.find(e => kindOf(e) === 'verb') || exact[0];
        if (ADJECTIVE_CONCEPTS.has(norm(concept))) return exact.find(e => kindOf(e) === 'adjective') || exact[0];
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
            const desired = VERB_CONCEPTS.has(norm(concept)) ? 'verb' : ADJECTIVE_CONCEPTS.has(norm(concept)) ? 'adjective' : null;
            const source = desired ? (candidates.find(e => kindOf(e) === desired) || candidates[0]) : candidates[0];
            const existingIndex = out.findIndex(e => norm(e?.concept) === norm(concept));
            if (existingIndex >= 0) {
                if (desired && kindOf(out[existingIndex]) !== desired) {
                    const replacement = { ...source, conlang: make({ short: false }) };
                    while (used.has(replacement.conlang)) replacement.conlang = make({ short: false });
                    used.add(replacement.conlang);
                    out.splice(existingIndex, 1, replacement);
                }
                continue;
            }
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
            const prepared = safeList.filter(entry => {
                const concept = norm(entry?.concept);
                const competingVerb = VERB_CONCEPTS.has(concept) && safeList.some(e => norm(e?.concept) === concept && kindOf(e) === 'verb');
                return !competingVerb || kindOf(entry) === 'verb';
            });
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
