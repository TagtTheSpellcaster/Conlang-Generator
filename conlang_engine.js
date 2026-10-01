/* ConLang Generator — loader v0.7.15 */
(() => {
  'use strict';
  const VERSION = '0.7.15';

  document.write('<script src="conlang_engine_legacy.js?v=' + VERSION + '"><\\/script>');
  document.write('<script src="sample_sentence_fix.js?v=' + VERSION + '"><\\/script>');

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.version-badge, [data-version]').forEach(el => {
      el.textContent = 'v' + VERSION;
    });
  });
})();
