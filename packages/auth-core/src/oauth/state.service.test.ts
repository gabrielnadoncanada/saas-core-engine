import { describe, expect, it, vi } from "vitest";
import { OAuthStateService } from "./state.service";
import type { OAuthStatesRepo } from "../auth.ports";

const PEPPER = "test-pepper-long-enough-for-validation";

function mockRepo(): OAuthStatesRepo {
  return {
    create: vi.fn().mockResolvedValue({ id: "st-1" }),
    findValidByStateHash: vi.fn().mockResolvedValue(null),
    deleteByIdIfExists: vi.fn().mockResolvedValue(true),
  };
}

describe("OAuthStateService", () => {
  it("returns null when already consumed concurrently", async () => {
    const repo = mockRepo();
    (repo.findValidByStateHash as any).mockResolvedValue({
      id: "st-1",
      provider: "google",
      codeVerifier: "verifier",
      redirectPath: "/dashboard",
    });
    (repo.deleteByIdIfExists as any).mockResolvedValue(false);
    const svc = new OAuthStateService(repo, PEPPER);

    const result = await svc.consume({ provider: "google", state: "state-token" });

    expect(result).toBeNull();
  });

  it("rejects unsafe redirect paths", async () => {
    const repo = mockRepo();
    const svc = new OAuthStateService(repo, PEPPER);

    await expect(
      svc.create({
        provider: "google",
        redirectPath: "https://evil.tld",
        ttlMinutes: 10,
      }),
    ).rejects.toThrow("Invalid redirect path");
  });
});
