/* ConLang Generator loader v0.7.11 */
(() => {
  'use strict';

  const VERSION = '0.7.11';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').toLowerCase().trim().replace(/^to\s+/, '').replace(/[-\s]+/g, '_');
  const arr = v => Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status = t => { if ($('db-status')) $('db-status').textContent = t; };
  const msg = t => { if ($('message')) $('message').textContent = t; };

  /* These are actual grammatical lexemes. They must be translated.
     Semantic sample placeholders are deliberately NOT included here. */
  const GRAMMAR_CONCEPTS = new Set([
    'be','have','i','you','we','they','me','my','this','that',
    'who','what','where','when','why','how','many','nothing','all',
    'not','can','to','from','with','in','the','here','there',
    'today','tomorrow','yesterday'
  ]);

  const SEMANTIC = {
    'consumption verb':['consumption'],
    'perception verb':['perception'],
    'violence/hunting verb':['violence','hunting'],
    'generic action verb':['activity','action'],
    'positive emotion verb':['emotion_positive','positive_emotion'],
    'negative emotion verb':['emotion_negative','negative_emotion'],
    'movement verb':['movement'],
    'natural movement verb':['natural_movement','movement'],
    'gravity movement verb':['gravity'],
    'air/water movement verb':['air_water_movement','air','water'],
    'ground movement verb':['ground_movement','ground'],
    'stop imperative verb':['stasis'],
    'movement imperative verb':['movement'],
    'future movement verb':['movement'],
    'action verb':['activity','action'],
    'will verb':['volition'],
    'limited action verb':['activity','action'],
    'cognition verb':['cognition'],
    'help action verb':['help'],
    'forbidden action verb':['prohibition'],
    'pain verb':['pain'],
    'rest verb':['rest'],
    'negative existence verb':['existence'],
    'present activity verb':['activity','action'],
    'future activity verb':['activity','action'],
    'past event verb':['event','change','activity'],
    'process verb':['process'],
    'name/role':['person','occupation','profession','role'],
    'relationship/friendship':['relationship'],
    'near object':['inanimate_object'],
    'distant object':['inanimate_object'],
    'near place adverb':['place','location'],
    'distant place adverb':['place','location'],
    'fundamental resource':['fundamental_resource','resource','vital_resource'],
    'natural element':['natural_element'],
    'physical adjective 1':['physical'],
    'physical adjective 2':['physical'],
    'living being 1':['living_being','animal','person'],
    'living being 2':['living_being','animal','person'],
    'food resource':['food','resource'],
    'liquid':['liquid'],
    'living being':['living_being','animal','person'],
    'threat':['threat'],
    'geographical place':['geographical_feature','geographical_place','place','settlement'],
    'cosmic element':['cosmic'],
    'inanimate object':['inanimate_object'],
    'animal':['animal'],
    'vertical direction':['direction','vertical'],
    'natural zone':['natural_zone'],
    'organ/body part':['body_part','organ'],
    'path/road':['path','road'],
    'physical need/state':['need','bodily_function'],
    'large quantity':['large','quantity'],
    'small quantity':['small','quantity'],
    'readiness state':['readiness'],
    'vital resource':['vital_resource'],
    'plural entities':['entity'],
    'entity':['entity']
  };

  function values(e) {
    return ['semantic_group','category','tags','features']
      .flatMap(f => arr(e?.[f])
        .flatMap(x => String(x).split(/[;,]/))
        .map(norm)
        .filter(Boolean));
  }

  function findSemantic(lex, label) {
    const groups = SEMANTIC[label] || [];
    if (!groups.length) return null;
    return lex.find(e => {
      const kind = norm(e.kind || e.word_type);
      if (label.includes('verb') && kind && kind !== 'verb') return false;
      if (label.includes('adjective') && kind && kind !== 'adjective') return false;
      return groups.some(g => values(e).some(v => v === norm(g) || v.includes(norm(g)) || norm(g).includes(v)));
    }) || null;
  }

  function findGrammar(lex, concept) {
    const wanted = norm(concept);
    return lex.find(e => norm(e.concept) === wanted) || null;
  }

  function repairToken(item, lex) {
    if (!item?.placeholder) return item;

    const label = String(item.text || '').replace(/^<|>$/g, '').trim().toLowerCase();

    /* A <name/role>, <near object>, etc. is a deliberate semantic
       placeholder and must remain visible in the generated sentence. */
    if (!GRAMMAR_CONCEPTS.has(label)) {
      return item;
    }

    const entry = findGrammar(lex, label);
    if (!entry?.conlang) return item;
    return { word: entry.conlang, english: entry.concept || label };
  }

  function repairValue(value, lex) {
    if (Array.isArray(value)) return value.map(v => repairValue(v, lex));
    return repairToken(value, lex);
  }

  function addVersion() {
    const h = document.querySelector('h1');
    if (!h) return;
    let badge = h.querySelector('.version-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'version-badge';
      badge.style.cssText = 'display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;background:#18243a;border:1px solid #2a3b59;color:#a9c4e8;font-size:11px;vertical-align:middle';
      h.appendChild(badge);
    }
    badge.textContent = `v${VERSION}`;
  }

  function installTooltip() {
    if ($('conlang-tooltip')) return;
    const style = document.createElement('style');
    style.id = 'conlang-tooltip-style';
    style.textContent = `
      .sample-word { position:relative; cursor:help; border-bottom:1px dotted currentColor; }
      #conlang-tooltip { position:fixed; z-index:99999; display:none; pointer-events:none; padding:5px 8px; border-radius:6px; background:#050914; color:#fff; border:1px solid #42506a; box-shadow:0 4px 14px rgba(0,0,0,.35); font-size:12px; font-weight:400; white-space:nowrap; }
    `;
    document.head.appendChild(style);
    const tip = document.createElement('div');
    tip.id = 'conlang-tooltip';
    document.body.appendChild(tip);
    document.addEventListener('mouseover', e => {
      const word = e.target.closest('.sample-word');
      if (!word) return;
      const meaning = word.dataset.meaning || word.getAttribute('title') || '';
      if (!meaning) return;
      tip.textContent = meaning;
      tip.style.display = 'block';
      const r = word.getBoundingClientRect();
      tip.style.left = `${Math.max(6, Math.min(window.innerWidth - tip.offsetWidth - 6, r.left))}px`;
      tip.style.top = `${Math.max(6, r.top - tip.offsetHeight - 6)}px`;
      word.dataset.savedTitle = word.getAttribute('title') || '';
      word.removeAttribute('title');
    });
    document.addEventListener('mouseout', e => {
      const word = e.target.closest('.sample-word');
      if (!word) return;
      tip.style.display = 'none';
      if (word.dataset.savedTitle) word.setAttribute('title', word.dataset.savedTitle);
    });
  }

  function nativeFetchShim() {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const response = await nativeFetch(input, init);
      const url = typeof input === 'string' ? input : input?.url || '';
      if (!url.includes('vocabulary.json')) return response;
      const data = await response.clone().json();
      const list = Array.isArray(data) ? data : data?.vocabulary;
      if (!Array.isArray(list)) throw new Error('vocabulary.json does not contain a vocabulary array.');
      return new Response(JSON.stringify(list), {
        status: response.status,
        statusText: response.statusText,
        headers: {'Content-Type':'application/json'}
      });
    };
  }

  function renderDictionary(lex) {
    const o = $('dictionary-output');
    if (!o) return;
    const dir = $('dictionary-direction')?.value || 'conlang-en';
    const q = ($('dictionary-search')?.value || '').trim().toLowerCase();
    let rows = lex.map(e => ({
      l: dir === 'conlang-en' ? e.conlang : e.concept,
      r: dir === 'conlang-en' ? e.concept : e.conlang,
      m: e.category || e.word_type || ''
    }));
    if (q) rows = rows.filter(x => `${x.l} ${x.r} ${x.m}`.toLowerCase().includes(q));
    rows.sort((a,b) => String(a.l).localeCompare(String(b.l)));
    o.innerHTML = `<div class="card"><h3>${dir === 'conlang-en' ? 'Conlang → English' : 'English → Conlang'}</h3><div class="dictionary">${rows.map(x => `<div class="dict-row"><strong>${esc(x.l)}</strong><span>${esc(x.r)}</span><span class="meta">${esc(x.m)}</span></div>`).join('')}</div></div>`;
  }

  function render(detail, engine) {
    const lex = detail?.lexicon || [];
    const config = detail?.config;
    if ($('lexicon-output')) {
      $('lexicon-output').innerHTML = `<div class="card"><h3>Generated lexicon</h3><div class="lexicon">${lex.map(x => `<div class="lex-row"><div class="word">${esc(x.conlang)}</div><div class="eng">${esc(x.concept)}</div><div class="meta">${esc(x.category || x.word_type || '')}</div></div>`).join('')}</div></div>`;
    }
    renderDictionary(lex);
    if (!config) return;

    const sentences = engine.samples(config, lex).map(s => ({
      ...s,
      S: repairValue(s.S, lex),
      V: repairValue(s.V, lex),
      O: repairValue(s.O, lex),
      extra: repairValue(s.extra || [], lex)
    }));

    let box = $('sample-sentences');
    if (!box) {
      box = document.createElement('div');
      box.id = 'sample-sentences';
      box.className = 'sample-list';
      ($('generation-output') || document.querySelector('#generator main'))?.appendChild(box);
    }
    installTooltip();
    box.innerHTML = sentences.map(s => {
      const conlang = engine.sentenceHtml(s, config);
      return `<div class="sample-sentence-pill"><div class="sample-english"><span class="sample-number">${s.number}.</span>${esc(s.english)}</div><div class="sample-conlang"><span class="sample-number">${s.number}.</span>${conlang}</div></div>`;
    }).join('');
    msg(`Generated ${lex.length} entries and 50 sample sentences.`);
  }

  function start() {
    nativeFetchShim();
    const legacy = document.createElement('script');
    legacy.src = `conlang_engine_legacy.js?v=${VERSION}`;
    legacy.onload = async () => {
      try {
        const engine = window.ConLangEngine;
        if (!engine) throw new Error('ConLangEngine did not initialize.');

        addVersion();
        installTooltip();

        const originalSamples = engine.samples;
        engine.samples = (config, lex) => originalSamples(config, lex);

        $('generate')?.addEventListener('click', () => {
          try { engine.generate(); }
          catch (e) { console.error(e); msg(`Generation error: ${e.message}`); }
        });
        $('regenerate')?.addEventListener('click', () => {
          try { engine.generate(); }
          catch (e) { console.error(e); msg(`Generation error: ${e.message}`); }
        });
        $('randomize')?.addEventListener('click', () => engine.randomize());

        window.addEventListener('conlang:generated', e => render(e.detail, engine));
        $('dictionary-direction')?.addEventListener('change', () => renderDictionary(engine.getGeneratedVocabulary()));
        $('dictionary-search')?.addEventListener('input', () => renderDictionary(engine.getGeneratedVocabulary()));

        status('Loading vocabulary…');
        await engine.loadVocabulary();
        status(`Vocabulary loaded: ${engine.getGeneratedVocabulary().length || 'database'} ready`);
      } catch (e) {
        console.error(e);
        status(`Vocabulary load error: ${e.message}`);
        msg(`Engine error: ${e.message}`);
      }
    };
    legacy.onerror = () => {
      status('Engine load error.');
      msg('Engine failed to load.');
    };
    document.head.appendChild(legacy);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();