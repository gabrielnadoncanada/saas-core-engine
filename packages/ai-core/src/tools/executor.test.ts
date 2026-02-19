import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "./registry";
import { executeToolWithContract } from "./executor";

describe("tool contract executor", () => {
  it("enforces schema", async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "echo",
      description: "echo",
      schema: z.object({ value: z.string() }),
      async execute(args) {
        return { value: (args as { value: string }).value };
      },
    });

    await expect(
      executeToolWithContract(registry, "echo", { value: 123 }, { userId: "u1", orgId: "o1" }),
    ).rejects.toThrow(/Invalid tool args/);
  });

  it("enforces authorize", async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "private",
      description: "private",
      schema: z.object({}),
      authorize: () => false,
      async execute() {
        return { ok: true };
      },
    });

    await expect(
      executeToolWithContract(registry, "private", {}, { userId: "u1", orgId: "o1" }),
    ).rejects.toThrow(/Unauthorized tool call/);
  });

  it("retries and succeeds", async () => {
    const registry = new ToolRegistry();
    let calls = 0;
    registry.register({
      name: "flaky",
      description: "flaky",
      schema: z.object({}),
      retries: 1,
      async execute() {
        calls += 1;
        if (calls === 1) throw new Error("temporary");
        return { ok: true };
      },
    });

    const out = await executeToolWithContract(
      registry,
      "flaky",
      {},
      { userId: "u1", orgId: "o1" },
    );

    expect(out.result["ok"]).toBe(true);
    expect(out.attempts).toBe(2);
  });
});
