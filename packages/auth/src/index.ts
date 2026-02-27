import { randomUUID, createHash, createHmac } from "node:crypto";

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

/**
 * Shopify OAuth callback and app proxy requests include `hmac` based on query params.
 */
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
  return digest === provided;
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
