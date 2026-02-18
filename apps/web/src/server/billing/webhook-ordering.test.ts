import { describe, expect, it } from "vitest";
import { shouldIgnoreOutOfOrderEvent } from "@billing-core";

describe("shouldIgnoreOutOfOrderEvent", () => {
  it("returns false when there is no cursor", () => {
    const ignore = shouldIgnoreOutOfOrderEvent(null, {
      id: "evt_1",
      type: "customer.subscription.created",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(ignore).toBe(false);
  });

  it("ignores older events", () => {
    const ignore = shouldIgnoreOutOfOrderEvent(
      {
        lastEventId: "evt_2",
        lastEventType: "customer.subscription.updated",
        lastEventCreatedAt: new Date("2026-01-01T00:00:10.000Z"),
      },
      {
        id: "evt_1",
        type: "customer.subscription.created",
        createdAt: new Date("2026-01-01T00:00:09.000Z"),
      },
    );

    expect(ignore).toBe(true);
  });

  it("allows newer events", () => {
    const ignore = shouldIgnoreOutOfOrderEvent(
      {
        lastEventId: "evt_1",
        lastEventType: "customer.subscription.created",
        lastEventCreatedAt: new Date("2026-01-01T00:00:10.000Z"),
      },
      {
        id: "evt_2",
        type: "customer.subscription.updated",
        createdAt: new Date("2026-01-01T00:00:11.000Z"),
      },
    );

    expect(ignore).toBe(false);
  });

  it("ignores lower precedence event at same timestamp", () => {
    const ignore = shouldIgnoreOutOfOrderEvent(
      {
        lastEventId: "evt_2",
        lastEventType: "customer.subscription.updated",
        lastEventCreatedAt: new Date("2026-01-01T00:00:10.000Z"),
      },
      {
        id: "evt_1",
        type: "customer.subscription.created",
        createdAt: new Date("2026-01-01T00:00:10.000Z"),
      },
    );

    expect(ignore).toBe(true);
  });

  it("allows higher precedence event at same timestamp", () => {
    const ignore = shouldIgnoreOutOfOrderEvent(
      {
        lastEventId: "evt_1",
        lastEventType: "customer.subscription.created",
        lastEventCreatedAt: new Date("2026-01-01T00:00:10.000Z"),
      },
      {
        id: "evt_2",
        type: "customer.subscription.updated",
        createdAt: new Date("2026-01-01T00:00:10.000Z"),
      },
    );

    expect(ignore).toBe(false);
  });
});
