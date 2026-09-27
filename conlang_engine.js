/**
 * Conlang Engine Studio
 * Version: 1.2.0
 * Architecture: Procedural Phonotactic, Morphological & Semantic Generator
 */

const Phonetics = {
    vowels: {
        standard: ['a', 'e', 'i', 'o', 'u'],
        minimal: ['a', 'i', 'u'],
        extended: ['a', 'e', 'i', 'o', 'u', 'y', 'ø', 'æ']
    },
    consonants: {
        balanced: ['p', 't', 'k', 'b', 'd', 'g', 'm', 'n', 's', 'r', 'l'],
        guttural: ['k', 'q', 'x', 'g', 'r', 'kh', 'gh', 'q', 't'],
        sibilant: ['s', 'z', 'sh', 'zh', 'f', 'v', 'r', 'l', 'th'],
        soft: ['m', 'n', 'l', 'r', 'w', 'j', 'v', 'dh']
    }
};

const SyllableStructures = {
    musical: ['CV', 'V', 'CVV'],
    dark: ['CVC', 'CCVC', 'CVCC'],
    magical: ['CV', 'CVV', 'VC'],
    aquatic: ['CV', 'V', 'CVC'],
    harsh: ['CCVC', 'CVC', 'CVCC', 'CCVCC']
};

const Contextology = {
    lexiconByPOS: {
        noun: [
            "sun", "moon", "water", "fire", "earth", "sky", "person", "man", "woman", "child",
            "king", "leader", "god", "spirit", "sword", "shield", "trade", "gold", "house", "city",
            "star", "river", "tree", "animal", "beast", "life", "death", "blood", "war", "peace",
            "food", "bread", "night", "day", "shadow", "light", "stone", "iron", "wind", "sea",
            "mountain", "forest", "path", "ocean", "brother", "sister", "mother", "father", "bloodline",
            "tower", "gate", "ship", "cloud", "rain", "storm", "ice", "winter", "summer", "time"
        ],
        verb: [
            "speak", "run", "walk", "fight", "build", "create", "destroy", "see", "hear", "think",
            "love", "hate", "give", "take", "seek", "find", "burn", "freeze", "live", "die",
            "rule", "lead", "follow", "protect", "strike", "fly", "swim", "sleep", "wake", "know",
            "remember", "forget", "praise", "curse", "sing", "dance", "gather", "divide", "carry", "fall"
        ],
        adjective: [
            "great", "small", "bright", "dark", "ancient", "young", "strong", "weak", "swift", "slow",
            "cold", "hot", "sacred", "profane", "noble", "vile", "true", "false", "hard", "soft",
            "deep", "shallow", "silent", "loud", "fierce", "gentle", "golden", "iron", "immortal", "mortal"
        ],
        grammatical: {
            pronouns: ["I", "you", "he", "she", "it", "we", "they"],
            conjunctions: ["and", "or", "but", "because", "if", "so"],
            prepositions: ["in", "on", "at", "to", "from", "with", "without", "for", "by", "under", "over"],
            cases: ["NOM", "ACC", "GEN", "DAT", "ABL", "LOC"]
        }
    },
    culturalModifiers: {
        medieval: { noun: ["feud", "castle", "knight", "vassal", "plague", "lance", "crown"], verb: ["joust", "pledge", "besiege"], adj: ["feudal", "chivalrous"] },
        ancient: { noun: ["empire", "chariot", "oracle", "bronze", "tomb", "dynasty"], verb: ["anoint", "sacrifice"], adj: ["archaic", "imperial"] },
        primitive: { noun: ["hunt", "tribe", "cave", "flint", "pelt", "totem"], verb: ["track", "carve"], adj: ["wild", "ancestral"] },
        renaissance: { noun: ["art", "guild", "patron", "cannon", "sail", "monarch"], verb: ["paint", "discover"], adj: ["reformed", "erudite"] },
        african: { noun: ["savanna", "spirit", "ancestor", "drum", "elder", "drought"], verb: ["drum", "invoke"], adj: ["ancestral", "aridity"] },
        alien: { noun: ["plasma", "void", "hive", "orbit", "core", "nexus"], verb: ["warp", "synthesize"], adj: ["psionic", "orbital"] }
    }
};

