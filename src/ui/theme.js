// Colour theme: dark (default), light, or follow the system. The choice is kept in the browser when storage is available.
const KEY = 'tutlayin-theme';
const read = () => { try { return localStorage.getItem(KEY) || 'dark'; } catch { return 'dark'; } };
const write = v => { try { localStorage.setItem(KEY, v); } catch { /* storage unavailable: the choice lasts for this visit */ } };
export function resolveTheme(mode, prefersLight) { return mode === 'light' || (mode === 'system' && prefersLight) ? 'light' : 'dark'; }
export function initTheme(select) {
    const query = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
    const apply = mode => document.documentElement.setAttribute('data-theme', resolveTheme(mode, !!query?.matches));
    let mode = read();
    if (select) { select.value = mode; select.addEventListener('change', () => { mode = select.value; write(mode); apply(mode); }); }
    query?.addEventListener?.('change', () => { if (mode === 'system') apply(mode); });
    apply(mode);
}
