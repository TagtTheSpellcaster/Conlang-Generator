/* ConLang Generator — ergative UI v0.11.13 */
(() => {
    'use strict';

    const $ = id => document.getElementById(id);

    function install() {
        const relations = $('relations');
        const caseSystem = $('case-system');
        const caseOptions = $('case-options');
        if (!relations || !caseSystem) return;
        if (![...relations.options].some(option => option.value === 'ergative')) {
            const option = document.createElement('option');
            option.value = 'ergative';
            option.textContent = 'Ergative–absolutive';
            relations.appendChild(option);
        }

        const sync = () => {
            const ergative = relations.value === 'ergative';
            const visible = ergative || relations.value === 'cases' || relations.value === 'mixed';
            caseOptions?.classList.toggle('visible', visible);
            const current = caseSystem.value;
            if (ergative) {
                caseSystem.innerHTML = '';
                [
                    ['minimal', 'Minimal — absolutive / ergative'],
                    ['moderate', 'Moderate — absolutive / ergative / genitive / dative'],
                    ['extensive', 'Extensive — absolutive / ergative / genitive / dative / locative / ablative / instrumental']
                ].forEach(([value, label]) => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = label;
                    caseSystem.appendChild(option);
                });
                caseSystem.value = ['minimal', 'moderate', 'extensive'].includes(current) ? current : 'moderate';
            } else {
                const options = [
                    ['minimal', 'Minimal — nominative / accusative'],
                    ['moderate', 'Moderate — nominative / accusative / genitive / dative'],
                    ['extensive', 'Extensive — nominative / accusative / genitive / dative / locative / ablative / instrumental']
                ];
                caseSystem.innerHTML = '';
                options.forEach(([value, label]) => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = label;
                    caseSystem.appendChild(option);
                });
                caseSystem.value = ['minimal', 'moderate', 'extensive'].includes(current) ? current : 'moderate';
            }
        };

        relations.addEventListener('change', sync);
        sync();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
    else install();
})();
