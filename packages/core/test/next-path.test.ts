import { describe, it, expect } from "vitest";
import { safeNextPath, NEXT_PATH_MAX } from "../src/auth/next-path";

describe("safeNextPath — where sign-in may send someone", () => {
  it("keeps a path on this site, with its query and fragment", () => {
    expect(safeNextPath("/orders/abc")).toBe("/orders/abc");
    expect(safeNextPath("/courses/warrior?tab=lessons&page=2")).toBe("/courses/warrior?tab=lessons&page=2");
    expect(safeNextPath("/today#streak")).toBe("/today#streak");
    expect(safeNextPath("/")).toBe("/");
  });

  it("returns the normalised form", () => {
    expect(safeNextPath("/courses/./warrior/../business")).toBe("/courses/business");
    expect(safeNextPath("/search?q=a b")).toBe("/search?q=a%20b");
  });

  it("requires a single leading slash", () => {
    for (const raw of ["orders/abc", " /orders/abc", "//evil.example", "///evil.example", "//evil.example/today"]) {
      expect(safeNextPath(raw), raw).toBeNull();
    }
  });

  it("rejects any backslash", () => {
    for (const raw of ["/\\evil.example", "/\\/evil.example", "/orders\\abc"]) {
      expect(safeNextPath(raw), raw).toBeNull();
    }
  });

  it("rejects control characters", () => {
    for (const raw of ["/\t/evil.example", "/\n/evil.example", "/orders\r\nabc", "/a\u0000b", "/a\u007fb", "/a\u0085b"]) {
      expect(safeNextPath(raw), JSON.stringify(raw)).toBeNull();
    }
  });

  it("rejects a scheme or an absolute URL", () => {
    for (const raw of ["https://evil.example", "HTTP://evil.example/today", "javascript:alert(1)", "data:text/html,hi", "mailto:a@b.c"]) {
      expect(safeNextPath(raw), raw).toBeNull();
    }
  });

  it("rejects a path that only becomes protocol-relative once dot segments are resolved", () => {
    for (const raw of ["/.//evil.example", "/..//evil.example", "/today/..//evil.example", "/%2e%2e//evil.example", "/%2e//evil.example"]) {
      expect(safeNextPath(raw), raw).toBeNull();
    }
  });

  it("rejects the sign-in pages themselves", () => {
    for (const raw of [
      "/login",
      "/login/",
      "/login?next=%2Ftoday",
      "/LOGIN",
      "/today/../login",
      "/%6cogin",
      "/register",
      "/register?ref=ABC123",
      "/forgot-password",
      "/reset-password/some-token",
      "/verify-email/some-token",
    ]) {
      expect(safeNextPath(raw), raw).toBeNull();
    }
    // Only those pages: a path that merely starts with the same letters is fine.
    expect(safeNextPath("/login-help")).toBe("/login-help");
    expect(safeNextPath("/registered-courses")).toBe("/registered-courses");
  });

  it(`rejects anything over ${NEXT_PATH_MAX} characters`, () => {
    const longest = `/${"a".repeat(NEXT_PATH_MAX - 1)}`;
    expect(safeNextPath(longest)).toBe(longest);
    expect(safeNextPath(`${longest}a`)).toBeNull();
    // The cap holds for the normalised result too.
    expect(safeNextPath(`/${"é".repeat(200)}`)).toBeNull();
  });

  it("rejects malformed escapes and anything that is not a string", () => {
    expect(safeNextPath("/100%-sure")).toBeNull();
    for (const raw of [undefined, null, "", 42, ["/orders/abc"], { path: "/orders/abc" }]) {
      expect(safeNextPath(raw), JSON.stringify(raw)).toBeNull();
    }
  });
});