class ConlangEngine {
    constructor() {
        this.currentConfig = {};
        this.lastGeneratedData = null;
        this.usedWords = new Set();
        this.affixes = { prefixes: {}, suffixes: {} };
    }

    // Box-Muller transform for normal distribution
    getRandomGaussian(mean, stdDev) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return mean + num * stdDev;
    }

    generatePhonotacticWord(targetLength, isGrammatical = false) {
        const vowels = Phonetics.vowels[this.currentConfig.vowelSet] || Phonetics.vowels.standard;
        const consonants = Phonetics.consonants[this.currentConfig.consonantSet] || Phonetics.consonants.balanced;
        const structures = SyllableStructures[this.currentConfig.aesthetic] || SyllableStructures.musical;

        let attempts = 0;
        let word = '';

        while (attempts < 100) {
            attempts++;
            word = '';
            
            // Grammatical words prioritize shorter 1-2 syllable structures
            if (isGrammatical) {
                const shortStructs = structures.filter(s => s.length <= 3);
                const struct = shortStructs[Math.floor(Math.random() * shortStructs.length)] || 'CV';
                for (let char of struct) {
                    word += (char === 'C') 
                        ? consonants[Math.floor(Math.random() * consonants.length)]
                        : vowels[Math.floor(Math.random() * vowels.length)];
                }
            } else {
                // Generate syllables until word reaches target length close to Gaussian distribution
                while (word.length < Math.max(3, targetLength - 1)) {
                    const struct = structures[Math.floor(Math.random() * structures.length)];
                    for (let char of struct) {
                        word += (char === 'C') 
                            ? consonants[Math.floor(Math.random() * consonants.length)]
                            : vowels[Math.floor(Math.random() * vowels.length)];
                    }
                }
            }

            // Uniqueness check
            if (!this.usedWords.has(word)) {
                this.usedWords.add(word);
                return word;
            }
        }
        
        // Fallback unique word appending number if collision persists
        let fallback = word + Math.floor(Math.random() * 99);
        this.usedWords.add(fallback);
        return fallback;
    }

    initializeAffixes() {
        const meanLen = this.currentConfig.meanLength;
        const stdDev = this.currentConfig.stdDev;

        this.affixes = {
            prefixes: {
                negation: this.generatePhonotacticWord(Math.max(2, meanLen - 3), true),
                plural: this.generatePhonotacticWord(Math.max(2, meanLen - 3), true),
                augmentative: this.generatePhonotacticWord(Math.max(2, meanLen - 3), true)
            },
            suffixes: {
                nounToAdj: this.generatePhonotacticWord(Math.max(2, meanLen - 3), true),
                verbToNoun: this.generatePhonotacticWord(Math.max(2, meanLen - 3), true),
                pastTense: this.generatePhonotacticWord(Math.max(2, meanLen - 3), true),
                caseEndings: {
                    genitive: this.generatePhonotacticWord(2, true),
                    accusative: this.generatePhonotacticWord(2, true),
                    dative: this.generatePhonotacticWord(2, true)
                }
            }
        };
    }

    generateArticles() {
        const articles = [];
        const mode = this.currentConfig.articleSystem;

        if (mode === 'none') return articles;

        const meanLen = this.currentConfig.meanLength;

        if (mode === 'both' || mode === 'definite_only') {
            articles.push({
                conlang: this.generatePhonotacticWord(Math.max(2, meanLen - 4), true),
                english: "the (def. art.)",
                pos: "grammatical",
                morphNote: "Definite Article"
            });
        }

        if (mode === 'both' || mode === 'indefinite_only') {
            articles.push({
                conlang: this.generatePhonotacticWord(Math.max(2, meanLen - 4), true),
                english: "a/an (indef. art.)",
                pos: "grammatical",
                morphNote: "Indefinite Article"
            });
        }

        if (mode === 'partitive') {
            articles.push({
                conlang: this.generatePhonotacticWord(Math.max(2, meanLen - 4), true),
                english: "some (partitive art.)",
                pos: "grammatical",
                morphNote: "Partitive Article"
            });
        }

        return articles;
    }

    buildDataset(config) {
        this.currentConfig = config;
        this.usedWords.clear();
        this.initializeAffixes();

        const vocabulary = [];
        const targetTotal = 600;

        // 1. Articles Generation
        const articleList = this.generateArticles();
        vocabulary.push(...articleList);

        // 2. Grammatical Function Words
        const gramData = Contextology.lexiconByPOS.grammatical;
        [...gramData.pronouns, ...gramData.conjunctions, ...gramData.prepositions].forEach(meaning => {
            vocabulary.push({
                conlang: this.generatePhonotacticWord(Math.max(2, config.meanLength - 3), true),
                english: meaning,
                pos: "grammatical",
                morphNote: "Grammatical particle"
            });
        });

        // 3. Main Vocabulary Categorization (Nouns, Verbs, Adjectives)
        const posDistribution = [
            { pos: "noun", count: 280, base: Contextology.lexiconByPOS.noun },
            { pos: "verb", count: 160, base: Contextology.lexiconByPOS.verb },
            { pos: "adjective", count: 120, base: Contextology.lexiconByPOS.adjective }
        ];

        posDistribution.forEach(group => {
            const cultureExtras = (Contextology.culturalModifiers[config.culture] && Contextology.culturalModifiers[config.culture][group.pos]) 
                ? Contextology.culturalModifiers[config.culture][group.pos] 
                : [];
            
            const conceptPool = [...group.base, ...cultureExtras];

            for (let i = 0; i < group.count; i++) {
                const targetLen = Math.round(this.getRandomGaussian(config.meanLength, config.stdDev));
                const concept = conceptPool[i % conceptPool.length] + (i >= conceptPool.length ? ` (${Math.floor(i / conceptPool.length) + 1})` : '');
                
                let baseWord = this.generatePhonotacticWord(targetLen, false);
                let morphNote = "Root word";

                // Derived Morphology Application
                if (config.morphType === 'agglutinative' && i % 4 === 0) {
                    if (group.pos === 'adjective') {
                        baseWord = baseWord + "-" + this.affixes.suffixes.nounToAdj;
                        morphNote = "Derived from noun root + adj suffix";
                    } else if (group.pos === 'noun') {
                        baseWord = this.affixes.prefixes.augmentative + "-" + baseWord;
                        morphNote = "Augmentative prefix + noun root";
                    }
                }

                vocabulary.push({
                    conlang: baseWord,
                    english: concept,
                    pos: group.pos,
                    morphNote: morphNote
                });
            }
        });

        // Fill remaining entries if needed to meet 600 words
        while (vocabulary.length < targetTotal) {
            const targetLen = Math.round(this.getRandomGaussian(config.meanLength, config.stdDev));
            vocabulary.push({
                conlang: this.generatePhonotacticWord(targetLen, false),
                english: `term_${vocabulary.length + 1}`,
                pos: "noun",
                morphNote: "Derived term"
            });
        }

        // 4. Sentences Generation (50 entries)
        const sentences = [];
        const nouns = vocabulary.filter(w => w.pos === 'noun');
        const verbs = vocabulary.filter(w => w.pos === 'verb');
        const adjs = vocabulary.filter(w => w.pos === 'adjective');
        const grams = vocabulary.filter(w => w.pos === 'grammatical');

        for (let i = 0; i < 50; i++) {
            const n1 = nouns[Math.floor(Math.random() * nouns.length)];
            const v = verbs[Math.floor(Math.random() * verbs.length)];
            const n2 = nouns[Math.floor(Math.random() * nouns.length)];
            const adj = adjs[Math.floor(Math.random() * adjs.length)];
            const prep = grams.find(g => g.english === "with") || grams[0];

            let conlangStr = '';
            let englishStr = '';

            if (config.caseSystem === 'cases') {
                conlangStr = `${adj.conlang} ${n1.conlang} ${v.conlang} ${n2.conlang}-${this.affixes.suffixes.caseEndings.accusative}.`;
                englishStr = `The ${adj.english} ${n1.english} ${v.english}s the ${n2.english}.`;
            } else {
                conlangStr = `${n1.conlang} ${v.conlang} ${prep ? prep.conlang : ''} ${adj.conlang} ${n2.conlang}.`;
                englishStr = `The ${n1.english} ${v.english}s with the ${adj.english} ${n2.english}.`;
            }

            sentences.push({
                conlang: conlangStr.charAt(0).toUpperCase() + conlangStr.slice(1),
                english: englishStr
            });
        }

        // 5. Dialogues Generation (20 entries)
        const dialogues = [];
        for (let i = 0; i < 20; i++) {
            const dialogueLines = [];
            const turns = Math.floor(Math.random() * 3) + 2;
            for (let t = 0; t < turns; t++) {
                const speaker = t % 2 === 0 ? "Speaker A" : "Speaker B";
                const sentenceObj = sentences[Math.floor(Math.random() * sentences.length)];
                dialogueLines.push({
                    speaker: speaker,
                    conlang: sentenceObj.conlang,
                    english: sentenceObj.english
                });
            }
            dialogues.push(dialogueLines);
        }

        this.lastGeneratedData = {
            metadata: {
                version: "1.2.0",
                generatedAt: new Date().toISOString(),
                configuration: config,
                affixes: this.affixes
            },
            vocabulary,
            sentences,
            dialogues
        };

        return this.lastGeneratedData;
    }
}

