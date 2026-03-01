import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadSubject(trustProxyHeaders: boolean) {
  vi.doMock("@/server/config/env", () => ({
    env: {
      TRUST_PROXY_HEADERS: trustProxyHeaders,
    },
  }));
  return import("@/server/http/request-ip");
}

describe("extractClientIp", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns loopback when proxy headers are not trusted", async () => {
    const { extractClientIp } = await loadSubject(false);
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
    });

    expect(extractClientIp(req)).toBe("");
  });

  it("uses cf-connecting-ip when trusted and valid", async () => {
    const { extractClientIp } = await loadSubject(true);
    const req = new Request("http://localhost", {
      headers: {
        "cf-connecting-ip": "203.0.113.10",
      },
    });

    expect(extractClientIp(req)).toBe("203.0.113.10");
  });

  it("uses the first valid x-forwarded-for candidate", async () => {
    const { extractClientIp } = await loadSubject(true);
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "bad-ip, 198.51.100.7, 198.51.100.8",
      },
    });

    expect(extractClientIp(req)).toBe("198.51.100.7");
  });

  it("falls back to loopback when all trusted headers are invalid", async () => {
    const { extractClientIp } = await loadSubject(true);
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "garbage",
        "x-real-ip": "also-bad",
      },
    });

    expect(extractClientIp(req)).toBe("");
  });
});
