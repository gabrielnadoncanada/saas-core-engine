import { describe, it, expect } from "vitest";
import { codeChallengeS256 } from "./pkce";

describe("codeChallengeS256", () => {
  it("produces a base64url string", () => {
    const challenge = codeChallengeS256("test-verifier");
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("is deterministic", () => {
    const a = codeChallengeS256("same-verifier");
    const b = codeChallengeS256("same-verifier");
    expect(a).toBe(b);
  });

  it("produces different challenges for different verifiers", () => {
    expect(codeChallengeS256("verifier-a")).not.toBe(
      codeChallengeS256("verifier-b"),
    );
  });

  // RFC 7636 Appendix B test vector
  it("matches RFC 7636 test vector", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const expected = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
    expect(codeChallengeS256(verifier)).toBe(expected);
  });
});
