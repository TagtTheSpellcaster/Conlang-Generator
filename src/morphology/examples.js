// Example words used to illustrate paradigms (on screen and in exports).
export function exampleNoun(lexicon) {
    const nouns = lexicon.filter(e => e.pos === 'noun');
    for (const lemma of ['forest', 'house', 'tree', 'village', 'stone', 'water']) {
        const hit = nouns.find(e => e.lemma === lemma && !e.gloss);
        if (hit) return hit;
    }
    return nouns[0] ?? null;
}

export function exampleVerb(lexicon) {
    const verbs = lexicon.filter(e => e.pos === 'verb');
    for (const lemma of ['see', 'eat', 'go']) { const hit = verbs.find(e => e.lemma === lemma && !e.gloss); if (hit) return hit; }
    return verbs[0] ?? null;
}

export function exampleAdjective(lexicon) {
    return lexicon.find(e => e.pos === 'adjective' && e.lemma === 'good') || lexicon.find(e => e.pos === 'adjective') || null;
}
