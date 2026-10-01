/* ConLang Generator loader v0.7.12 */
(() => {
  'use strict';

  const VERSION = '0.7.12';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v ?? '').toLowerCase().trim().replace(/^to\s+/, '').replace(/[-\s]+/g, '_');

  const GRAMMAR = new Set([
    'i','you','we','they','me','my','this','that','here','there','today','tomorrow','yesterday',
    'who','what','where','when','why','how','many','all','nothing','not','can','have','be',
    'to','from','with','in','the'
  ]);

  function status(text) { if ($('db-status')) $('db-status').textContent = text; }
  function message(text) { if ($('message')) $('message').textContent = text; }

  function addVersion() {
    const h = document.querySelector('h1');
    if (!h) return;
    let b = h.querySelector('.version-badge');
    if (!b) {
      b = document.createElement('span');
      b.className = 'version-badge';
      b.style.cssText = 'display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;background:#18243a;border:1px solid #2a3b59;color:#a9c4e8;font-size:11px;vertical-align:middle';
      h.appendChild(b);
    }
    b.textContent = `v${VERSION}`;
  }

  function installStyles() {
    if ($('conlang-loader-style')) return;
    const s = document.createElement('style');
    s.id = 'conlang-loader-style';
    s.textContent = `
      #sample-sentences{display:grid;gap:10px;margin-top:16px}
      .sample-sentence-pill{background:#11182a;border:1px solid #26324a;border-radius:10px;padding:11px 14px;box-shadow:0 2px 8px rgba(0,0,0,.16)}
      .sample-english{color:#d9e2ef;margin-bottom:5px}
      .sample-conlang{font-weight:700;color:#fff;line-height:1.7}
      .sample-number{display:inline-block;min-width:28px;color:#8fa0ba;font-weight:400}
      .sample-word{display:inline-block;cursor:help;border-bottom:1px dotted #8fa0ba}
      #conlang-tooltip{position:fixed;z-index:99999;display:none;pointer-events:none;padding:5px 8px;border-radius:6px;background:#050914;color:#fff;border:1px solid #42506a;box-shadow:0 4px 14px rgba(0,0,0,.35);font-size:12px;font-weight:400;white-space:nowrap}
    `;
    document.head.appendChild(s);
    const tip = document.createElement('div');
    tip.id = 'conlang-tooltip';
    document.body.appendChild(tip);
    document.addEventListener('mouseover', e => {
      const w = e.target.closest('.sample-word');
      if (!w) return;
      const meaning = w.dataset.meaning;
      if (!meaning) return;
      tip.textContent = meaning;
      tip.style.display = 'block';
      const r = w.getBoundingClientRect();
      tip.style.left = `${Math.max(6, Math.min(innerWidth - tip.offsetWidth - 6, r.left))}px`;
      tip.style.top = `${Math.max(6, r.top - tip.offsetHeight - 6)}px`;
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest('.sample-word')) tip.style.display = 'none';
    });
  }

  function installFetchShim() {
    if (window.__conlangFetchShim) return;
    window.__conlangFetchShim = true;
    const native = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const response = await native(input, init);
      const url = typeof input === 'string' ? input : input?.url || '';
      if (!url.includes('vocabulary.json')) return response;
      const data = await response.clone().json();
      const list = Array.isArray(data) ? data : data?.vocabulary;
      if (!Array.isArray(list)) throw new Error('Invalid vocabulary.json structure.');
      return new Response(JSON.stringify(list), {status:response.status, statusText:response.statusText, headers:{'Content-Type':'application/json'}});
    };
  }

  function lexiconMap(lexicon) {
    const byConcept = new Map();
    const byWord = new Map();
    for (const e of lexicon || []) {
      const concept = String(e.concept ?? '').trim();
      const word = String(e.conlang ?? '').trim();
      if (!concept || !word) continue;
      byConcept.set(norm(concept), {word, concept});
      byConcept.set(norm(`to ${concept}`), {word, concept});
      byWord.set(word.toLowerCase(), concept);
    }
    return {byConcept, byWord};
  }

  function replaceGrammarPlaceholders(root, maps) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (!node.nodeValue.includes('<')) continue;
      const original = node.nodeValue;
      const replaced = original.replace(/<([^<>]+)>/g, (whole, raw) => {
        const label = raw.trim();
        const key = norm(label);
        if (!GRAMMAR.has(key)) return whole;
        const hit = maps.byConcept.get(key);
        return hit ? hit.word : whole;
      });
      if (replaced !== original) node.nodeValue = replaced;
    }
  }

  function addWordTooltips(root, maps) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (node.parentElement?.closest('.sample-word')) continue;
      const text = node.nodeValue;
      const re = /[A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+(?:[-'][A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+)*/g;
      let last = 0, match, changed = false;
      const frag = document.createDocumentFragment();
      while ((match = re.exec(text))) {
        const word = match[0];
        const meaning = maps.byWord.get(word.toLowerCase());
        if (!meaning) continue;
        changed = true;
        frag.append(document.createTextNode(text.slice(last, match.index)));
        const span = document.createElement('span');
        span.className = 'sample-word';
        span.dataset.meaning = meaning;
        span.textContent = word;
        frag.append(span);
        last = match.index + word.length;
      }
      if (changed) {
        frag.append(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      }
    }
  }

  function renderSamples(engine, config, lexicon) {
    let box = $('sample-sentences');
    if (!box) {
      box = document.createElement('div');
      box.id = 'sample-sentences';
      const out = $('generation-output') || document.querySelector('#generator main');
      out?.appendChild(box);
    }
    const maps = lexiconMap(lexicon);
    let samples;
    try { samples = engine.samples(config, lexicon); }
    catch (e) { message(`Sample sentence error: ${e.message}`); return; }

    box.innerHTML = '';
    for (const sample of samples) {
      const pill = document.createElement('div');
      pill.className = 'sample-sentence-pill';
      const en = document.createElement('div');
      en.className = 'sample-english';
      en.innerHTML = `<span class="sample-number">${esc(sample.number)}.</span>${esc(sample.english)}`;
      const con = document.createElement('div');
      con.className = 'sample-conlang';
      con.innerHTML = `<span class="sample-number">${esc(sample.number)}.</span>${engine.sentenceHtml(sample, config)}`;
      replaceGrammarPlaceholders(con, maps);
      addWordTooltips(con, maps);
      pill.append(en, con);
      box.appendChild(pill);
    }
  }

  function renderLexicon(lexicon) {
    const out = $('lexicon-output');
    if (!out) return;
    out.innerHTML = `<div class="card"><h3>Generated lexicon</h3><div class="lexicon">${lexicon.map(e => `<div class="lex-row"><div class="word">${esc(e.conlang)}</div><div class="eng">${esc(e.concept)}</div><div class="meta">${esc(e.category || e.word_type || '')}</div></div>`).join('')}</div></div>`;
  }

  function renderDictionary(lexicon) {
    const out = $('dictionary-output');
    if (!out) return;
    const direction = $('dictionary-direction')?.value || 'conlang-en';
    const query = ($('dictionary-search')?.value || '').toLowerCase().trim();
    let rows = lexicon.map(e => ({a:direction === 'conlang-en' ? e.conlang : e.concept,b:direction === 'conlang-en' ? e.concept : e.conlang,m:e.category || e.word_type || ''}));
    if (query) rows = rows.filter(r => `${r.a} ${r.b} ${r.m}`.toLowerCase().includes(query));
    rows.sort((a,b) => a.a.localeCompare(b.a));
    out.innerHTML = `<div class="card"><h3>${direction === 'conlang-en' ? 'Conlang → English' : 'English → Conlang'}</h3><div class="dictionary">${rows.map(r => `<div class="dict-row"><strong>${esc(r.a)}</strong><span>${esc(r.b)}</span><span class="meta">${esc(r.m)}</span></div>`).join('')}</div></div>`;
  }

  async function start() {
    addVersion();
    installStyles();
    installFetchShim();
    const script = document.createElement('script');
    script.src = `conlang_engine_legacy.js?v=${VERSION}`;
    script.onload = async () => {
      try {
        const engine = window.ConLangEngine;
        if (!engine) throw new Error('ConLangEngine did not initialize.');
        const onGenerated = e => {
          const detail = e.detail || {};
          const lex = detail.lexicon || engine.getGeneratedVocabulary?.() || [];
          renderLexicon(lex);
          renderDictionary(lex);
          if (detail.config) renderSamples(engine, detail.config, lex);
          message(`Generated ${lex.length} entries and 50 sample sentences.`);
        };
        window.addEventListener('conlang:generated', onGenerated);
        $('generate')?.addEventListener('click', () => { try { engine.generate(); } catch(e) { message(`Generation error: ${e.message}`); console.error(e); } });
        $('regenerate')?.addEventListener('click', () => { try { engine.generate(); } catch(e) { message(`Generation error: ${e.message}`); console.error(e); } });
        $('dictionary-direction')?.addEventListener('change', () => renderDictionary(engine.getGeneratedVocabulary?.() || []));
        $('dictionary-search')?.addEventListener('input', () => renderDictionary(engine.getGeneratedVocabulary?.() || []));
        await engine.loadVocabulary();
        status(`Vocabulary loaded: ${engine.getGeneratedVocabulary?.().length || 0} entries`);
      } catch (e) {
        console.error(e);
        status(`Vocabulary load error: ${e.message}`);
        message(`Engine error: ${e.message}`);
      }
    };
    script.onerror = () => { status('Engine load error.'); message('Engine failed to load.'); };
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();