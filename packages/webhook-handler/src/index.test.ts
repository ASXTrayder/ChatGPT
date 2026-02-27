import { describe, expect, it } from "vitest";
import { MockPayToProvider } from "@paybank/provider-connectors";
import { processWebhook } from "./index.js";
import { hmacSha256 } from "@paybank/utils";

const secret = "whsec_test";
const provider = new MockPayToProvider("api", secret);

const payment = { paymentId: "p_1", orderId: "o_1", status: "PENDING" as const, amount: 10, currency: "AUD" };

describe("webhook processing", () => {
  it("verifies signature and transitions once", async () => {
    let processed = false;
    const repository = {
      async findByProviderPaymentId() {
        return payment;
      },
      async hasProcessedIdempotencyKey() {
        return processed;
      },
      async saveTransition() {
        processed = true;
      }
    };

    const payload = JSON.stringify({
      providerPaymentId: "provider_1",
      orderId: "o_1",
      status: "CONFIRMED",
      occurredAt: new Date().toISOString()
    });

    const sig = hmacSha256(secret, payload);
    const first = await processWebhook(provider, repository, payload, sig, "idem_key_1234567890");
    expect(first.deduplicated).toBe(false);

    const second = await processWebhook(provider, repository, payload, sig, "idem_key_1234567890");
    expect(second.deduplicated).toBe(true);
  });
});