// UI Controller & DOM Binder
document.addEventListener('DOMContentLoaded', () => {
    const engine = new ConlangEngine();

    const quickBtn = document.getElementById('quick-generate-btn');
    const customBtn = document.getElementById('custom-generate-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const copyJsonBtn = document.getElementById('copy-json-btn');

    const meanLengthInput = document.getElementById('mean-length');
    const stdDevInput = document.getElementById('std-dev');
    const morphTypeSelect = document.getElementById('morph-type');
    const caseSystemSelect = document.getElementById('case-system');
    const articleSystemSelect = document.getElementById('article-system');
    const descPreset = document.getElementById('descriptive-preset');
    const cultPreset = document.getElementById('cultural-preset');
    const socioPreset = document.getElementById('sociological-preset');
    const vowelPreset = document.getElementById('vowel-inventory');
    const consPreset = document.getElementById('consonant-inventory');

    const vocabSearch = document.getElementById('vocab-search');
    const posFilter = document.getElementById('pos-filter');

    function getFormConfig() {
        return {
            meanLength: parseFloat(meanLengthInput.value) || 6.5,
            stdDev: parseFloat(stdDevInput.value) || 1.5,
            morphType: morphTypeSelect.value,
            caseSystem: caseSystemSelect.value,
            articleSystem: articleSystemSelect.value,
            aesthetic: descPreset.value,
            culture: cultPreset.value,
            sociology: socioPreset.value,
            vowelSet: vowelPreset.value,
            consonantSet: consPreset.value
        };
    }

    function renderOutput(data) {
        renderVocabulary(data.vocabulary);

        // Render Sentences
        const sentencesContainer = document.getElementById('sentences-container');
        sentencesContainer.innerHTML = data.sentences.map(item => `
            <div class="card" style="margin-bottom: 0.8rem;">
                <div class="conlang-word">${item.conlang}</div>
                <div class="translation">${item.english}</div>
            </div>
        `).join('');

        // Render Dialogues
        const dialoguesContainer = document.getElementById('dialogues-container');
        dialoguesContainer.innerHTML = data.dialogues.map((dialogue, index) => `
            <div class="dialogue-box">
                <h4 style="margin-top:0; color: var(--accent);">Dialogue #${index + 1}</h4>
                ${dialogue.map(line => `
                    <div class="dialogue-line">
                        <span class="speaker">${line.speaker}:</span> ${line.conlang}
                        <br><small class="translation">${line.english}</small>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    function renderVocabulary(vocabulary) {
        const query = vocabSearch.value.toLowerCase();
        const selectedPOS = posFilter.value;

        const filtered = vocabulary.filter(item => {
            const matchesSearch = item.conlang.toLowerCase().includes(query) || item.english.toLowerCase().includes(query);
            const matchesPOS = (selectedPOS === 'all') || (item.pos === selectedPOS);
            return matchesSearch && matchesPOS;
        });

        const wordsContainer = document.getElementById('words-container');
        wordsContainer.innerHTML = filtered.map(item => `
            <div class="card">
                <div class="card-header">
                    <span class="conlang-word">${item.conlang}</span>
                    <span class="pos-badge pos-${item.pos.slice(0, 4)}">${item.pos}</span>
                </div>
                <div class="translation">${item.english}</div>
                <div class="morph-info">${item.morphNote || ''}</div>
            </div>
        `).join('');
    }

    function executeGeneration(config) {
        const result = engine.buildDataset(config);
        renderOutput(result);
    }

    // Event Listeners for Filters
    vocabSearch.addEventListener('input', () => {
        if (engine.lastGeneratedData) renderVocabulary(engine.lastGeneratedData.vocabulary);
    });

    posFilter.addEventListener('change', () => {
        if (engine.lastGeneratedData) renderVocabulary(engine.lastGeneratedData.vocabulary);
    });

    quickBtn.addEventListener('click', () => {
        const presets = ['musical', 'dark', 'magical', 'aquatic', 'harsh'];
        const cultures = ['medieval', 'ancient', 'primitive', 'renaissance', 'african', 'alien'];
        
        const randomConfig = {
            meanLength: 6.0,
            stdDev: 1.2,
            morphType: Math.random() > 0.5 ? 'agglutinative' : 'isolating',
            caseSystem: Math.random() > 0.5 ? 'cases' : 'prepositions',
            articleSystem: 'both',
            aesthetic: presets[Math.floor(Math.random() * presets.length)],
            culture: cultures[Math.floor(Math.random() * cultures.length)],
            sociology: 'hierarchical',
            vowelSet: 'standard',
            consonantSet: 'balanced'
        };

        descPreset.value = randomConfig.aesthetic;
        cultPreset.value = randomConfig.culture;
        morphTypeSelect.value = randomConfig.morphType;
        caseSystemSelect.value = randomConfig.caseSystem;
        executeGeneration(randomConfig);
    });

    customBtn.addEventListener('click', () => {
        executeGeneration(getFormConfig());
    });

    exportJsonBtn.addEventListener('click', () => {
        if (!engine.lastGeneratedData) return;
        const jsonString = JSON.stringify(engine.lastGeneratedData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conlang-export-v1.2.0-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    copyJsonBtn.addEventListener('click', () => {
        if (!engine.lastGeneratedData) return;
        const jsonString = JSON.stringify(engine.lastGeneratedData, null, 2);
        navigator.clipboard.writeText(jsonString).then(() => {
            const originalText = copyJsonBtn.textContent;
            copyJsonBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyJsonBtn.textContent = originalText;
            }, 2000);
        });
    });

    // Tab Navigation Logic
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // Initial default generation
    executeGeneration(getFormConfig());
});
