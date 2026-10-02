/* ConLang Generator UI patch — v0.11.2 */
(() => {
    'use strict';

    const VERSION = window.CONLANG_GENERATOR_VERSION || '0.11.2';
    const $ = id => document.getElementById(id);
    const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function styles() {
        if ($('ui-patch-v092')) return;
        const s = document.createElement('style'); s.id = 'ui-patch-v092'; s.textContent = `
            .base-parameters { margin-top: 16px; }
            .base-parameters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
            .base-parameters .param-group { background: var(--panel2); border: 1px solid var(--line); border-radius: 8px; padding: 11px; }
            .base-parameters .param-title { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--accent); margin-bottom: 7px; }
            .base-parameters .param-value { color: var(--text); line-height: 1.5; }
            .compact-grid { align-items: start; }
            .compact-grid > .field { margin-top: 0; }
            .phonotactic-info { grid-column: 1 / -1; }
            .header-tools #copy-vocabulary { white-space: nowrap; }
            #mean[type="range"] { width: 100%; height: 24px; padding: 0; background: transparent; border: 0; outline: none; appearance: none; -webkit-appearance: none; accent-color: transparent; }
            #mean[type="range"]::-webkit-slider-runnable-track { height: 1px; background: var(--muted); }
            #mean[type="range"]::-moz-range-track { height: 1px; background: var(--muted); }
            #mean[type="range"]::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 14px; height: 14px; margin-top: -6px; border-radius: 50%; border: 1px solid var(--accent); background: var(--panel); cursor: pointer; }
            #mean[type="range"]::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; border: 1px solid var(--accent); background: var(--panel); cursor: pointer; }
            #app-version { white-space: nowrap; }
        `;
        document.head.appendChild(s);
    }

    function installCopyButton() {
        const exportButton = $('export-vocabulary');
        const existing = $('copy-vocabulary');
        if (existing || !exportButton) return;
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'btn'; button.id = 'copy-vocabulary'; button.textContent = 'Copy to Clipboard';
        exportButton.insertAdjacentElement('beforebegin', button);
        button.addEventListener('click', async () => {
            const rows = [...document.querySelectorAll('#lexicon-output .lex-row')];
            const entries = rows.map(row => { const cells = row.children; return { word: cells[0]?.textContent.trim() || '', english: cells[1]?.textContent.trim() || '', meta: cells[2]?.textContent.trim() || '' }; }).filter(entry => entry.word && entry.english);
            if (!entries.length) { const message = $('message'); if (message) message.textContent = 'Generate a language before copying its vocabulary.'; return; }
            const text = entries.map(entry => [entry.word, entry.english, entry.meta].filter(Boolean).join('\t')).join('\n');
            try { await navigator.clipboard.writeText(text); } catch { const area = document.createElement('textarea'); area.value = text; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0'; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove(); }
            const message = $('message'); if (message) message.textContent = `Copied ${entries.length} vocabulary entries to the clipboard.`;
            button.textContent = 'Copied'; setTimeout(() => { button.textContent = 'Copy to Clipboard'; }, 1200);
        });
    }

    function installModelDescription() {
        const model = $('consonants');
        if (!model || $('phonotactic-info')) return;
        document.querySelectorAll('.compact-grid > .phonotactic-info').forEach(el => el.remove());
        const info = document.createElement('div'); info.id = 'phonotactic-info'; info.className = 'phonotactic-info';
        const update = () => {
            const descriptions = {
                isolated: ['Minimalist Isolating (Hawaiian-type)', 'The pattern categorically excludes consonant clusters and compresses the syllable to a minimum.', '(C)V'],
                japanese: ['Controlled Open Syllable (Japanese-type)', 'Allows minimal onset clusters and only a nasal coda for clean internal transitions.', '(C)(G)V(N)'],
                european: ['Balanced European (Italian / Finnish-type)', 'Balances open and closed syllables while keeping consonant and vowel density moderate.', '(S)(C)(L/G)V(L/N/S)'],
                english: ['Dynamic Anglo-Saxon (English-type)', 'Allows broad consonant clusters in both onset and coda, with strong vowel compression.', '(S)(C)(L/G)V(L/N)(C)(S)'],
                slavic: ['Compact Slavic (Croatian / Polish-type)', 'Allows dense consonant structures and permits liquids to function as syllabic nuclei.', '(C)(C)(C)(V/L)(C)(C)(C)'],
                semitic: ['Semitic Root-and-Pattern (Arabic-type)', 'Uses a rigid alternation that prevents excessive accumulation of consonants or vowels.', 'CV(C)']
            };
            const d = descriptions[model.value] || descriptions.european;
            info.innerHTML = `<strong>Model: ${esc(d[0])}</strong><br>${esc(d[1])}<br><strong>Formal pattern:</strong> <code>${esc(d[2])}</code>`;
        };
        model.closest('.compact-grid')?.appendChild(info); model.addEventListener('change', update); update();
    }

    function installSynthesisIndex() {
        const mean = $('mean'); const seed = $('seed');
        if (!mean || !seed || $('synthesis-index')) return;
        const info = document.createElement('div'); info.id = 'synthesis-index'; info.className = 'phonotactic-info';
        const update = () => { const value = Number(mean.value) || 2.2; const label = value <= 1.5 ? 'short' : value >= 3.5 ? 'long' : value < 2.2 ? 'short-balanced' : value <= 2.8 ? 'balanced' : 'balanced-long'; info.innerHTML = `<strong>Synthesis index:</strong> ${label}`; };
        seed.closest('.compact-grid')?.appendChild(info); mean.addEventListener('input', update); mean.addEventListener('change', update); update();
    }

    function installVersionPill() {
        let pill = $('app-version');
        if (!pill) {
            pill = document.createElement('span');
            pill.id = 'app-version';
            pill.className = 'chip';
            pill.textContent = `v${VERSION}`;
            const titleRow = document.querySelector('.title-row');
            if (titleRow) titleRow.appendChild(pill);
            else return;
        } else {
            pill.textContent = `v${VERSION}`;
        }
    }

    function init() {
        styles(); installCopyButton(); installModelDescription(); installSynthesisIndex(); installVersionPill();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();