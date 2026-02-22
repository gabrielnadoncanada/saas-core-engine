import { describe, it, expect } from "vitest";
import { codeChallengeS256, oidcNonceFromCodeVerifier } from "../../oauth/pkce";

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

describe("oidcNonceFromCodeVerifier", () => {
  it("is deterministic for a given verifier", () => {
    const a = oidcNonceFromCodeVerifier("same-verifier");
    const b = oidcNonceFromCodeVerifier("same-verifier");
    expect(a).toBe(b);
  });

  it("returns a base64url-safe value", () => {
    const nonce = oidcNonceFromCodeVerifier("nonce-verifier");
    expect(nonce).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
