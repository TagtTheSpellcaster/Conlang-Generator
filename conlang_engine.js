/* ConLang Generator compatibility shell v0.7.7 */
(() => {
  'use strict';

  const VERSION = '0.7.7';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  /* The vocabulary database is currently stored as { vocabulary: [...] }.
     The legacy engine expects the array itself. Normalize only this response. */
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await nativeFetch(input, init);
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!url.includes('vocabulary.json')) return response;

    try {
      const data = await response.clone().json();
      const list = Array.isArray(data) ? data : data?.vocabulary;
      if (!Array.isArray(list)) throw new Error('vocabulary.json does not contain a vocabulary array.');
      const status = $('db-status');
      if (status) status.textContent = `Vocabulary loaded: ${list.length} entries`;
      return new Response(JSON.stringify(list), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    } catch (error) {
      const status = $('db-status');
      if (status) status.textContent = `Vocabulary load error: ${error.message}`;
      throw error;
    }
  };

  function addVersionBadge() {
    const heading = document.querySelector('h1');
    if (!heading || heading.querySelector('.version-badge')) return;
    const badge = document.createElement('span');
    badge.className = 'version-badge';
    badge.textContent = `v${VERSION}`;
    badge.style.cssText = 'display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;background:#18243a;border:1px solid #2a3b59;color:#a9c4e8;font-size:11px;vertical-align:middle;';
    heading.appendChild(badge);
  }

  function renderGenerated(event) {
    const detail = event.detail || {};
    const config = detail.config || {};
    const lexicon = detail.lexicon || [];
    const engine = window.ConLangEngine;
    const generation = $('generation-output');
    const lexiconOutput = $('lexicon-output');
    const dictionaryOutput = $('dictionary-output');

    if (!engine) return;

    const escWord = value => esc(value);
    const meta = entry => [entry.category, entry.kind].filter(Boolean).join(' · ');

    if (generation && engine.samples && engine.sentenceHtml) {
      const sentences = engine.samples(config, lexicon);
      generation.classList.remove('empty');
      generation.innerHTML = `
        <div class="card">
          <h3>Sample Sentences</h3>
          <div class="sample-list">
            ${sentences.map(sentence => `
              <div class="sample-pill">
                <span class="sample-number">${sentence.number}.</span>
                <span class="sample-english">${esc(sentence.english)}</span>
                <span class="sample-arrow">→</span>
                <span class="sample-conlang">${engine.sentenceHtml(sentence, config)}</span>
              </div>
            `).join('')}
          </div>
        </div>`;
    }

    if (lexiconOutput) {
      const rows = [...lexicon].sort((a,b) => String(a.concept || '').localeCompare(String(b.concept || '')));
      lexiconOutput.classList.remove('empty');
      lexiconOutput.innerHTML = `<div class="card"><h3>Generated Lexicon</h3><div class="sub" style="margin-bottom:10px">${rows.length} entries</div><div class="lexicon">${rows.map(entry => `<div class="lex-row"><div class="word">${escWord(entry.conlang)}</div><div class="eng">${escWord(entry.concept)}</div><div class="meta">${esc(meta(entry))}</div></div>`).join('')}</div></div>`;
    }

    if (dictionaryOutput) {
      const rows = [...lexicon].sort((a,b) => String(a.conlang || '').localeCompare(String(b.conlang || '')));
      dictionaryOutput.classList.remove('empty');
      dictionaryOutput.innerHTML = `<div class="card"><h3>Conlang → English</h3><div class="sub" style="margin-bottom:10px">${rows.length} entries</div><div class="dictionary">${rows.map(entry => `<div class="dict-row"><strong>${escWord(entry.conlang)}</strong><span>${escWord(entry.concept)}</span><span class="meta">${esc(meta(entry))}</span></div>`).join('')}</div></div>`;
    }

    const message = $('message');
    if (message) message.textContent = `Generated ${lexicon.length} lexical entries.`;
  }

  function connectControls() {
    const engine = window.ConLangEngine;
    if (!engine) {
      const message = $('message');
      if (message) message.textContent = 'Engine failed to load.';
      return;
    }

    $('generate')?.addEventListener('click', () => {
      try { engine.generate(); }
      catch (error) { console.error(error); if ($('message')) $('message').textContent = `Generation error: ${error.message}`; }
    });

    $('regenerate')?.addEventListener('click', () => {
      try { engine.generate(); }
      catch (error) { console.error(error); if ($('message')) $('message').textContent = `Generation error: ${error.message}`; }
    });

    $('randomize')?.addEventListener('click', () => {
      try { engine.randomize(); }
      catch (error) { console.error(error); if ($('message')) $('message').textContent = `Randomization error: ${error.message}`; }
    });

    window.addEventListener('conlang:generated', renderGenerated);
    if (engine.VERSION !== VERSION) engine.VERSION = VERSION;
  }

  addVersionBadge();

  const legacy = document.createElement('script');
  legacy.src = `conlang_engine_legacy.js?v=${VERSION}`;
  legacy.onload = () => {
    addVersionBadge();
    connectControls();
  };
  legacy.onerror = () => {
    const status = $('db-status');
    if (status) status.textContent = 'Engine load error.';
  };
  document.head.appendChild(legacy);
})();
