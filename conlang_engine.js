/* ConLang Generator loader v0.7.8 */
(() => {
  'use strict';

  const VERSION = '0.7.8';
  const $ = id => document.getElementById(id);

  // The actual generator remains in the last known working engine.
  // This file only loads it and normalizes the current vocabulary.json shape.
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await nativeFetch(input, init);
    const url = typeof input === 'string' ? input : input?.url || '';

    if (!url.includes('vocabulary.json')) return response;

    try {
      const data = await response.clone().json();
      const list = Array.isArray(data) ? data : data?.vocabulary;

      if (!Array.isArray(list)) {
        throw new Error('vocabulary.json does not contain a vocabulary array.');
      }

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
    badge.style.cssText = [
      'display:inline-block',
      'margin-left:8px',
      'padding:2px 8px',
      'border-radius:999px',
      'background:#18243a',
      'border:1px solid #2a3b59',
      'color:#a9c4e8',
      'font-size:11px',
      'vertical-align:middle'
    ].join(';');
    heading.appendChild(badge);
  }

  addVersionBadge();

  const legacy = document.createElement('script');
  legacy.src = `conlang_engine_legacy.js?v=${VERSION}`;

  legacy.onload = () => {
    addVersionBadge();
    const status = $('db-status');
    if (status && status.textContent === 'Loading vocabulary…') {
      status.textContent = 'Vocabulary engine loaded.';
    }
  };

  legacy.onerror = () => {
    const status = $('db-status');
    if (status) status.textContent = 'Engine load error.';
    const message = $('message');
    if (message) message.textContent = 'Engine failed to load.';
  };

  document.head.appendChild(legacy);
})();