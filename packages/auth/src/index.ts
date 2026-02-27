import { randomUUID, createHash } from "node:crypto";

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
