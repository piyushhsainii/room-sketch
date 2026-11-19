/** Shared by browser and server; no dependency on React or client-only helpers. */
export function uid() { return Math.random().toString(36).slice(2, 9); }
