import { describe, expect, it } from "vitest";
import { buildDoubleEntry, nextStatus } from "../packages/ledger/src/index.js";

describe("simulated payment lifecycle", () => {
  it("walks through full lifecycle deterministically", () => {
    const statuses = ["INITIATED", "PENDING", "CONFIRMED", "SETTLED"] as const;
    let current = statuses[0];
    for (const next of statuses.slice(1)) {
      current = nextStatus(current, next);
    }
    expect(current).toBe("SETTLED");
  });

  it("is retry-safe with same idempotency key", () => {
    const payment = { paymentId: "p_2", orderId: "o_2", status: "PENDING" as const, amount: 5, currency: "AUD" };
    const first = buildDoubleEntry(payment, "CONFIRMED", "same_key");
    const second = buildDoubleEntry(payment, "CONFIRMED", "same_key");
    expect(first[0].id).toBe(second[0].id);
    expect(first[1].id).toBe(second[1].id);
  });
});
