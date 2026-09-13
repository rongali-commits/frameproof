import { describe, it, expect } from "vitest";
import { normalizePin, pinToPercent, pinsMatch } from "@/lib/pinMath";

describe("normalizePin", () => {
  it("converts pixel coordinates to normalized 0-1 range", () => {
    const pin = normalizePin(300, 400, 600, 800);
    expect(pin.x).toBe(0.5);
    expect(pin.y).toBe(0.5);
  });

  it("clamps values below 0", () => {
    const pin = normalizePin(-50, -100, 600, 800);
    expect(pin.x).toBe(0);
    expect(pin.y).toBe(0);
  });

  it("clamps values above dimensions", () => {
    const pin = normalizePin(700, 900, 600, 800);
    expect(pin.x).toBe(1);
    expect(pin.y).toBe(1);
  });

  it("handles zero width or height safely", () => {
    const pin = normalizePin(100, 100, 0, 0);
    expect(pin.x).toBe(0.5);
    expect(pin.y).toBe(0.5);
  });

  it("handles exact corner positions", () => {
    const topLeft = normalizePin(0, 0, 600, 800);
    expect(topLeft.x).toBe(0);
    expect(topLeft.y).toBe(0);

    const bottomRight = normalizePin(600, 800, 600, 800);
    expect(bottomRight.x).toBe(1);
    expect(bottomRight.y).toBe(1);
  });

  it("produces consistent values regardless of image display size", () => {
    const small = normalizePin(150, 200, 300, 400);
    const large = normalizePin(300, 400, 600, 800);
    expect(small.x).toBe(large.x);
    expect(small.y).toBe(large.y);
  });
});

describe("pinToPercent", () => {
  it("converts normalized pins to CSS percentage strings", () => {
    const result = pinToPercent({ id: "x", x: 0.5, y: 0.25 });
    expect(result.left).toBe("50.00%");
    expect(result.top).toBe("25.00%");
  });

  it("handles edge values", () => {
    const result = pinToPercent({ id: "x", x: 0, y: 1 });
    expect(result.left).toBe("0.00%");
    expect(result.top).toBe("100.00%");
  });
});

describe("pinsMatch", () => {
  it("returns true for identical pins", () => {
    const a = { id: "a", x: 0.5, y: 0.3 };
    const b = { id: "b", x: 0.5, y: 0.3 };
    expect(pinsMatch(a, b)).toBe(true);
  });

  it("returns false for different pins", () => {
    const a = { id: "a", x: 0.5, y: 0.3 };
    const b = { id: "b", x: 0.6, y: 0.3 };
    expect(pinsMatch(a, b)).toBe(false);
  });

  it("respects custom tolerance", () => {
    const a = { id: "a", x: 0.5, y: 0.3 };
    const b = { id: "b", x: 0.505, y: 0.305 };
    expect(pinsMatch(a, b, 0.01)).toBe(true);
    expect(pinsMatch(a, b, 0.001)).toBe(false);
  });
});
