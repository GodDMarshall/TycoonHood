import { describe, it, expect } from "vitest";
import { clip, sliceWhole } from "../src/text/clip";

const FIRE = "\u{1F525}"; // one emoji, two UTF-16 units

/** What the server's UTF-8 HTML can carry: text with no half characters survives the trip unchanged. */
const survivesUtf8 = (s: string) => new TextDecoder().decode(new TextEncoder().encode(s)) === s;

describe("sliceWhole — slicing that never halves a character", () => {
  it("is String#slice for text without characters past U+FFFF", () => {
    const s = "Plain text, café, ✓ and ₹ too";
    for (const [a, b] of [[0, 5], [3, 12], [0, s.length], [10, 3], [-4, s.length], [0, -2], [0, 999]]) {
      expect(sliceWhole(s, a, b), `${a},${b}`).toBe(s.slice(a, b));
    }
    expect(sliceWhole(s)).toBe(s);
    expect(sliceWhole(s, 7)).toBe(s.slice(7));
  });

  it("drops an emoji whose second half is past the end", () => {
    const s = `ab${FIRE}cd`;
    expect(sliceWhole(s, 0, 3)).toBe("ab");
    expect(sliceWhole(s, 0, 4)).toBe(`ab${FIRE}`);
  });

  it("drops an emoji whose first half is before the start", () => {
    const s = `ab${FIRE}cd`;
    expect(sliceWhole(s, 3)).toBe("cd");
    expect(sliceWhole(s, 2)).toBe(`${FIRE}cd`);
  });

  it("returns empty text when only half an emoji was asked for", () => {
    expect(sliceWhole(FIRE, 0, 1)).toBe("");
    expect(sliceWhole(FIRE, 1)).toBe("");
    expect(sliceWhole("", 0, 5)).toBe("");
  });

  it("never leaves half a character, wherever the cut falls", () => {
    const s = `${FIRE}a${FIRE}${FIRE}b 👨‍👩‍👧 é${FIRE}`;
    for (let a = 0; a <= s.length; a++) {
      for (let b = a; b <= s.length; b++) {
        const out = sliceWhole(s, a, b);
        expect(survivesUtf8(out), `${a},${b}`).toBe(true);
        expect(s.slice(a, b).includes(out), `${a},${b}`).toBe(true);
        expect(out.length, `${a},${b}`).toBeGreaterThanOrEqual(b - a - 2);
      }
    }
  });
});

describe("clip — short text with an ellipsis", () => {
  it("leaves text that fits alone", () => {
    expect(clip("short", 10)).toBe("short");
    expect(clip("x".repeat(120), 120)).toBe("x".repeat(120));
    expect(clip("", 5)).toBe("");
  });

  it("cuts long text to the limit, ellipsis included, without trailing space", () => {
    expect(clip("a".repeat(130), 120)).toBe(`${"a".repeat(119)}…`);
    expect(clip("one two three", 9)).toBe("one two…");
    expect(clip("abcdef", 4, "...")).toBe("a...");
  });

  it("drops an emoji the cut would halve, and keeps one that fits", () => {
    expect(clip(`${"x".repeat(118)}${FIRE} and the rest`, 120)).toBe(`${"x".repeat(118)}…`);
    expect(clip(`${"x".repeat(117)}${FIRE} and the rest`, 120)).toBe(`${"x".repeat(117)}${FIRE}…`);
  });

  it("copes with a limit smaller than the ellipsis", () => {
    expect(clip("hello", 0)).toBe("…");
  });
});
