import type { DemoState } from "@/types";

const STORAGE_KEY = "frameproof-demo-state-v2";

export function loadState(): DemoState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as DemoState;
    return state.schemaVersion === 2 &&
      Array.isArray(state.assets) &&
      Array.isArray(state.comments) &&
      Array.isArray(state.decisions)
      ? state
      : null;
  } catch {
    return null;
  }
}

export function saveState(state: DemoState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    throw new Error(
      "This browser could not save your demo. Storage may be full or unavailable.",
    );
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
