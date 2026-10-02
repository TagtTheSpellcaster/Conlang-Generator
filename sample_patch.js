/* ConLang Generator UI patch — v0.11.6 */
(() => {
    'use strict';

    const VERSION = '0.11.6';
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
            #sample-sentences-output .sample-frame { margin-top: 0; }
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

    function installSampleSentencesTab() {
        if ($('sample-sentences')) return;
        const tabs = document.querySelector('.tabs');
        const dictionaryTab = document.querySelector('.tab[data-tab="dictionary"]');
        if (!tabs || !dictionaryTab) return;

        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'tab';
        tab.dataset.tab = 'sample-sentences';
        tab.setAttribute('aria-selected', 'false');
        tab.textContent = 'Sample Sentences';
        tabs.insertBefore(tab, dictionaryTab.nextSibling);

        const panel = document.createElement('section');
        panel.id = 'sample-sentences';
        panel.className = 'tab-panel';
        panel.innerHTML = '<main><div id="sample-sentences-output" class="empty">Generate a language to populate the sample sentences.</div></main>';
        const dictionaryPanel = $('dictionary');
        if (dictionaryPanel?.parentNode) dictionaryPanel.parentNode.insertBefore(panel, dictionaryPanel.nextSibling);

        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            panel.classList.add('active');
        });
    }

    function moveSampleSentences() {
        installSampleSentencesTab();
        const source = $('generation-output');
        const target = $('sample-sentences-output');
        if (!source || !target) return;
        const frame = source.querySelector('.sample-frame');
        if (!frame) return;
        target.className = '';
        target.replaceChildren(frame);
    }

    function init() {
        styles();
        installCopyButton();
        installVersionPill();
        installSampleSentencesTab();
        document.addEventListener('conlang:generated', moveSampleSentences);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();