/* ConLang Generator — loader v0.7.14 */
(() => {
  'use strict';
  const VERSION = '0.7.14';

  // Load the stable engine synchronously while the document is still parsing,
  // so its DOMContentLoaded initialization remains reliable.
  document.write('<script src="conlang_engine_legacy.js?v=' + VERSION + '"><\/script>');
  document.write('<script src="sample_sentence_fix.js?v=' + VERSION + '"><\/script>');

  // Keep the visible application version synchronized even if index.html
  // contains an older static badge.
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.version-badge, [data-version]').forEach(el => {
      el.textContent = 'v' + VERSION;
    });
  });
})();
