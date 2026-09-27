/**
 * Conlang Engine Studio
 * Version: 1.1.0
 * Architecture: Procedural Phonotactic & Semantic Generator
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

const ContextualLexicon = {
    baseConcepts: [
        "sun", "moon", "water", "fire", "earth", "sky", "person", "man", "woman", "child",
        "king", "leader", "god", "spirit", "sword", "shield", "trade", "gold", "house", "city",
        "star", "river", "tree", "animal", "beast", "life", "death", "blood", "war", "peace",
        "food", "bread", "night", "day", "shadow", "light", "stone", "iron", "wind", "sea"
    ],
    culturalModifiers: {
        medieval: ["feud", "castle", "knight", "honor", "vassal", "plague", "lance", "crown"],
        ancient: ["empire", "chariot", "oracle", "bronze", "tomb", "dynasty", "papyrus"],
        primitive: ["hunt", "tribe", "cave", "flint", "pelt", "totem", "beast", "flame"],
        renaissance: ["art", "guild", "patron", "cannon", "sail", "monarch", "science"],
        african: ["savanna", "spirit", "ancestor", "drum", "elder", "drought", "lion"],
        alien: ["plasma", "void", "hive", "orbit", "core", "synthesis", "nexus", "nebula"]
    }
};

class ConlangEngine {
    constructor() {
        this.currentConfig = {};
        this.lastGeneratedData = null;
    }

    generatePhonotacticWord(minSyllables = 1, maxSyllables = 3) {
        const vowels = Phonetics.vowels[this.currentConfig.vowelSet] || Phonetics.vowels.standard;
        const consonants = Phonetics.consonants[this.currentConfig.consonantSet] || Phonetics.consonants.balanced;
        const structures = SyllableStructures[this.currentConfig.aesthetic] || SyllableStructures.musical;

        const numSyllables = Math.floor(Math.random() * (maxSyllables - minSyllables + 1)) + minSyllables;
        let word = '';

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
        return word;
    }

    buildDataset(config) {
        this.currentConfig = config;
        
        // 1. Vocabulary (600 entries)
        const vocabulary = [];
        const baseConcepts = ContextualLexicon.baseConcepts;
        const extraConcepts = ContextualLexicon.culturalModifiers[config.culture] || [];
        const fullConcepts = [...baseConcepts, ...extraConcepts];

        for (let i = 0; i < 600; i++) {
            const concept = fullConcepts[i % fullConcepts.length] + (i >= fullConcepts.length ? ` (${Math.floor(i / fullConcepts.length)})` : '');
            vocabulary.push({
                conlang: this.generatePhonotacticWord(1, 3),
                english: concept
            });
        }

        // 2. Sentences (50 entries)
        const sentences = [];
        for (let i = 0; i < 50; i++) {
            const length = Math.floor(Math.random() * 4) + 3;
            let conlangSentence = [];
            let englishSentence = [];
            
            for (let j = 0; j < length; j++) {
                const randomWord = vocabulary[Math.floor(Math.random() * vocabulary.length)];
                conlangSentence.push(randomWord.conlang);
                englishSentence.push(randomWord.english);
            }

            const cStr = conlangSentence.join(' ');
            const eStr = englishSentence.join(' ');

            sentences.push({
                conlang: cStr.charAt(0).toUpperCase() + cStr.slice(1) + '.',
                english: eStr.charAt(0).toUpperCase() + eStr.slice(1) + '.'
            });
        }

        // 3. Dialogues (20 entries)
        const dialogues = [];
        for (let i = 0; i < 20; i++) {
            const dialogueLines = [];
            const turns = Math.floor(Math.random() * 3) + 2; // 2 to 4 turns
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
                generatedAt: new Date().toISOString(),
                configuration: config
            },
            vocabulary,
            sentences,
            dialogues
        };

        return this.lastGeneratedData;
    }
}

// UI Controller & Event Handlers
document.addEventListener('DOMContentLoaded', () => {
    const engine = new ConlangEngine();

    const quickBtn = document.getElementById('quick-generate-btn');
    const customBtn = document.getElementById('custom-generate-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const copyJsonBtn = document.getElementById('copy-json-btn');

    const descPreset = document.getElementById('descriptive-preset');
    const cultPreset = document.getElementById('cultural-preset');
    const socioPreset = document.getElementById('sociological-preset');
    const vowelPreset = document.getElementById('vowel-inventory');
    const consPreset = document.getElementById('consonant-inventory');

    function getFormConfig() {
        return {
            aesthetic: descPreset.value === 'custom' ? 'musical' : descPreset.value,
            culture: cultPreset.value,
            sociology: socioPreset.value,
            vowelSet: vowelPreset.value,
            consonantSet: consPreset.value
        };
    }

    function renderOutput(data) {
        // Render Words
        const wordsContainer = document.getElementById('words-container');
        wordsContainer.innerHTML = data.vocabulary.map(item => `
            <div class="card">
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
        
        const randomConfig = {
            aesthetic: presets[Math.floor(Math.random() * presets.length)],
            culture: cultures[Math.floor(Math.random() * cultures.length)],
            sociology: 'hierarchical',
            vowelSet: 'standard',
            consonantSet: 'balanced'
        };

        descPreset.value = randomConfig.aesthetic;
        cultPreset.value = randomConfig.culture;
        executeGeneration(randomConfig);
    });

    customBtn.addEventListener('click', () => {
        executeGeneration(getFormConfig());
    });

    // Download JSON File
    exportJsonBtn.addEventListener('click', () => {
        if (!engine.lastGeneratedData) return;
        
        const jsonString = JSON.stringify(engine.lastGeneratedData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `conlang-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Copy JSON to Clipboard
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
