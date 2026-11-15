// IPA values of the letters of the Latin transcription, and an IPA rendering of a word.
// Letters of the basic inventory are IPA symbols already (j is [j], y is [y]); marked letters have the values below.
export const LETTER_IPA = Object.freeze({
    // circumflex and acute vowels: long; grave: open/lax; umlaut: front vowels
    â: 'aː', ê: 'eː', î: 'iː', ô: 'oː', û: 'uː', á: 'aː', é: 'eː', í: 'iː', ó: 'oː', ú: 'uː',
    à: 'a', è: 'ɛ', ì: 'ɪ', ò: 'ɔ', ù: 'ʊ', ä: 'æ', ë: 'ɛ', ï: 'ɨ', ö: 'ø', ü: 'y',
    å: 'ɔ', œ: 'œ', ů: 'uː', ı: 'ɯ', þ: 'θ', ð: 'ð', ß: 's', ł: 'ɬ',
    ḍ: 'ɖ', ḥ: 'ħ', ṣ: 'ʂ', ṭ: 'ʈ', ẓ: 'ʐ', ṛ: 'ɽ', ṇ: 'ɳ', ḷ: 'ɭ',
    ç: 'ç', ş: 'ʃ', ţ: 'ts', ḑ: 'dz', ģ: 'ɟ', ķ: 'c', ļ: 'ʎ', ņ: 'ɲ', ŗ: 'ʀ', ñ: 'ɲ'
});
const VOWEL_LETTERS = new Set([...'aeiouyøæœåůıáéíóúàèìòùäëïöüâêîôû']);
const LIQUID_GLIDE = new Set([...'rlwjɾɽɭʀɬʎ']);
const SONORANT = new Set([...'mnŋɲɳrlwjɾɽɭʀɬʎ']);

export const ipaOfLetter = ch => LETTER_IPA[ch] ?? ch;
export const isVowelLetter = ch => VOWEL_LETTERS.has(ch);

function ipaToken(word) {
    const letters = [...word];
    const units = letters.map(ch => ({ ipa: ipaOfLetter(ch), v: isVowelLetter(ch) }));
    if (units.filter(u => u.v).length < 2) return units.map(u => u.ipa).join('');
    // split the consonants between two vowels: one goes to the onset of the next syllable, or two when the second is a liquid or glide
    const syllables = [[]];
    let i = 0;
    while (i < units.length) {
        const u = units[i];
        if (u.v) { syllables.at(-1).push(u); i++; continue; }
        let j = i;
        while (j < units.length && !units[j].v) j++;
        const run = units.slice(i, j);
        if (j >= units.length) { syllables.at(-1).push(...run); break; }                     // final consonants
        if (!syllables.at(-1).some(x => x.v)) { syllables.at(-1).push(...run); i = j; continue; }   // initial consonants
        let onset = 1;
        if (run.length >= 2 && LIQUID_GLIDE.has(run.at(-1).ipa) && !SONORANT.has(run.at(-2).ipa)) onset = 2;
        if (run.length === 0) onset = 0;
        syllables.at(-1).push(...run.slice(0, run.length - onset));
        syllables.push(run.slice(run.length - onset));
        i = j;
    }
    // a syllable that begins with a vowel after a vowel (hiatus) starts its own syllable
    const out = [];
    for (const s of syllables) {
        let cur = [];
        for (const u of s) { if (u.v && cur.some(x => x.v)) { out.push(cur); cur = []; } cur.push(u); }
        out.push(cur);
    }
    const text = out.map(s => s.map(u => u.ipa).join(''));
    return `ˈ${text.join('.')}`;
}

// Syllable boundaries by onset maximisation, stress on the first syllable of words with more than one.
export const ipaWord = form => form.split(' ').map(ipaToken).join(' ');
