import { describe, it, expect } from "vitest";
import { hashToken, sha256Hex } from "./token";

describe("hashToken", () => {
  it("produces a deterministic hex hash", () => {
    const pepper = "test-pepper-long-enough-32-characters";
    const h1 = hashToken("my-token", pepper);
    const h2 = hashToken("my-token", pepper);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different tokens", () => {
    const pepper = "test-pepper-long-enough-32-characters";
    expect(hashToken("token-a", pepper)).not.toBe(hashToken("token-b", pepper));
  });

  it("produces different hashes for different peppers", () => {
    expect(hashToken("same-token", "pepper-aaaa-aaaa-aaaa-aaaa-aaaa-aaaa")).not.toBe(
      hashToken("same-token", "pepper-bbbb-bbbb-bbbb-bbbb-bbbb-bbbb"),
    );
  });

  it("throws if pepper is too short", () => {
    expect(() => hashToken("token", "short")).toThrow("TOKEN_PEPPER");
  });

  it("throws if pepper is empty", () => {
    expect(() => hashToken("token", "")).toThrow("TOKEN_PEPPER");
  });
});

describe("sha256Hex", () => {
  it("returns a 64-char hex string", () => {
    expect(sha256Hex("hello")).toMatch(/^[0-9a-f]{64}$/);
  });
});
