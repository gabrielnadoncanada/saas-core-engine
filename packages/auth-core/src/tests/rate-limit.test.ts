import { describe, expect, it } from "vitest";
import { buildAuthRateLimitKey } from "../rate-limit";

describe("buildAuthRateLimitKey", () => {
  it("builds a stable key from ip and route", () => {
    expect(buildAuthRateLimitKey({ ip: "1.2.3.4", route: "login" })).toBe(
      "1.2.3.4:login",
    );
  });

  it("adds identifier hash when provided", () => {
    expect(
      buildAuthRateLimitKey({
        ip: "1.2.3.4",
        route: "login",
        identifierHash: "abc123",
      }),
    ).toBe("1.2.3.4:login:abc123");
  });
});
