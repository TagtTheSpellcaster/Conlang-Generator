/* ConLang Generator — stable loader v0.7.16 */
(() => {
  'use strict';
  const VERSION = '0.7.16';

  // Keep the proven legacy generator as the only runtime engine for now.
  // The experimental sample-sentence repair layer is deliberately not loaded:
  // it was the change that destabilized generation in v0.7.15.
  document.write('<script src="conlang_engine_legacy.js?v=' + VERSION + '"><\\/script>');

  const showVersion = () => {
    const h1 = document.querySelector('header h1');
    if (!h1 || h1.querySelector('.version-badge')) return;
    const badge = document.createElement('span');
    badge.className = 'chip version-badge';
    badge.textContent = 'v' + VERSION;
    badge.style.marginLeft = '8px';
    badge.style.verticalAlign = 'middle';
    h1.appendChild(badge);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showVersion, { once: true });
  } else {
    showVersion();
  }
})();
