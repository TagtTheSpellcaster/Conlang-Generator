/* ConLang Generator UI patch — v0.11.11 */
(() => {
    'use strict';

    const VERSION = '0.11.11';
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
            .morph-example { display: grid; grid-template-columns: 62px minmax(150px, 1fr); align-items: center; column-gap: 8px; margin: 7px 0 0; color: var(--muted); font-size: 12px; white-space: nowrap; }
            .morph-example-label { margin: 0; }
            .morph-example-word { display: inline-flex; align-items: center; min-height: 24px; }
            .morph-stem { color: #fff; }
            .morph-ending { display: inline-block; color: #0b1020; background: #fff; border-radius: 4px; padding: 1px 4px; margin-left: 1px; }
            .morph-empty { color: var(--muted); }
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
        const pill = $('app-version');
        if (pill) pill.textContent = `v${VERSION}`;
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

    function moveSampleSentences(event) {
        installSampleSentencesTab();
        const target = $('sample-sentences-output');
        if (!target) return;
        const detail = event?.detail;
        const source = $('generation-output');
        const frame = source?.querySelector('.sample-frame');
        if (frame) {
            target.className = '';
            target.replaceChildren(frame);
            return;
        }
        if (detail?.lexicon && detail?.config && window.ConlangSentenceEngine) {
            const samples = window.ConlangSentenceEngine.generateSamples(detail.lexicon, detail.config);
            const style = `<style id="sample-v718">.sample-frame{margin-top:0;background:#11182a;border:1px solid #26324a;border-radius:10px;padding:14px}.sample-pill{background:#0d1424;border:1px solid #26324a;border-radius:999px;padding:9px 14px;margin:7px 0}.sample-pill .en{font-weight:400}.sample-pill .cl{font-weight:700;margin-top:4px}.sample-word{cursor:help;border-bottom:1px dotted #55c7ff;position:relative}.sample-word:hover::after{content:attr(data-meaning);position:absolute;left:0;bottom:calc(100% + 6px);background:#050914;color:#fff;border:1px solid #3d5277;border-radius:6px;padding:4px 7px;white-space:nowrap;font:12px/1.2 system-ui;z-index:50}</style>`;
            const html = samples.map(x => `<div class="sample-pill"><div class="en"><b>${x.number}.</b> ${esc(x.english)}</div><div class="cl"><b>${x.number}.</b> ${x.html}</div></div>`).join('');
            target.className = '';
            target.innerHTML = style + `<div class="sample-frame"><h3>Sample sentences</h3>${html}</div>`;
        }
    }

    function installMorphemeExamples(event) {
        const detail = event?.detail;
        const morphemes = detail?.morphemes;
        if (!morphemes?.cases?.length) return;
        const grid = document.querySelector('#generation-output .morph-inventory');
        if (!grid) return;
        const rows = [...grid.querySelectorAll('.morph-row')];
        if (!rows.length) return;
        const lexicon = Array.isArray(detail?.lexicon) ? detail.lexicon : [];
        const noun = lexicon.find(entry => {
            const type = String(entry.word_type ?? '').toLowerCase();
            const category = String(entry.category ?? '').toLowerCase();
            return type === 'noun' || category.includes('noun');
        }) || lexicon.find(entry => entry?.conlang);
        const stem = String(noun?.conlang || 'tal');
        rows.forEach((row, index) => {
            row.querySelector('.morph-example')?.remove();
            const caseName = morphemes.cases[index];
            const ending = String(morphemes.caseEndings?.[caseName] || '');
            const example = document.createElement('div');
            example.className = 'morph-example';
            example.innerHTML = `<span class="morph-example-label">Example:</span><span class="morph-example-word"><span class="morph-stem">${esc(stem)}</span>${ending ? `<span class="morph-ending">${esc(ending)}</span>` : '<span class="morph-empty">∅</span>'}</span>`;
            const display = row.children[1];
            if (display) display.appendChild(example);
        });
    }

    function init() {
        styles();
        installCopyButton();
        installVersionPill();
        installSampleSentencesTab();
        window.addEventListener('conlang:generated', event => {
            moveSampleSentences(event);
            installMorphemeExamples(event);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();