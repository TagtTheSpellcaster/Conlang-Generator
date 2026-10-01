/* ConLang Generator loader v0.7.9 */
(() => {
  'use strict';

  const VERSION = '0.7.9';
  const $ = id => document.getElementById(id);
  const status = text => {
    const el = $('db-status');
    if (el) el.textContent = text;
  };
  const message = text => {
    const el = $('message');
    if (el) el.textContent = text;
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  function addVersionBadge() {
    const heading = document.querySelector('h1');
    if (!heading) return;
    let badge = heading.querySelector('.version-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'version-badge';
      badge.style.cssText = [
        'display:inline-block', 'margin-left:8px', 'padding:2px 8px',
        'border-radius:999px', 'background:#18243a', 'border:1px solid #2a3b59',
        'color:#a9c4e8', 'font-size:11px', 'vertical-align:middle'
      ].join(';');
      heading.appendChild(badge);
    }
    badge.textContent = `v${VERSION}`;
  }

  function installStyles() {
    if ($('conlang-runtime-styles')) return;
    const style = document.createElement('style');
    style.id = 'conlang-runtime-styles';
    style.textContent = `
      .sample-list{display:grid;gap:10px;margin-top:16px}
      .sample-sentence-pill{background:#11182a;border:1px solid #26324a;border-radius:12px;padding:10px 13px}
      .sample-english{color:#a9b7ca;font-size:13px}
      .sample-conlang{font-weight:700;margin-top:4px}
      .sample-number{display:inline-block;min-width:28px;color:#8fa0ba;font-weight:700}
      .sample-word{cursor:help}
      .sample-placeholder{font-style:italic;font-weight:700}
    `;
    document.head.appendChild(style);
  }

  function ensureSampleContainer() {
    let container = $('sample-sentences');
    if (container) return container;
    const output = $('generation-output');
    if (!output) return null;
    container = document.createElement('div');
    container.id = 'sample-sentences';
    container.className = 'sample-list';
    output.insertAdjacentElement('afterend', container);
    return container;
  }

  function renderGenerated(detail) {
    const lexicon = detail?.lexicon || [];
    const config = detail?.config;
    const output = $('generation-output');
    const lexiconOutput = $('lexicon-output');
    const dictionaryOutput = $('dictionary-output');

    if (output) {
      output.className = 'result';
      output.innerHTML = `
        <div class="hero">
          <div>
            <div class="lang-name">Generated Language</div>
            <div class="sub">${lexicon.length} vocabulary entries</div>
          </div>
          <div class="chips">
            <span class="chip">${esc(config?.order || '')}</span>
            <span class="chip">${esc(config?.morphology || '')}</span>
            <span class="chip">${esc(config?.vowels || '')}</span>
            <span class="chip">${esc(config?.consonants || '')}</span>
          </div>
        </div>`;
    }

    if (lexiconOutput) {
      const rows = lexicon.slice().sort((a, b) => String(a.concept ?? '').localeCompare(String(b.concept ?? '')));
      lexiconOutput.className = '';
      lexiconOutput.innerHTML = `<div class="card"><h3>Generated lexicon</h3><div class="sub" style="margin-bottom:10px">${rows.length} entries</div><div class="lexicon">${rows.map(x => `
        <div class="lex-row"><div class="word">${esc(x.conlang)}</div><div class="eng">${esc(x.concept)}</div><div class="meta">${esc(x.category || x.word_type || '')}</div></div>`).join('')}</div></div>`;
    }

    if (dictionaryOutput) {
      renderDictionary(lexicon);
    }

    installStyles();
    const container = ensureSampleContainer();
    if (!container || !window.ConLangEngine?.samples || !config) return;

    const sentences = window.ConLangEngine.samples(config, lexicon);
    container.innerHTML = sentences.map(sentence => {
      const conlang = window.ConLangEngine.sentenceHtml(sentence, config);
      return `<div class="sample-sentence-pill">
        <div class="sample-english"><span class="sample-number">${sentence.number}.</span>${esc(sentence.english)}</div>
        <div class="sample-conlang"><span class="sample-number">${sentence.number}.</span>${conlang}</div>
      </div>`;
    }).join('');

    message(`Generated ${lexicon.length} entries and 50 sample sentences.`);
  }

  function renderDictionary(lexicon) {
    const output = $('dictionary-output');
    if (!output) return;
    const direction = $('dictionary-direction')?.value || 'conlang-en';
    const query = ($('dictionary-search')?.value || '').trim().toLowerCase();
    let rows = lexicon.map(entry => ({
      left: direction === 'conlang-en' ? entry.conlang : entry.concept,
      right: direction === 'conlang-en' ? entry.concept : entry.conlang,
      meta: entry.category || entry.word_type || ''
    }));
    if (query) rows = rows.filter(row => `${row.left} ${row.right} ${row.meta}`.toLowerCase().includes(query));
    rows.sort((a, b) => String(a.left).localeCompare(String(b.left)));
    output.className = '';
    output.innerHTML = `<div class="card"><h3>${direction === 'conlang-en' ? 'Conlang → English' : 'English → Conlang'}</h3><div class="sub" style="margin-bottom:10px">${rows.length} matching entries</div><div class="dictionary">${rows.length ? rows.map(row => `<div class="dict-row"><strong>${esc(row.left)}</strong><span>${esc(row.right)}</span><span class="meta">${esc(row.meta)}</span></div>`).join('') : '<div class="empty">No matching entries.</div>'}</div></div>`;
  }

  function attachControls() {
    const engine = window.ConLangEngine;
    if (!engine) throw new Error('ConLangEngine did not initialize.');

    const generate = async () => {
      try {
        await engine.loadVocabulary();
        engine.generate();
      } catch (error) {
        console.error(error);
        message(`Generation error: ${error.message}`);
        status(`Vocabulary load error: ${error.message}`);
      }
    };

    $('generate')?.addEventListener('click', generate);
    $('regenerate')?.addEventListener('click', generate);

    $('dictionary-direction')?.addEventListener('change', () => {
      renderDictionary(engine.getGeneratedVocabulary());
    });
    $('dictionary-search')?.addEventListener('input', () => {
      renderDictionary(engine.getGeneratedVocabulary());
    });

    window.addEventListener('conlang:generated', event => renderGenerated(event.detail));
  }

  // Normalize the real database shape for the legacy engine. The database is
  // an object containing a vocabulary array; the legacy engine expects the array.
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
      headers: { 'Content-Type': 'application/json' }
    });
  };

  addVersionBadge();

  function startLegacy() {
    if (window.__conlangLegacyStarted) return;
    window.__conlangLegacyStarted = true;

    const legacy = document.createElement('script');
    legacy.src = `conlang_engine_legacy.js?v=${VERSION}`;

    legacy.onload = async () => {
      try {
        addVersionBadge();
        attachControls();
        status('Loading vocabulary…');
        await window.ConLangEngine.loadVocabulary();
        status('Vocabulary loaded.');
      } catch (error) {
        console.error('ConLang Generator initialization error:', error);
        status(`Vocabulary load error: ${error.message}`);
        message(`Engine error: ${error.message}`);
      }
    };

    legacy.onerror = () => {
      status('Engine load error.');
      message('Engine failed to load.');
    };

    document.head.appendChild(legacy);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLegacy, { once: true });
  } else {
    startLegacy();
  }
})();