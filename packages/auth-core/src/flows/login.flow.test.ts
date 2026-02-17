import { describe, it, expect, vi } from "vitest";
import argon2 from "argon2";
import { LoginFlow } from "./login.flow";
import { hashPassword } from "../hashing/password";
import type { UsersRepo } from "../auth.ports";

function mockUsersRepo(overrides: Partial<UsersRepo> = {}): UsersRepo {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    markEmailVerified: vi.fn(),
    setPasswordHash: vi.fn(),
    touchLastLogin: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("LoginFlow", () => {
  it("returns ok:true for valid credentials", async () => {
    const hash = await hashPassword("my-password");
    const users = mockUsersRepo({
      findByEmail: vi.fn().mockResolvedValue({
        id: "u1",
        email: "a@b.com",
        passwordHash: hash,
      }),
    });

    const flow = new LoginFlow(users);
    const res = await flow.execute({ email: "a@b.com", password: "my-password" });

    expect(res).toEqual({ ok: true, userId: "u1" });
    expect(users.touchLastLogin).toHaveBeenCalledWith("u1");
  });

  it("returns ok:false for wrong password", async () => {
    const hash = await hashPassword("correct-pw");
    const users = mockUsersRepo({
      findByEmail: vi.fn().mockResolvedValue({
        id: "u1",
        email: "a@b.com",
        passwordHash: hash,
      }),
    });

    const flow = new LoginFlow(users);
    const res = await flow.execute({ email: "a@b.com", password: "wrong-pw" });

    expect(res).toEqual({ ok: false });
  });

  it("returns ok:false for non-existent user (anti-enumeration)", async () => {
    const users = mockUsersRepo();
    const flow = new LoginFlow(users);

    const res = await flow.execute({ email: "noone@x.com", password: "whatever" });
    expect(res).toEqual({ ok: false });
  });

  it("returns ok:false for user without password (OAuth-only)", async () => {
    const users = mockUsersRepo({
      findByEmail: vi.fn().mockResolvedValue({
        id: "u1",
        email: "a@b.com",
        passwordHash: null,
      }),
    });

    const flow = new LoginFlow(users);
    const res = await flow.execute({ email: "a@b.com", password: "anything" });

    expect(res).toEqual({ ok: false });
  });

  it("lowercases email before lookup", async () => {
    const users = mockUsersRepo();
    const flow = new LoginFlow(users);

    await flow.execute({ email: "User@Example.COM", password: "pw" });
    expect(users.findByEmail).toHaveBeenCalledWith("user@example.com");
  });

  it("upgrades password hash when params are outdated", async () => {
    const weakHash = await argon2.hash("my-password", {
      type: argon2.argon2id,
      memoryCost: 4096,
      timeCost: 2,
      parallelism: 1,
    });
    const users = mockUsersRepo({
      findByEmail: vi.fn().mockResolvedValue({
        id: "u1",
        email: "a@b.com",
        passwordHash: weakHash,
      }),
    });

    const flow = new LoginFlow(users);
    const res = await flow.execute({ email: "a@b.com", password: "my-password" });

    expect(res).toEqual({ ok: true, userId: "u1" });
    expect(users.setPasswordHash).toHaveBeenCalledTimes(1);
  });
});
