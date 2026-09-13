import type { Pin } from "@/types";

export function normalizePin(
  rawX: number,
  rawY: number,
  width: number,
  height: number,
): Pin {
  if (width <= 0 || height <= 0) {
    return { id: "", x: 0.5, y: 0.5 };
  }
  const x = Math.max(0, Math.min(1, rawX / width));
  const y = Math.max(0, Math.min(1, rawY / height));
  return { id: "", x, y };
}

export function pinToPercent(pin: Pin): { left: string; top: string } {
  return {
    left: `${(pin.x * 100).toFixed(2)}%`,
    top: `${(pin.y * 100).toFixed(2)}%`,
  };
}

export function pinsMatch(a: Pin, b: Pin, tolerance = 0.001): boolean {
  return Math.abs(a.x - b.x) < tolerance && Math.abs(a.y - b.y) < tolerance;
}
