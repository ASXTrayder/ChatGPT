import { randomUUID, createHash, createHmac } from "node:crypto";
import { safeCompare } from "@paybank/utils";

export const buildShopifyInstallUrl = (opts: {
  shop: string;
  apiKey: string;
  scopes: string;
  redirectUri: string;
  state: string;
}) => {
  const query = new URLSearchParams({
    client_id: opts.apiKey,
    scope: opts.scopes,
    redirect_uri: opts.redirectUri,
    state: opts.state
  });

  return `https://${opts.shop}/admin/oauth/authorize?${query.toString()}`;
};

export const createNonce = () => randomUUID();

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const verifyShopifyQueryHmac = (
  query: Record<string, string | string[] | undefined>,
  clientSecret: string
) => {
  const provided = typeof query.hmac === "string" ? query.hmac : "";
  if (!provided) return false;

  const message = Object.entries(query)
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .map(([key, value]) => {
      const normalized = Array.isArray(value) ? value.join(",") : (value ?? "");
      return `${key}=${normalized}`;
    })
    .sort()
    .join("&");

  const digest = createHmac("sha256", clientSecret).update(message, "utf8").digest("hex");
  return safeCompare(digest, provided, "hex");
};

export const buildOAuthTokenRequest = (opts: {
  shop: string;
  clientId: string;
  clientSecret: string;
  code: string;
}) => ({
  url: `https://${opts.shop}/admin/oauth/access_token`,
  body: {
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    code: opts.code
  }
});

export const signOAuthState = (nonce: string, secret: string, ttlSeconds = 300, now = Date.now()) => {
  const payload = {
    nonce,
    exp: Math.floor(now / 1000) + ttlSeconds
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(encodedPayload, "utf8").digest("hex");
  return `${encodedPayload}.${signature}`;
};

export const verifyOAuthState = (token: string, secret: string, now = Date.now()) => {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return { ok: false as const, reason: "malformed" as const };
  }

  const expected = createHmac("sha256", secret).update(encodedPayload, "utf8").digest("hex");
  if (!safeCompare(expected, signature, "hex")) {
    return { ok: false as const, reason: "invalid_signature" as const };
  }

  const decoded = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
    nonce: string;
    exp: number;
  };

  if (decoded.exp < Math.floor(now / 1000)) {
    return { ok: false as const, reason: "expired" as const };
  }

  return { ok: true as const, nonce: decoded.nonce };
};

export const verifyShopifySessionToken = (token: string, apiSecret: string, expectedAudience: string) => {
  const [headerB64, payloadB64, signatureB64] = token.split(".");
  if (!headerB64 || !payloadB64 || !signatureB64) return false;

  const payloadRaw = `${headerB64}.${payloadB64}`;
  const expectedSignature = createHmac("sha256", apiSecret).update(payloadRaw).digest("base64url");
  if (!safeCompare(expectedSignature, signatureB64, "utf8")) return false;

  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
    aud: string;
    exp: number;
    nbf?: number;
  };

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== expectedAudience) return false;
  if (payload.exp <= now) return false;
  if (payload.nbf && payload.nbf > now) return false;

  return true;
};
