/* Conlang Generator — vocabulary-driven engine */
(() => {
  'use strict';

  const PHONETICS = {
    vowels: {
      standard: ['a','e','i','o','u'],
      minimal: ['a','i','u'],
      extended: ['a','e','i','o','u','y','ø','æ']
    },
    consonants: {
      balanced: ['p','t','k','b','d','g','m','n','s','r','l','f','v'],
      guttural: ['k','q','x','g','r','kh','gh','t','d'],
      sibilant: ['s','z','sh','zh','f','v','r','l','th'],
      soft: ['m','n','l','r','w','j','v','dh']
    }
  };

  const STRUCTURES = {
    standard: ['CV','CVC','CVV','VC'],
    musical: ['CV','V','CVV','CVC'],
    guttural: ['CVC','CCVC','CVCC'],
    soft: ['CV','CVV','CVC','V']
  };

  let vocabulary = [];
  let generated = null;

  const $ = id => document.getElementById(id);
  const arr = value => Array.isArray(value)
    ? value.filter(Boolean).map(String)
    : (value == null || value === '' ? [] : [String(value)]);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const unique = values => [...new Set(values)];
  const choice = (values, rng) => values[Math.floor(rng() * values.length)];

  function hashSeed(seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rngFactory(seed) {
    let x = hashSeed(seed) || 1;
    return () => {
      x += 0x6D2B79F5;
      let t = x;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function selected(id) {
    const element = $(id);
    return element ? [...element.selectedOptions].map(o => o.value) : [];
  }

  function setSelected(id, values) {
    const element = $(id);
    if (!element) return;
    const wanted = new Set(values);
    [...element.options].forEach(option => {
      option.selected = wanted.has(option.value);
    });
  }

  function valuesForField(field) {
    return unique(vocabulary.flatMap(entry => arr(entry[field]))).sort((a,b) => a.localeCompare(b));
  }

  function populateFilters() {
    ['region','culture','biome','temporal_setting','tags'].forEach(field => {
      const element = $(field);
      if (!element) return;
      element.innerHTML = '';
      valuesForField(field).forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        element.appendChild(option);
      });
    });
  }

  function config() {
    return {
      region: selected('region'),
      culture: selected('culture'),
      biome: selected('biome'),
      temporal_setting: selected('temporal_setting'),
      tags: selected('tags'),
      vowels: $('vowels').value,
      consonants: $('consonants').value,
      mean: Math.max(1, Math.min(5, Number($('mean').value) || 2.2)),
      seed: $('seed').value.trim() || String(Date.now()),
      order: $('word-order').value,
      morphology: $('morphology').value,
      adjectivePosition: $('adj-position').value,
      articles: $('articles').value,
      plural: $('plural').value,
      relations: $('relations').value
    };
  }

  /* A selected array value means membership. An entry with several values
     therefore matches if at least one of its values matches the selection. */
  function overlap(entry, field, wanted) {
    if (!wanted.length) return 0;
    return arr(entry[field]).some(value => wanted.includes(value)) ? 1 : 0;
  }

  function semanticScore(entry, c) {
    let score = entry.scope === 'universal' ? 1 : 0;
    for (const field of ['region','culture','biome','temporal_setting','tags']) {
      if (!c[field].length) continue;
      if (overlap(entry, field, c[field])) {
        score += field === 'tags' ? 1.25 : 2;
      } else {
        score -= 0.15;
      }
    }
    return score;
  }

  function classify(entry) {
    const type = String(entry.word_type || '').toLowerCase();
    const category = String(entry.category || '').toLowerCase();
    const concept = String(entry.concept || '');

    if (type === 'verb' || /^to\s+/i.test(concept)) return 'verb';
    if (type === 'adjective' || category.includes('adjective')) return 'adjective';
    if (type === 'pronoun' || category.includes('pronoun')) return 'pronoun';
    if (type === 'preposition' || category.includes('preposition')) return 'function';
    if (category.includes('number') || category.includes('quantity')) return 'number';
    return 'noun';
  }

  function englishForm(entry) {
    const concept = String(entry.concept || '');
    return concept.replace(/^to\s+/i, '');
  }

  function makeWordFactory(c, salt = '') {
    const vowels = PHONETICS.vowels[c.vowels] || PHONETICS.vowels.standard;
    const consonants = PHONETICS.consonants[c.consonants] || PHONETICS.consonants.balanced;
    const style = c.consonants === 'guttural'
      ? 'guttural'
      : c.consonants === 'soft'
        ? 'soft'
        : c.vowels === 'extended' ? 'musical' : 'standard';
    const structures = STRUCTURES[style];
    const rng = rngFactory(`${c.seed}|${salt}`);
    const used = new Set();
    const C = () => choice(consonants, rng);
    const V = () => choice(vowels, rng);

    const build = pattern => pattern.replace(/[CV]/g, token => token === 'C' ? C() : V());

    return () => {
      for (let tries = 0; tries < 150; tries++) {
        const syllables = Math.max(1, Math.min(5,
          Math.round(c.mean + (rng() - 0.5) * 1.6)));
        let word = '';
        for (let i = 0; i < syllables; i++) {
          word += build(choice(structures, rng));
        }
        word = word.toLowerCase();
        if (word.length > 1 && !used.has(word)) {
          used.add(word);
          return word;
        }
      }
      return build('CVC') + Math.floor(rng() * 10);
    };
  }

  function generateLexicon(c) {
    const make = makeWordFactory(c, 'lexicon');
    const ranked = vocabulary
      .map(entry => ({ entry, score: semanticScore(entry, c) }))
      .sort((a,b) => b.score - a.score || String(a.entry.concept).localeCompare(String(b.entry.concept)));

    const lexicon = [];
    const usedEntryIds = new Set();
    const usedConceptKinds = new Set();
    const targetSize = Math.min(320, ranked.length);

    for (let i = 0; i < ranked.length && lexicon.length < targetSize; i++) {
      const {entry, score} = ranked[i];
      const concept = String(entry.concept || '').trim();
      if (!concept) continue;
      const kind = classify(entry);
      const entryKey = String(entry.id || `${concept}|${kind}`);
      if (usedEntryIds.has(entryKey)) continue;

      /* Keep genuinely distinct database entries, including legitimate
         homonyms such as school used for different semantic concepts. */
      const conceptKey = `${concept.toLowerCase()}|${kind}`;
      if (usedConceptKinds.has(conceptKey) && !entry.id) continue;

      usedEntryIds.add(entryKey);
      usedConceptKinds.add(conceptKey);
      lexicon.push({
        ...entry,
        english: englishForm(entry),
        kind,
        word: make(),
        score
      });
    }

    return lexicon;
  }

  function findWords(term, kind, lexicon) {
    const normalized = String(term).toLowerCase().replace(/^to\s+/, '');
    return lexicon
      .filter(item => item.english.toLowerCase() === normalized)
      .filter(item => !kind || item.kind === kind)
      .sort((a,b) => b.score - a.score);
  }

  function affix(base, kind, c) {
    if (c.morphology === 'isolating') return base;
    if (c.morphology === 'fusional') return kind === 'verb' ? `${base}a` : `${base}i`;
    return kind === 'verb' ? `${base}-ta` : base;
  }

  function renderNoun(entry, c) {
    if (!entry) return '—';
    return entry.word;
  }

  function renderVerb(entry, c) {
    return entry ? affix(entry.word, 'verb', c) : '—';
  }

  function buildSentence(subject, verb, object, c) {
    const forms = {
      S: renderNoun(subject, c),
      V: renderVerb(verb, c),
      O: renderNoun(object, c)
    };
    return c.order.split('').map(part => forms[part]).join(' ');
  }

  function buildSamples(c, lexicon) {
    const templates = [
      ['person','to see','sun','The person sees the sun.'],
      ['hunter','to find','prey','The hunter finds prey.'],
      ['musician','to sing','song','The musician sings a song.'],
      ['teacher','to teach','student','The teacher teaches the student.'],
      ['farmer','to grow','crop','The farmer grows a crop.'],
      ['fisherman','to catch','fish','The fisherman catches fish.'],
      ['child','to eat','food','The child eats food.'],
      ['you','to love','music','You love music.'],
      ['person','to live','house','The person lives in the house.'],
      ['you','to have','water','You have water.']
    ];

    return templates.map(([s,v,o,english]) => {
      const subject = findWords(s, null, lexicon)[0];
      const verb = findWords(v, 'verb', lexicon)[0];
      const object = findWords(o, null, lexicon)[0];
      if (!subject || !verb || !object) return null;
      return { conlang: buildSentence(subject, verb, object, c), english };
    }).filter(Boolean);
  }

  function grammar(c) {
    return {
      'Word order': c.order,
      'Morphology': c.morphology === 'agglutinative'
        ? 'Agglutinative'
        : c.morphology === 'fusional' ? 'Fusional' : 'Isolating',
      'Adjectives': c.adjectivePosition === 'before' ? 'Before noun' : 'After noun',
      'Articles': c.articles,
      'Plural': c.plural === 'none' ? 'No productive plural' : c.plural === 'prefix' ? 'Prefix' : 'Suffix',
      'Relations': c.relations === 'cases' ? 'Case endings' : 'Prepositions / word order'
    };
  }

  function languageName(c) {
    const make = makeWordFactory({...c, mean: 2}, 'language-name');
    return `${make().replace(/^./, ch => ch.toUpperCase())}ic`;
  }

  function semanticChips(c) {
    return ['region','culture','biome','temporal_setting','tags']
      .flatMap(field => c[field].map(value => `${field}: ${value}`));
  }

  function renderGeneration(c, lexicon, samples) {
    const grammarData = grammar(c);
    const name = languageName(c);
    const chips = semanticChips(c);
    $('db-status').textContent = `Vocabulary: ${vocabulary.length} entries · Generated lexicon: ${lexicon.length}`;

    $('generation-output').innerHTML = `
      <div class="hero">
        <div>
          <div class="lang-name">${esc(name)}</div>
          <div class="sub">Generated from the current semantic profile and phonological / grammatical parameters.</div>
          <div class="chips">${chips.length ? chips.map(v => `<span class="chip">${esc(v)}</span>`).join('') : '<span class="chip">No semantic restrictions</span>'}</div>
        </div>
        <div class="kv">${Object.entries(grammarData).map(([k,v]) => `<b>${esc(k)}</b><span>${esc(v)}</span>`).join('')}</div>
      </div>
      <div class="grid">
        <div class="card"><h3>Phonology</h3><div class="kv">
          <b>Vowels</b><span>${esc(PHONETICS.vowels[c.vowels].join(' '))}</span>
          <b>Consonants</b><span>${esc(PHONETICS.consonants[c.consonants].join(' '))}</span>
          <b>Mean syllables</b><span>${esc(c.mean)}</span>
        </div></div>
        <div class="card"><h3>Generation</h3><div class="kv">
          <b>Lexicon size</b><span>${lexicon.length}</span>
          <b>Seed</b><span>${esc(c.seed)}</span>
          <b>Relations</b><span>${esc(c.relations)}</span>
        </div></div>
      </div>
      <div class="card" style="margin-top:14px"><h3>Sample sentences</h3>
        ${samples.length ? samples.map(s => `<div class="sentence"><div class="con">${esc(s.conlang)}</div><div class="eng">${esc(s.english)}</div></div>`).join('') : '<div class="empty">Not enough matching vocabulary to build sample sentences.</div>'}
      </div>`;
  }

  function renderLexicon(lexicon) {
    const rows = [...lexicon].sort((a,b) => a.english.localeCompare(b.english));
    $('lexicon-output').innerHTML = `
      <div class="card"><h3>Generated lexicon</h3>
        <div class="sub" style="margin-bottom:10px">${rows.length} generated entries</div>
        <div class="lexicon">${rows.map(item => `
          <div class="lex-row">
            <div class="word">${esc(item.word)}</div>
            <div class="eng">${esc(item.english)}</div>
            <div class="meta">${esc(item.category || '')} · ${esc(item.kind)}</div>
          </div>`).join('')}
        </div>
      </div>`;
  }

  function renderDictionary() {
    if (!generated) {
      $('dictionary-output').innerHTML = '<div class="empty">Generate a language to populate the dictionary.</div>';
      return;
    }

    const direction = $('dictionary-direction').value;
    const query = $('dictionary-search').value.trim().toLowerCase();
    let rows = generated.lexicon.map(item => ({
      left: direction === 'conlang-en' ? item.word : item.english,
      right: direction === 'conlang-en' ? item.english : item.word,
      meta: `${item.category || ''} · ${item.kind}`,
      sort: direction === 'conlang-en' ? item.word : item.english
    }));

    if (query) {
      rows = rows.filter(row => `${row.left} ${row.right} ${row.meta}`.toLowerCase().includes(query));
    }

    rows.sort((a,b) => a.sort.localeCompare(b.sort));
    $('dictionary-output').innerHTML = `
      <div class="card"><h3>${direction === 'conlang-en' ? 'Conlang → English' : 'English → Conlang'}</h3>
        <div class="sub" style="margin-bottom:10px">${rows.length} matching entries</div>
        <div class="dictionary">${rows.length ? rows.map(row => `
          <div class="dict-row"><strong>${esc(row.left)}</strong><span>${esc(row.right)}</span><span class="meta">${esc(row.meta)}</span></div>`).join('') : '<div class="empty">No matching entries.</div>'}</div>
      </div>`;
  }

  function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(button => {
      button.classList.toggle('active', button.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === tabName);
    });
  }

  function generate() {
    if (!vocabulary.length) return;
    const c = config();
    const lexicon = generateLexicon(c);
    const samples = buildSamples(c, lexicon);
    generated = { config: c, lexicon, samples, name: languageName(c) };
    renderGeneration(c, lexicon, samples);
    renderLexicon(lexicon);
    renderDictionary();
  }

  function regenerate() {
    $('seed').value = String(Date.now());
    generate();
  }

  function setPresetValue(id, candidates) {
    const available = new Set([...$(id).options].map(o => o.value));
    setSelected(id, candidates.filter(value => available.has(value)));
  }

  function preset(kind) {
    ['region','culture','biome','temporal_setting','tags'].forEach(id => setSelected(id, []));
    if (kind === 'historical') setPresetValue('temporal_setting', ['ancient','medieval','renaissance']);
    if (kind === 'modern') setPresetValue('temporal_setting', ['modern']);
    if (kind === 'fantasy') {
      setPresetValue('temporal_setting', ['medieval','renaissance']);
      setPresetValue('tags', ['fantasy']);
    }
    if (kind === 'scifi') {
      setPresetValue('region', ['space','alien']);
      setPresetValue('temporal_setting', ['modern','futuristic']);
      setPresetValue('tags', ['sci-fi','science_fiction','space']);
    }
    generate();
  }

  async function loadVocabulary() {
    try {
      const response = await fetch('vocabulary.json', {cache:'no-store'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      vocabulary = Array.isArray(data)
        ? data
        : Array.isArray(data.vocabulary) ? data.vocabulary : [];
      if (!vocabulary.length) throw new Error('No vocabulary entries found.');
      populateFilters();
      $('db-status').textContent = `Vocabulary: ${vocabulary.length} entries`;
    } catch (error) {
      $('db-status').textContent = 'Vocabulary load failed';
      $('message').innerHTML = `<div class="error">Unable to load vocabulary.json: ${esc(error.message)}</div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('.tab').forEach(button => {
      button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    $('generate').addEventListener('click', () => {
      generate();
      switchTab('generator');
    });
    $('regenerate').addEventListener('click', () => {
      regenerate();
      switchTab('lexicon');
    });
    $('clear-filters').addEventListener('click', () => {
      ['region','culture','biome','temporal_setting','tags'].forEach(id => setSelected(id, []));
      generate();
    });
    $('preset-historical').addEventListener('click', () => preset('historical'));
    $('preset-fantasy').addEventListener('click', () => preset('fantasy'));
    $('preset-modern').addEventListener('click', () => preset('modern'));
    $('preset-scifi').addEventListener('click', () => preset('scifi'));
    $('dictionary-direction').addEventListener('change', renderDictionary);
    $('dictionary-search').addEventListener('input', renderDictionary);

    await loadVocabulary();
  });
})();
