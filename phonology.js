/* ConLang Generator — shared phonology engine v0.9.6 */
(() => {
    'use strict';

    const VOWELS = {
        standard: ['a', 'e', 'i', 'o', 'u'],
        minimal: ['a', 'i', 'u'],
        extended: ['a', 'e', 'i', 'o', 'u', 'y', 'ø', 'æ']
    };

    const CINFO = {
        p: { type: 'O', place: 'Labiale' }, b: { type: 'O', place: 'Labiale' },
        f: { type: 'O', place: 'Labiale' }, v: { type: 'O', place: 'Labiale' },
        m: { type: 'N', place: 'Labiale' }, t: { type: 'O', place: 'Alveolare' },
        d: { type: 'O', place: 'Alveolare' }, s: { type: 'S', place: 'Alveolare' },
        z: { type: 'S', place: 'Alveolare' }, n: { type: 'N', place: 'Alveolare' },
        l: { type: 'L', place: 'Alveolare' }, r: { type: 'L', place: 'Alveolare' },
        'ʃ': { type: 'S', place: 'Palatale' }, 'ɲ': { type: 'N', place: 'Palatale' },
        j: { type: 'G', place: 'Palatale' }, k: { type: 'O', place: 'Velare' },
        w: { type: 'G', place: 'Velare' }, ŋ: { type: 'N', place: 'Velare' },
        θ: { type: 'O', place: 'Dentale' }, ħ: { type: 'O', place: 'Faringale' },
        ʕ: { type: 'O', place: 'Faringale' }
    };

    const FRIC = new Set(['f', 'v', 's', 'z', 'ʃ']);

    const MODEL = {
        isolated: {
            name: 'Minimalist Isolating', vowels: VOWELS.standard,
            c: ['p', 't', 'k', 'm', 'n', 'l', 'h'], glides: [], nasals: ['m', 'n'],
            make: ['CV', 'V']
        },
        japanese: {
            name: 'Controlled Open Syllable', vowels: VOWELS.standard,
            c: ['p', 't', 'k', 'b', 'd', 'g', 'm', 'n', 's', 'z', 'h', 'r', 'f', 'ŋ'],
            obstruents: ['p', 't', 'k', 'b', 'd', 'g', 'f'], glides: ['j', 'w'],
            nasals: ['n', 'm', 'ŋ'], make: ['CV', 'GV', 'CVN', 'CGV', 'CGVN', 'V']
        },
        european: {
            name: 'Balanced European', vowels: VOWELS.standard,
            c: ['p', 't', 'k', 'b', 'd', 'g', 'f', 'v', 's', 'z', 'm', 'n', 'r', 'l', 'j', 'w'],
            obstruents: ['p', 't', 'k', 'b', 'd', 'g', 'f', 'v'], sibilants: ['s', 'z'],
            liquids: ['r', 'l'], nasals: ['m', 'n'], glides: ['j', 'w'],
            make: ['CV', 'CCV', 'CVC', 'CCVC', 'V']
        },
        english: {
            name: 'Dynamic Anglo-Saxon', vowels: VOWELS.standard,
            c: ['p', 't', 'k', 'b', 'd', 'g', 'f', 'θ', 's', 'z', 'm', 'n', 'ŋ', 'r', 'l', 'j', 'w'],
            sibilants: ['s', 'z'], obstruents: ['p', 't', 'k', 'b', 'd', 'g', 'f', 'θ'],
            nasals: ['m', 'n', 'ŋ'], liquids: ['r', 'l'], glides: ['j', 'w'],
            make: ['CV', 'CVC', 'CCV', 'CCVC', 'CCCV', 'CVCC', 'CVCCC', 'CCVCC']
        },
        slavic: {
            name: 'Compact Slavic', vowels: VOWELS.standard,
            c: ['p', 't', 'k', 'b', 'd', 'g', 'f', 'v', 's', 'z', 'ʃ', 'm', 'n', 'r', 'l', 'j'],
            liquids: ['r', 'l'], make: ['CV', 'CVC', 'CCV', 'CCCV', 'CVCC', 'CCCVCC', 'V']
        },
        semitic: {
            name: 'Root-and-Pattern Semitic', vowels: VOWELS.standard,
            c: ['p', 't', 'k', 'b', 'd', 'g', 'f', 's', 'z', 'ʃ', 'ħ', 'ʕ', 'm', 'n', 'r', 'l'],
            make: ['CV', 'CVC']
        }
    };

    const MODEL_OPTIONS = [
        ['isolated', '1 — Minimalist Isolating (Hawaiian-type)'],
        ['japanese', '2 — Controlled Open Syllable (Japanese-type)'],
        ['european', '3 — Balanced European (Italian/Finnish-type)'],
        ['english', '4 — Dynamic Anglo-Saxon (English-type)'],
        ['slavic', '5 — Compact Slavic (Croatian/Polish-type)'],
        ['semitic', '6 — Semitic Root-and-Pattern (Arabic-type)']
    ];

    let phonologyBusy = false;
    let phonologyCycleSeed = null;

    const $ = id => document.getElementById(id);
    const norm = v => String(v ?? '').toLowerCase().replace(/^to\s+/, '').trim();
    const pick = (a, r) => a[Math.floor(r() * a.length)];
    const isC = c => !!CINFO[c];

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

    function modelFor() {
        return MODEL[$('consonants')?.value] || MODEL.european;
    }

    function vowelSet() {
        return VOWELS[$('vowels')?.value] || VOWELS.standard;
    }

    function consonantRuns(w) {
        const out = [];
        let i = 0;
        while (i < w.length) {
            if (isC(w[i])) {
                let j = i + 1;
                while (j < w.length && isC(w[j])) j++;
                out.push({ start: i, end: j, text: w.slice(i, j) });
                i = j;
            } else i++;
        }
        return out;
    }

    function globalPhonotactics(w) {
        const runs = consonantRuns(w);
        if (runs.length && runs[0].start === 0 && runs[0].text.length >= 2 && runs[0].text[0] === runs[0].text[1]) return false;
        for (const run of runs) {
            for (let i = 0; i < run.text.length - 1; i++) {
                const a = run.text[i], b = run.text[i + 1];
                if (FRIC.has(a) && FRIC.has(b)) {
                    if (a !== b && a !== 's' && a !== 'z') return false;
                    if (a === b && run.start === 0 && i === 0) return false;
                }
            }
        }
        for (const run of runs) {
            const q = run.text;
            for (let i = 0; i < q.length - 1; i++) {
                const a = CINFO[q[i]], b = CINFO[q[i + 1]];
                if (a.place === b.place && q[i] !== q[i + 1]) return false;
            }
            for (let i = 0; i < q.length - 2; i++) {
                for (let j = i + 1; j < i + 3; j++) {
                    if (CINFO[q[i]].place === CINFO[q[j]].place) {
                        const adjacentGem = (j === i + 1 && q[i] === q[j]) || (j === i - 1 && q[i] === q[j]);
                        if (!adjacentGem) return false;
                    }
                }
            }
        }
        return true;
    }

    function countRuns(w, re) {
        let max = 0;
        for (const m of w.matchAll(re)) max = Math.max(max, m[0].length);
        return max;
    }

    function europeanNexusValid(q) {
        if (q.length === 0) return true;
        if (q.length > 3) return false;
        if (q.length === 2) {
            const [a, b] = q.split('');
            const firstSoft = ['r', 'l', 'm', 'n', 's'].includes(a);
            const identical = a === b;
            if (!firstSoft && !identical) return false;
            if (CINFO[a]?.place === CINFO[b]?.place && !identical) return false;
            return true;
        }
        if (q.length === 3) {
            const [a, , c] = q.split('');
            if (!['r', 'l', 'm', 'n', 's'].includes(a)) return false;
            if (!['r', 'l', 'j', 'w'].includes(c)) return false;
            return true;
        }
        return false;
    }

    function modelValid(w, m) {
        const runs = consonantRuns(w);
        if (!w || !/[aeiouyøæ]/i.test(w) && !m.liquids?.some(x => w.includes(x))) return false;
        if (m === MODEL.isolated) {
            if (countRuns(w, /[^aeiouyøæ]/gi) > 1 || countRuns(w, /[aeiouyøæ]/gi) > 3) return false;
            if (/([aeiouyøæ])\1{2,}/i.test(w)) return false;
        }
        if (m === MODEL.japanese) {
            if (countRuns(w, /[^aeiouyøæ]/gi) > 3 || countRuns(w, /[aeiouyøæ]/gi) > 2) return false;
            for (const x of runs) {
                const q = x.text;
                if (q.length === 2 && !m.nasals.includes(q[0])) return false;
                if (q.length === 3 && !(m.nasals.includes(q[0]) && m.obstruents.includes(q[1]) && m.glides.includes(q[2]))) return false;
                if (q.length > 3) return false;
            }
        }
        if (m === MODEL.european) {
            if (countRuns(w, /[^aeiouyøæ]/gi) > 3 || countRuns(w, /[aeiouyøæ]/gi) > 2) return false;
            for (const x of runs) if (!europeanNexusValid(x.text)) return false;
        }
        if (m === MODEL.english) {
            if (countRuns(w, /[^aeiouyøæ]/gi) > 4 || countRuns(w, /[aeiouyøæ]/gi) > 1) return false;
            if (runs.some(x => x.text.length > 4)) return false;
        }
        if (m === MODEL.slavic) {
            if (countRuns(w, /[^aeiouyøæ]/gi) > 4 || countRuns(w, /[aeiouyøæ]/gi) > 1) return false;
            if (runs.some(x => x.text.length > 4)) return false;
            for (const x of runs) {
                const bil = x.text.split('').filter(c => CINFO[c]?.place === 'Labiale').length;
                if (bil > 2) return false;
            }
        }
        if (m === MODEL.semitic) {
            if (!/^[^aeiouyøæ][aeiouyøæ]/i.test(w)) return false;
            if (/[aeiouyøæ][^aeiouyøæ]$/i.test(w) && !/[aeiouyøæ]$/.test(w)) return false;
            if (runs.some(x => x.start === 0 && x.text.length > 1)) return false;
            if (runs.some(x => x.text.length > 2)) return false;
            if (/[aeiouyøæ]{2}/i.test(w)) return false;
        }
        return true;
    }

    function validWord(w, m) {
        return globalPhonotactics(w) && modelValid(w, m);
    }

    function makeSyllable(m, vowels, r) {
        const pattern = pick(m.make, r);
        let out = '';
        for (const ch of pattern) {
            if (ch === 'C') out += pick(m.c, r);
            else if (ch === 'V') out += pick(vowels, r);
            else if (ch === 'G') out += pick(m.glides || ['j', 'w'], r);
            else if (ch === 'N') out += pick(m.nasals || ['n', 'm'], r);
            else if (ch === 'L') out += pick(m.liquids || ['r', 'l'], r);
        }
        return out;
    }

    function makeWord(m, vowels, mean, r) {
        for (let tries = 0; tries < 5000; tries++) {
            const n = Math.max(1, Math.min(6, Math.round(mean + (r() - .5) * 1.4)));
            let w = '';
            for (let i = 0; i < n; i++) w += makeSyllable(m, vowels, r);
            w = w.toLowerCase();
            if (validWord(w, m)) return w;
        }
        return null;
    }

    function createWordFactory(c = {}) {
        const modelKey = MODEL[c.consonants] ? c.consonants : 'european';
        const model = MODEL[modelKey];
        const vowels = VOWELS[c.vowels] || VOWELS.standard;
        const mean = Number(c.mean) || 2.2;
        const seed = String(c.seed || 'auto') + '|phonology|' + modelKey + '|words';
        const r = rng(seed);
        const used = new Set();

        return () => {
            for (let guard = 0; guard < 100; guard++) {
                const word = makeWord(model, vowels, mean, r);
                if (word && !used.has(word)) {
                    used.add(word);
                    return word;
                }
            }
            return 'lex' + Math.floor(r() * 1e6);
        };
    }

    function resetCycle() {
        phonologyCycleSeed = null;
        document.querySelectorAll('#lexicon-output .lex-row .word[data-phonologized="1"]').forEach(cell => {
            delete cell.dataset.phonologized;
        });
    }

    function phonologySeed(requestedSeed, modelKey) {
        if (requestedSeed && requestedSeed !== 'auto') return requestedSeed + '|phonology|' + modelKey;
        if (!phonologyCycleSeed) {
            phonologyCycleSeed = 'auto-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + '|phonology|' + modelKey;
        }
        return phonologyCycleSeed;
    }

    function phonologize() {
        if (phonologyBusy) return;
        const rows = [...document.querySelectorAll('#lexicon-output .lex-row')];
        if (!rows.length || rows.every(row => row.children[0]?.dataset.phonologized === '1')) return;
        phonologyBusy = true;
        try {
            const model = modelFor();
            const vowels = vowelSet();
            const seed = $('seed')?.value.trim() || 'auto';
            const modelKey = Object.keys(MODEL).find(key => MODEL[key] === model) || 'european';
            const mean = Number($('mean')?.value) || 2.2;
            const r = rng(phonologySeed(seed, modelKey));
            const map = new Map();
            const used = new Set();

            rows.forEach(row => {
                const meaning = row.children[1]?.textContent.trim();
                if (!meaning) return;
                let word = map.get(norm(meaning));
                if (!word) {
                    for (let guard = 0; guard < 100; guard++) {
                        word = makeWord(model, vowels, mean, r);
                        if (word && !used.has(word)) break;
                        word = null;
                    }
                    if (!word) return;
                    used.add(word);
                    map.set(norm(meaning), word);
                }
                const cell = row.children[0];
                if (cell) {
                    cell.textContent = word;
                    cell.dataset.phonologized = '1';
                }
            });

            document.querySelectorAll('.sample-word').forEach(el => {
                const meaning = norm(el.getAttribute('data-meaning') || el.textContent);
                const word = map.get(meaning);
                if (word) el.textContent = word;
            });

            document.querySelectorAll('#dictionary-output .dict-row').forEach(row => {
                const strong = row.querySelector('strong');
                const span = row.querySelector('span');
                if (!strong || !span) return;
                const meaning = norm(span.textContent);
                if (map.has(meaning)) strong.textContent = map.get(meaning);
            });
        } finally {
            phonologyBusy = false;
        }
    }

    window.ConlangPhonology = Object.freeze({
        version: '0.9.6',
        models: MODEL,
        modelOptions: MODEL_OPTIONS,
        createWordFactory,
        resetCycle,
        phonologize
    });
})();