// Small text helpers shared by every module.
export const norm = v => String(v ?? '').toLowerCase().trim();
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uniq = a => [...new Set(a)];
