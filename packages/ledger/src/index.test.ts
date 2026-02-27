import { describe, expect, it } from "vitest";
import { buildDoubleEntry, nextStatus } from "./index.js";

describe("ledger status machine", () => {
  it("allows valid transitions", () => {
    expect(nextStatus("INITIATED", "PENDING")).toBe("PENDING");
    expect(nextStatus("PENDING", "CONFIRMED")).toBe("CONFIRMED");
  });

  it("blocks invalid transitions", () => {
    expect(() => nextStatus("INITIATED", "SETTLED")).toThrowError("Invalid status transition");
  });

  it("creates balanced double-entry rows", () => {
    const [debit, credit] = buildDoubleEntry(
      { paymentId: "p_1", orderId: "o_1", status: "PENDING", amount: 12.34, currency: "AUD" },
      "CONFIRMED",
      "idem_123456789012"
    );

    expect(debit.amount).toBe(credit.amount);
    expect(debit.type).toBe("debit");
    expect(credit.type).toBe("credit");
  });
});
