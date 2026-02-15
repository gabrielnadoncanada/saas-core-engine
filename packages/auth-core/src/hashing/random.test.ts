import { describe, it, expect } from "vitest";
import { randomTokenBase64Url } from "./random";

describe("randomTokenBase64Url", () => {
  it("returns a base64url string of expected length", () => {
    const token = randomTokenBase64Url(32);
    // 32 bytes → ceil(32*4/3) = 43 chars in base64url (no padding)
    expect(token.length).toBe(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => randomTokenBase64Url()));
    expect(tokens.size).toBe(50);
  });

  it("respects custom byte length", () => {
    const token16 = randomTokenBase64Url(16);
    const token64 = randomTokenBase64Url(64);
    expect(token16.length).toBeLessThan(token64.length);
  });
});
