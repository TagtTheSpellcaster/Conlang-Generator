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

function ipaToken(word, stress = 'penult') {
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
    const n = out.length;
    const heavy = i => out[i].some(u => u.ipa.endsWith('ː')) || !out[i].at(-1).v;
    const lastLetter = letters.at(-1);
    let main;
    switch (stress) {
        case 'final': main = n - 1; break;
        case 'initial': main = 0; break;
        case 'latin': main = n === 2 ? 0 : heavy(n - 2) ? n - 2 : n - 3; break;
        case 'consonant-final': main = isVowelLetter(lastLetter) || lastLetter === 'n' || lastLetter === 's' ? n - 2 : n - 1; break;
        default: main = n - 2;
    }
    main = Math.max(0, main);
    const secondary = new Set();
    if (stress === 'initial') { for (let i = 2; i < n - 1; i += 2) if (n >= 5) secondary.add(i); }
    else for (let i = main - 2; i >= 0; i -= 2) secondary.add(i);
    const text = out.map((sy, i) => `${i === main ? 'ˈ' : secondary.has(i) ? 'ˌ' : ''}${sy.map(u => u.ipa).join('')}`);
    return text.join('.').replace(/\.([ˈˌ])/g, '$1');
}

// Stress systems (a property of the language, fixed by its seed). Weights follow what is common among natural languages:
// stress mostly falls on the last or the last-but-one syllable.
//   penult: always the last-but-one (Polish, Swahili); final: always the last (Turkish-like, French-like);
//   latin: last-but-one if heavy (long vowel or closed syllable), otherwise the one before it;
//   consonant-final: last-but-one in words ending in a vowel, n or s, last syllable otherwise (Spanish);
//   initial: first syllable (Czech, Hungarian, Finnish), the rarest of the five here.
export const STRESS_SYSTEMS = [
    { id: 'penult', weight: 34, text: 'stress on the last-but-one syllable' },
    { id: 'latin', weight: 26, text: 'stress on the last-but-one syllable if it is heavy (long vowel or closed), otherwise on the one before it' },
    { id: 'consonant-final', weight: 18, text: 'stress on the last-but-one syllable, or on the last one in words ending in a consonant other than n or s' },
    { id: 'final', weight: 15, text: 'stress on the last syllable' },
    { id: 'initial', weight: 7, text: 'stress on the first syllable' }
];
export function stressSystemFor(roll) {                          // roll in [0, 1)
    const total = STRESS_SYSTEMS.reduce((a, x) => a + x.weight, 0);
    let t = roll * total;
    for (const x of STRESS_SYSTEMS) { if ((t -= x.weight) < 0) return x; }
    return STRESS_SYSTEMS[0];
}
export const stressOf = lang => lang?.phonology?.stress ?? 'penult';

// Syllable boundaries by onset maximisation; stress by the given system (one syllable words carry no mark).
export const ipaWord = (form, stress = 'penult') => form.split(' ').map(w => ipaToken(w, stress)).join(' ');
