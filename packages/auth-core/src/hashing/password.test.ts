import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword", () => {
  it("rejects passwords shorter than 8 characters", async () => {
    await expect(hashPassword("short")).rejects.toThrow("Password too short");
  });

  it("produces a hash that can be verified", async () => {
    const hash = await hashPassword("valid-password-123");
    expect(hash).toBeTruthy();
    expect(hash).not.toBe("valid-password-123");
    expect(await verifyPassword(hash, "valid-password-123")).toBe(true);
  });

  it("produces different hashes for the same password (salted)", async () => {
    const h1 = await hashPassword("same-password!");
    const h2 = await hashPassword("same-password!");
    expect(h1).not.toBe(h2);
  });
});

describe("verifyPassword", () => {
  it("returns false for wrong password", async () => {
    const hash = await hashPassword("correct-password");
    expect(await verifyPassword(hash, "wrong-password")).toBe(false);
  });

  it("returns false for malformed hash", async () => {
    expect(await verifyPassword("not-a-hash", "whatever")).toBe(false);
  });
});
