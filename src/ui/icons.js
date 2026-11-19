// Line icons for the tabs and the header buttons: inline SVG drawn on a 24 x 24 grid, coloured by the text (currentColor).
// An element with data-icon="name" gets its icon in front of the label; the icon is decorative (aria-hidden).
const P = {
    generator: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 3v4M17 5h4M5 17v4M3 19h4"/>',
    lexicon: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21a2 2 0 0 1 2-2h13"/><path d="M9 8h6"/>',
    dictionary: '<path d="M12 6c-1.6-1.4-4-2-8-2v14c4 0 6.4.6 8 2 1.6-1.4 4-2 8-2V4c-4 0-6.4.6-8 2z"/><path d="M12 6v14"/>',
    'sample-sentences': '<path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M8 9h8M8 12h5"/>',
    numerals: '<path d="M9 4L7 20M17 4l-2 16M4 9h16M3 15h16"/>',
    names: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    history: '<path d="M6 3h12M6 21h12M7 3c0 5 3 6 5 9-2 3-5 4-5 9M17 3c0 5-3 6-5 9 2 3 5 4 5 9"/>',
    writing: '<path d="M4 20l1-4L17 4l3 3L8 19z"/><path d="M14.5 6.5l3 3"/>',
    vocabulary: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21a2 2 0 0 1 2-2h13"/><path d="M12 7v6M9 10h6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    description: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 15.5h7M9 19h4"/>',
    grammar: '<path d="M4 20V5M4 5h7v15M11 20V8h9v12z"/><path d="M14 12h3M14 16h3"/>',
    texts: '<path d="M5 4h14v16H5z"/><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4"/>'
};
export const ICON_NAMES = Object.freeze(Object.keys(P));
export const iconSvg = name => P[name] ? `<svg class="icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name]}</svg>` : '';
export function addIcons(root = document) {
    for (const el of root.querySelectorAll('[data-icon]')) {
        if (el.querySelector(':scope > svg.icon')) continue;
        el.insertAdjacentHTML('afterbegin', iconSvg(el.dataset.icon));
    }
}
