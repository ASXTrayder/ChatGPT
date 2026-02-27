import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { signOAuthState, verifyOAuthState, verifyShopifyQueryHmac, verifyShopifySessionToken } from "./index.js";

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

describe("oauth state signatures", () => {
  it("accepts valid signed state and nonce", () => {
    const token = signOAuthState("nonce_abc", "secret", 300, 1_700_000_000_000);
    const verified = verifyOAuthState(token, "secret", 1_700_000_100_000);
    expect(verified.ok).toBe(true);
    if (verified.ok) expect(verified.nonce).toBe("nonce_abc");
  });

  it("rejects expired signed state", () => {
    const token = signOAuthState("nonce_abc", "secret", 1, 1_700_000_000_000);
    const verified = verifyOAuthState(token, "secret", 1_700_010_000_000);
    expect(verified.ok).toBe(false);
  });
});

describe("shopify session token validation", () => {
  it("accepts valid signed session token", () => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        aud: "api_key",
        exp: Math.floor(Date.now() / 1000) + 300
      })
    ).toString("base64url");

    const signature = createHmac("sha256", "secret").update(`${header}.${payload}`).digest("base64url");
    const token = `${header}.${payload}.${signature}`;

    expect(verifyShopifySessionToken(token, "secret", "api_key")).toBe(true);
  });
});
