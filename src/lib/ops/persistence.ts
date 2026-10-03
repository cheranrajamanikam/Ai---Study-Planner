import type { OpsState } from "./types";

/** Implement this interface to move persistence to a real database later. */
export interface PersistenceAdapter {
  load(): Partial<OpsState> | null;
  save(state: OpsState): void;
  clear(): void;
}

const KEY = "nexus-ops-state-v1";

export const localStorageAdapter: PersistenceAdapter = {
  load() {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Partial<OpsState>) : null;
    } catch {
      return null;
    }
  },
  save(state) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable — keep running in memory */
    }
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(KEY);
  },
};
