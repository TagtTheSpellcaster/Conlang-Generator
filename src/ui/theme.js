// Colour theme: light or dark (default dark). The choice is kept in the browser when storage is available;
// a "system" value saved by an earlier version follows the system preference once.
const KEY = 'tutlayin-theme';
const read = () => { try { return localStorage.getItem(KEY) || 'dark'; } catch { return 'dark'; } };
const write = v => { try { localStorage.setItem(KEY, v); } catch { /* storage unavailable: the choice lasts for this visit */ } };
export function resolveTheme(mode, prefersLight) { return mode === 'light' || (mode === 'system' && prefersLight) ? 'light' : 'dark'; }
// `toggle` holds buttons with data-theme-choice="light|dark"; the active one has aria-pressed="true"
export function initTheme(toggle) {
    const query = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
    let mode = resolveTheme(read(), !!query?.matches);
    const apply = () => {
        document.documentElement.setAttribute('data-theme', mode);
        for (const b of toggle?.querySelectorAll('[data-theme-choice]') ?? []) b.setAttribute('aria-pressed', String(b.dataset.themeChoice === mode));
    };
    toggle?.addEventListener('click', e => {
        const b = e.target.closest('[data-theme-choice]');
        if (!b) return;
        mode = b.dataset.themeChoice === 'light' ? 'light' : 'dark';
        write(mode); apply();
    });
    apply();
}
