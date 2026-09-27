/**
 * Conlang Engine Studio
 * Version: 1.3.0
 * Architecture: Procedural Phonotactic, Morphosyntactic & Semantic Generator
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
    },
    ipaMap: {
        'a': '/a/', 'e': '/e/', 'i': '/i/', 'o': '/o/', 'u': '/u/', 'y': '/y/', 'ø': '/ø/', 'æ': '/æ/',
        'p': '/p/', 't': '/t/', 'k': '/k/', 'b': '/b/', 'd': '/d/', 'g': '/ɡ/', 'm': '/m/', 'n': '/n/',
        's': '/s/', 'z': '/z/', 'r': '/r/', 'l': '/l/', 'q': '/q/', 'x': '/x/', 'kh': '/x/', 'gh': '/ɣ/',
        'sh': '/ʃ/', 'zh': '/ʒ/', 'f': '/f/', 'v': '/v/', 'th': '/θ/', 'dh': '/ð/', 'w': '/w/', 'j': '/j/'
    }
};

const SyllableStructures = {
    musical: ['CV', 'V', 'CVV'],
    dark: ['CVC', 'CCVC', 'CVCC'],
    magical: ['CV', 'CVV', 'VC'],
    aquatic: ['CV', 'V', 'CVC'],
    harsh: ['CCVC', 'CVC', 'CVCC', 'CCVCC']
};

const ContextualLexicon = {
    nouns: [
        "sun", "moon", "water", "fire", "earth", "sky", "person", "man", "woman", "child",
        "king", "leader", "god", "spirit", "sword", "shield", "trade", "gold", "house", "city",
        "star", "river", "tree", "animal", "beast", "life", "death", "blood", "war", "peace",
        "food", "bread", "night", "day", "shadow", "light", "stone", "iron", "wind", "sea"
    ],
    verbs: [
        "run", "walk", "speak", "see", "hear", "fight", "build", "love", "hate", "eat",
        "drink", "sleep", "die", "live", "give", "take", "think", "know", "lead", "rule"
    ],
    adjectives: [
        "great", "small", "bright", "dark", "strong", "weak", "old", "young", "good", "evil",
        "hot", "cold", "fast", "slow", "hard", "soft", "wise", "wild", "holy", "mortal"
    ],
    grammatical: [
        "and", "or", "but", "if", "in", "on", "at", "with", "from", "to", "by", "for",
        "I", "you", "he", "she", "it", "we", "they", "this", "that"
    ],
    culturalModifiers: {
        medieval: { nouns: ["feud", "castle", "knight", "honor", "vassal", "lance", "crown"], verbs: ["joust", "pledge"], adjectives: ["noble", "feudal"] },
        ancient: { nouns: ["empire", "chariot", "oracle", "bronze", "tomb", "papyrus"], verbs: ["conquer", "annoint"], adjectives: ["imperial", "archaic"] },
        primitive: { nouns: ["hunt", "tribe", "cave", "flint", "pelt", "totem"], verbs: ["track", "gather"], adjectives: ["savage", "primal"] },
        renaissance: { nouns: ["art", "guild", "patron", "cannon", "sail", "monarch"], verbs: ["paint", "navigate"], adjectives: ["erudite", "ornate"] },
        african: { nouns: ["savanna", "spirit", "ancestor", "drum", "elder", "drought"], verbs: ["praise", "resonate"], adjectives: ["ancestral", "arid"] },
        alien: { nouns: ["plasma", "void", "hive", "orbit", "core", "nexus"], verbs: ["synthesize", "warp"], adjectives: ["astral", "synthetic"] }
    }
};

class ConlangEngine {
    constructor() {
        this.currentConfig = {};
        this.usedWords = new Set();
        this.lastGeneratedData = null;
    }

    boxMullerRandom() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    generatePhonotacticWord(targetSyllables = 2, isGrammatical = false) {
        const vowels = Phonetics.vowels[this.currentConfig.vowelSet] || Phonetics.vowels.standard;
        const consonants = Phonetics.consonants[this.currentConfig.consonantSet] || Phonetics.consonants.balanced;
        const structures = SyllableStructures[this.currentConfig.aesthetic] || SyllableStructures.musical;

        let numSyllables = isGrammatical ? 1 : Math.max(1, Math.round(targetSyllables));
        let word = '';
        let attempts = 0;

        do {
            word = '';
            for (let i = 0; i < numSyllables; i++) {
                const struct = structures[Math.floor(Math.random() * structures.length)];
                for (let char of struct) {
                    if (char === 'C') {
                        word += consonants[Math.floor(Math.random() * consonants.length)];
                    } else if (char === 'V') {
                        word += vowels[Math.floor(Math.random() * vowels.length)];
                    }
                }
            }
            attempts++;
            if (attempts > 100) {
                word += attempts; 
                break;
            }
        } while (this.usedWords.has(word));

        this.usedWords.add(word);
        return word;
    }

    generateLanguageName() {
        const oldUsed = new Set(this.usedWords);
        const nameWord1 = this.generatePhonotacticWord(2, false);
        const nameWord2 = this.generatePhonotacticWord(1, false);
        
        let name = '';
        if (this.currentConfig.aesthetic === 'musical' || this.currentConfig.aesthetic === 'magical') {
            name = nameWord1.charAt(0).toUpperCase() + nameWord1.slice(1) + '-' + nameWord2;
        } else if (this.currentConfig.aesthetic === 'dark' || this.currentConfig.aesthetic === 'harsh') {
            name = nameWord1.charAt(0).toUpperCase() + nameWord1.slice(1).toUpperCase() + " " + nameWord2.toUpperCase();
        } else {
            name = nameWord1.charAt(0).toUpperCase() + nameWord1.slice(1);
        }
        
        this.usedWords = oldUsed;
        return name;
    }

    buildDataset(config) {
        this.currentConfig = config;
        this.usedWords.clear();

        const langName = this.generateLanguageName();

        // Affixes Setup
        const prefix = this.generatePhonotacticWord(1, true);
        const suffix = this.generatePhonotacticWord(1, true);
        const caseSuffix = this.generatePhonotacticWord(1, true);

        // Articles Setup
        const articles = {};
        if (config.articleMode === 'both' || config.articleMode === 'definite_only' || config.articleMode === 'partitive') {
            articles.definite = this.generatePhonotacticWord(1, true);
        }
        if (config.articleMode === 'both' || config.articleMode === 'indefinite_only' || config.articleMode === 'partitive') {
            articles.indefinite = this.generatePhonotacticWord(1, true);
        }
        if (config.articleMode === 'partitive') {
            articles.partitive = this.generatePhonotacticWord(1, true);
        }

        // Build 600-Word Lexicon
        const vocabulary = [];
        const categories = [
            { type: 'Noun', concepts: [...ContextualLexicon.nouns, ...(ContextualLexicon.culturalModifiers[config.culture]?.nouns || [])] },
            { type: 'Verb', concepts: [...ContextualLexicon.verbs, ...(ContextualLexicon.culturalModifiers[config.culture]?.verbs || [])] },
            { type: 'Adjective', concepts: [...ContextualLexicon.adjectives, ...(ContextualLexicon.culturalModifiers[config.culture]?.adjectives || [])] },
            { type: 'Grammatical Word', concepts: ContextualLexicon.grammatical }
        ];

        let index = 0;
        while (vocabulary.length < 600) {
            const cat = categories[index % categories.length];
            const rawConcept = cat.concepts[Math.floor(index / categories.length) % cat.concepts.length];
            const uniqueConcept = index >= categories.length * cat.concepts.length 
                ? `${rawConcept} (${Math.floor(index / cat.concepts.length)})` 
                : rawConcept;

            const isGram = cat.type === 'Grammatical Word';
            const sampleSyllables = config.meanLength + (this.boxMullerRandom() * config.stdDev);
            let word = this.generatePhonotacticWord(sampleSyllables, isGram);

            if (config.morphologyType === 'agglutinative' && !isGram && Math.random() > 0.6) {
                if (Math.random() > 0.5) word = prefix + '-' + word;
                else word = word + '-' + suffix;
            }

            vocabulary.push({
                conlang: word,
                english: uniqueConcept,
                category: cat.type
            });

            index++;
        }

        // Generate 50 Sentences
        const sentences = [];
        const nouns = vocabulary.filter(v => v.category === 'Noun');
        const verbs = vocabulary.filter(v => v.category === 'Verb');
        const adjs = vocabulary.filter(v => v.category === 'Adjective');

        for (let i = 0; i < 50; i++) {
            const n = nouns[i % nouns.length];
            const v = verbs[i % verbs.length];
            const a = adjs[i % adjs.length];

            let cWords = [];
            let eWords = [];

            if (articles.definite && Math.random() > 0.4) {
                cWords.push(articles.definite);
                eWords.push("the");
            }

            cWords.push(a.conlang);
            eWords.push(a.english);

            let subj = n.conlang;
            if (config.grammarStrategy === 'cases') {
                subj += caseSuffix;
            }
            cWords.push(subj);
            eWords.push(n.english);

            cWords.push(v.conlang);
            eWords.push(v.english);

            const cStr = cWords.join(' ');
            const eStr = eWords.join(' ');

            sentences.push({
                conlang: cStr.charAt(0).toUpperCase() + cStr.slice(1) + '.',
                english: eStr.charAt(0).toUpperCase() + eStr.slice(1) + '.'
            });
        }

        // Generate 20 Dialogues
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

        // Generate Grammar Profile
        const vowelsList = Phonetics.vowels[config.vowelSet] || Phonetics.vowels.standard;
        const consList = Phonetics.consonants[config.consonantSet] || Phonetics.consonants.balanced;

        const grammar = {
            languageName: langName,
            phonology: {
                vowelInventory: vowelsList,
                consonantInventory: consList,
                ipaVowels: vowelsList.map(v => Phonetics.ipaMap[v] || `/${v}/`),
                ipaConsonants: consList.map(c => Phonetics.ipaMap[c] || `/${c}/`),
                syllableStructures: SyllableStructures[config.aesthetic] || SyllableStructures.musical,
                phonotacticConstraints: `Mean Syllables: ${config.meanLength}, Std Dev: ${config.stdDev}. Short monosyllabic structures strictly assigned to Grammatical Words.`
            },
            morphology: {
                type: config.morphologyType === 'agglutinative' ? 'Agglutinative (Affix Stacking)' : 'Isolating / Fusional',
                derivationalAffixes: {
                    prefix: prefix,
                    suffix: suffix
                },
                inflectionalCases: config.grammarStrategy === 'cases' ? { nominativeSubjectSuffix: caseSuffix } : 'None (Prepositional Strategy)'
            },
            syntax: {
                wordOrder: 'Subject-Verb-Object (SVO) / Adjective-Noun Modifier Alignment',
                grammaticalRelations: config.grammarStrategy === 'cases' ? 'Case-Marked Suffixes' : 'Prepositional & Fixed Positional Order',
                articleSystem: articles
            },
            semanticsAndContext: {
                aestheticProfile: config.aesthetic,
                culturalProfile: config.culture,
                sociolinguisticContext: config.sociology
            }
        };

        this.lastGeneratedData = {
            metadata: {
                generatedAt: new Date().toISOString(),
                languageName: langName,
                configuration: config
            },
            grammar,
            vocabulary,
            sentences,
            dialogues
        };

        return this.lastGeneratedData;
    }
}

// UI Controller
document.addEventListener('DOMContentLoaded', () => {
    const engine = new ConlangEngine();

    const quickBtn = document.getElementById('quick-generate-btn');
    const customBtn = document.getElementById('custom-generate-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const copyJsonBtn = document.getElementById('copy-json-btn');
    const titleBadge = document.getElementById('conlang-title-badge');

    const descPreset = document.getElementById('descriptive-preset');
    const cultPreset = document.getElementById('cultural-preset');
    const socioPreset = document.getElementById('sociological-preset');
    const meanLengthInput = document.getElementById('mean-length');
    const stdDevInput = document.getElementById('std-dev');
    const articleModeSelect = document.getElementById('article-mode');
    const morphologySelect = document.getElementById('morphology-type');
    const grammarStrategySelect = document.getElementById('grammar-strategy');
    const vowelPreset = document.getElementById('vowel-inventory');
    const consPreset = document.getElementById('consonant-inventory');

    function getFormConfig() {
        return {
            aesthetic: descPreset.value === 'custom' ? 'musical' : descPreset.value,
            culture: cultPreset.value,
            sociology: socioPreset.value,
            meanLength: parseFloat(meanLengthInput.value) || 2.5,
            stdDev: parseFloat(stdDevInput.value) || 0.8,
            articleMode: articleModeSelect.value,
            morphologyType: morphologySelect.value,
            grammarStrategy: grammarStrategySelect.value,
            vowelSet: vowelPreset.value,
            consonantSet: consPreset.value
        };
    }

    function renderOutput(data) {
        titleBadge.textContent = `Language: ${data.grammar.languageName}`;

        // Render Grammar Profile
        const grammarContainer = document.getElementById('grammar-container');
        const g = data.grammar;
        grammarContainer.innerHTML = `
            <div class="grammar-section">
                <h3>Systemic Summary: ${g.languageName}</h3>
                <div class="grammar-grid">
                    <div class="grammar-item">
                        <strong>Phonological Inventory:</strong><br>
                        Vowels: ${g.phonology.vowelInventory.join(', ')} (${g.phonology.ipaVowels.join(' ')})<br>
                        Consonants: ${g.phonology.consonantInventory.join(', ')} (${g.phonology.ipaConsonants.join(' ')})
                    </div>
                    <div class="grammar-item">
                        <strong>Phonotactics:</strong><br>
                        Structures: [${g.phonology.syllableStructures.join(', ')}]<br>
                        ${g.phonology.phonotacticConstraints}
                    </div>
                    <div class="grammar-item">
                        <strong>Morphology & Affixation:</strong><br>
                        Type: ${g.morphology.type}<br>
                        Prefix: <em>${g.morphology.derivationalAffixes.prefix}-</em> | Suffix: <em>-${g.morphology.derivationalAffixes.suffix}</em>
                    </div>
                    <div class="grammar-item">
                        <strong>Syntax & Articles:</strong><br>
                        Word Order: ${g.syntax.wordOrder}<br>
                        Articles: ${Object.keys(g.syntax.articleSystem).length > 0 ? JSON.stringify(g.syntax.articleSystem) : 'None'}
                    </div>
                </div>
            </div>
        `;

        // Render Words
        const wordsContainer = document.getElementById('words-container');
        wordsContainer.innerHTML = data.vocabulary.map(item => `
            <div class="card">
                <span class="category-tag">${item.category}</span>
                <div class="conlang-word">${item.conlang}</div>
                <div class="translation">${item.english}</div>
            </div>
        `).join('');

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
                <h4>Dialogue #${index + 1}</h4>
                ${dialogue.map(line => `
                    <div class="dialogue-line">
                        <span class="speaker">${line.speaker}:</span>${line.conlang}
                        <br><small class="translation">${line.english}</small>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    function executeGeneration(config) {
        const result = engine.buildDataset(config);
        renderOutput(result);
    }

    quickBtn.addEventListener('click', () => {
        const presets = ['musical', 'dark', 'magical', 'aquatic', 'harsh'];
        const cultures = ['medieval', 'ancient', 'primitive', 'renaissance', 'african', 'alien'];
        const articleModes = ['both', 'definite_only', 'indefinite_only', 'partitive', 'none'];
        
        const randomConfig = {
            aesthetic: presets[Math.floor(Math.random() * presets.length)],
            culture: cultures[Math.floor(Math.random() * cultures.length)],
            sociology: 'hierarchical',
            meanLength: 2.2,
            stdDev: 0.7,
            articleMode: articleModes[Math.floor(Math.random() * articleModes.length)],
            morphologyType: Math.random() > 0.5 ? 'agglutinative' : 'isolating',
            grammarStrategy: Math.random() > 0.5 ? 'cases' : 'prepositions',
            vowelSet: 'standard',
            consonantSet: 'balanced'
        };

        descPreset.value = randomConfig.aesthetic;
        cultPreset.value = randomConfig.culture;
        articleModeSelect.value = randomConfig.articleMode;
        morphologySelect.value = randomConfig.morphologyType;
        grammarStrategySelect.value = randomConfig.grammarStrategy;
        
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
        a.download = `${engine.lastGeneratedData.grammar.languageName.toLowerCase().replace(/\s+/g, '-')}-conlang.json`;
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
        }).catch(err => {
            console.error('Failed to copy JSON: ', err);
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
