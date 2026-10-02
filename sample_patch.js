/* ConLang Generator UI patch — v0.10.4 */
(() => {
    'use strict';

    const VERSION = '0.10.4';
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
        `; document.head.appendChild(s);
    }

    function installCopyButton() {
        const exportButton = $('export-vocabulary'); const existing = $('copy-vocabulary'); if (existing || !exportButton) return;
        const button = document.createElement('button'); button.type = 'button'; button.className = 'btn'; button.id = 'copy-vocabulary'; button.textContent = 'Copy to Clipboard'; exportButton.insertAdjacentElement('beforebegin', button);
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

    function installSampleTab() {
        let tab = document.querySelector('.tab[data-tab="samples"]'); let panel = $('samples'); if (tab && panel) return panel;
        const tabs = document.querySelector('.tabs'); const dictionaryTab = tabs?.querySelector('.tab[data-tab="dictionary"]');
        tab = document.createElement('button'); tab.type = 'button'; tab.className = 'tab'; tab.dataset.tab = 'samples'; tab.setAttribute('aria-selected', 'false'); tab.textContent = 'Sample Sentences';
        if (dictionaryTab) dictionaryTab.insertAdjacentElement('afterend', tab); else tabs?.appendChild(tab);
        panel = document.createElement('section'); panel.id = 'samples'; panel.className = 'tab-panel'; panel.innerHTML = '<main><div id="samples-output" class="result empty">Generate a language to populate the sample sentences.</div></main>';
        document.querySelector('#generator')?.insertAdjacentElement('afterend', panel);
        tab.addEventListener('click', () => { document.querySelectorAll('.tab').forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected', 'false'); }); document.querySelectorAll('.tab-panel').forEach(x => x.classList.remove('active')); tab.classList.add('active'); tab.setAttribute('aria-selected', 'true'); panel.classList.add('active'); });
        return panel;
    }

    function value(id) { const element = $(id); if (!element) return ''; if (element.tagName === 'SELECT') return [...element.selectedOptions].map(option => option.value).filter(Boolean).join(', '); return element.value || ''; }

    function renderParameters() {
        const output = $('generation-output'); if (!output) return; let card = output.querySelector('.base-parameters');
        if (!card) { card = document.createElement('div'); card.className = 'card base-parameters'; output.appendChild(card); }
        const groups = [
            ['Semantic profile', [['Region', value('region') || 'Any'], ['Culture', value('culture') || 'Any'], ['Biome', value('biome') || 'Any'], ['Temporal setting', value('temporal_setting') || 'Any'], ['Tags', value('tags') || 'Any']]],
            ['Phonology', [['Model', $('consonants')?.selectedOptions?.[0]?.textContent || ''], ['Vowels', $('vowels')?.selectedOptions?.[0]?.textContent || ''], ['Mean syllables', $('mean')?.value || '']]],
            ['Morphosyntax', [['Word order', value('word-order')], ['Morphology', $('morphology')?.selectedOptions?.[0]?.textContent || ''], ['Adjective position', $('adj-position')?.selectedOptions?.[0]?.textContent || ''], ['Articles', $('articles')?.selectedOptions?.[0]?.textContent || ''], ['Plural', $('plural')?.selectedOptions?.[0]?.textContent || ''], ['Grammatical relations', $('relations')?.selectedOptions?.[0]?.textContent || '']]]
        ];
        card.innerHTML = '<h3>Language parameters</h3><div class="base-parameters-grid">' + groups.map(([title, entries]) => '<div class="param-group"><div class="param-title">' + esc(title) + '</div>' + entries.map(([key, val]) => '<div style="margin:4px 0"><span style="color:var(--muted)">' + esc(key) + ':</span> <span class="param-value">' + esc(val) + '</span></div>').join('') + '</div>').join('') + '</div>';
    }

    function installModelOptions() {
        const select = $('consonants'); if (!select || !window.ConlangPhonology) return; const current = select.value;
        select.innerHTML = window.ConlangPhonology.modelOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join(''); select.value = window.ConlangPhonology.models[current] ? current : 'european';
    }

    function updateSamplePanel() { installSampleTab(); const output = $('generation-output'); const target = $('samples-output'); if (!output || !target) return; const frame = output.querySelector('.sample-frame'); if (frame) { target.innerHTML = ''; target.appendChild(frame); } renderParameters(); window.ConlangPhonology?.phonologize(); }
    function resetGenerationPhonology() { window.ConlangPhonology?.resetCycle(); }

    function init() {
        styles(); installCopyButton(); installModelOptions(); installSampleTab();
        const generationOutput = $('generation-output'); if (generationOutput) new MutationObserver(() => requestAnimationFrame(updateSamplePanel)).observe(generationOutput, { childList: true, subtree: true });
        const lexiconOutput = $('lexicon-output'); if (lexiconOutput) new MutationObserver(() => requestAnimationFrame(() => window.ConlangPhonology?.phonologize())).observe(lexiconOutput, { childList: true, subtree: true });
        document.addEventListener('click', event => { const button = event.target.closest('button'); if (!button) return; const label = button.textContent.trim().toLowerCase(); if (label.includes('generate language') || label.includes('regenerate lexicon')) resetGenerationPhonology(); }, true);
        updateSamplePanel();
        const heading = document.querySelector('header h1');
        if (heading) { let badge = heading.querySelector('.version-badge'); if (!badge) { badge = document.createElement('span'); badge.className = 'chip version-badge'; badge.style.marginLeft = '8px'; heading.appendChild(badge); } badge.textContent = 'v' + VERSION; }
    }

    function loadGeneratorUI() { if (window.ConlangGeneratorUI) return Promise.resolve(); return new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'generator_ui.js'; script.onload = resolve; script.onerror = () => reject(new Error('Unable to load generator_ui.js.')); document.head.appendChild(script); }); }
    function start() { loadGeneratorUI().then(init).catch(error => { console.error(error); if ($('message')) $('message').textContent = error.message; }); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();