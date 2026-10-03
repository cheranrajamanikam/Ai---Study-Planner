export const uid = () => Math.random().toString(36).slice(2, 10);
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const round1 = (v: number) => Math.round(v * 10) / 10;
