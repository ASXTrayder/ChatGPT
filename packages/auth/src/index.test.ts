import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyShopifyQueryHmac } from "./index.js";

describe("shopify oauth hmac", () => {
  it("accepts a valid callback hmac", () => {
    const secret = "shpss_test";
    const query = {
      shop: "example.myshopify.com",
      code: "code_123",
      state: "nonce_123",
      timestamp: "1730000000"
    };

    const message = Object.entries(query)
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join("&");
    const hmac = createHmac("sha256", secret).update(message).digest("hex");

    expect(verifyShopifyQueryHmac({ ...query, hmac }, secret)).toBe(true);
  });

  it("rejects an invalid callback hmac", () => {
    expect(
      verifyShopifyQueryHmac(
        {
          shop: "example.myshopify.com",
          code: "code_123",
          state: "nonce_123",
          timestamp: "1730000000",
          hmac: "bad"
        },
        "shpss_test"
      )
    ).toBe(false);
  });
});
