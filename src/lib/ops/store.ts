import { useSyncExternalStore } from "react";
import { initialState } from "./defaults";
import { localStorageAdapter, type PersistenceAdapter } from "./persistence";
import type { OpsState } from "./types";

/**
 * Single source of truth for the simulated building.
 * Persistence goes through a swappable adapter (localStorage today, a database later).
 */
let adapter: PersistenceAdapter = localStorageAdapter;
let state: OpsState = initialState();
let hydrated = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const serverSnapshot = initialState();

export function setPersistenceAdapter(a: PersistenceAdapter) {
  adapter = a;
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const saved = adapter.load();
  if (saved) {
    const base = initialState();
    state = {
      ...base,
      ...saved,
      settings: { ...base.settings, ...saved.settings },
      // runtime-only fields never resume mid-flight
      demoRunning: false,
      demoStage: null,
      agentStep: saved.agentStep === "awaiting" ? "awaiting" : saved.agentStep === "completed" ? "completed" : "idle",
    };
  }
}

export function getState(): OpsState {
  hydrate();
  return state;
}

export function setState(fn: (s: OpsState) => OpsState) {
  hydrate();
  state = fn(state);
  listeners.forEach((l) => l());
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => adapter.save(state), 250);
}

export function replaceState(next: OpsState) {
  setState(() => next);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Returns the full ops state; components re-render on every change. */
export function useOps(): OpsState {
  return useSyncExternalStore(subscribe, getState, () => serverSnapshot);
}
