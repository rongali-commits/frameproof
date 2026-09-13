import type { DemoState } from "@/types";

const STORAGE_KEY = "frameproof-demo-state";

export function loadState(): DemoState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoState;
  } catch {
    return null;
  }
}

export function saveState(state: DemoState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable; silently skip
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
