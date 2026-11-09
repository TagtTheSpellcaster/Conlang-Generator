// Deterministic string hash (FNV-1a) and PRNG (mulberry32 variant).
export function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}

export function rng(seed) {
    let x = hash(String(seed)) || 1;
    return () => {
        x += 0x6D2B79F5;
        let t = x;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export const pick = (list, r) => list[Math.floor(r() * list.length)];

// Fresh seed for "auto". Uses Web Crypto when available (browser and Node >= 19).
export function freshSeed() {
    const c = globalThis.crypto;
    if (c?.getRandomValues) {
        const v = new Uint32Array(2);
        c.getRandomValues(v);
        return `auto-${Date.now()}-${v[0].toString(36)}-${v[1].toString(36)}`;
    }
    return `auto-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
