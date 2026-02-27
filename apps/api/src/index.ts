import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  buildOAuthTokenRequest,
  buildShopifyInstallUrl,
  createNonce,
  hashToken,
  verifyShopifyQueryHmac
} from "@paybank/auth";
import { loadEnv } from "@paybank/config";
import { MockPayToProvider, orderDataSchema } from "@paybank/provider-connectors";
import { logger } from "@paybank/utils";
import { processWebhook } from "@paybank/webhook-handler";

const env = loadEnv();
const provider = new MockPayToProvider(env.PROVIDER_API_KEY, env.PROVIDER_WEBHOOK_SECRET);

const app = express();

app.use(
  rateLimit({
    windowMs: 60_000,
    limit: env.RATE_LIMIT_PER_MINUTE,
    standardHeaders: true,
    legacyHeaders: false
  })
);

// Keep raw body for signature checks.
app.post("/webhooks/provider", express.text({ type: "application/json" }), async (req, res) => {
  const signature = req.header("x-provider-signature");
  const idem = req.header("idempotency-key");

  if (!signature || !idem) {
    return res.status(400).json({ error: "Missing required headers" });
  }

  try {
    const result = await processWebhook(
      provider,
      {
        async findByProviderPaymentId(providerPaymentId) {
          return {
            paymentId: providerPaymentId,
            orderId: "shopify-order-001",
            status: "PENDING",
            amount: 10,
            currency: "AUD"
          };
        },
        async hasProcessedIdempotencyKey() {
          return false;
        },
        async saveTransition(input) {
          logger.info({ input }, "Persist transition + ledger + audit log in DB transaction");
        }
      },
      req.body,
      signature,
      idem
    );

    return res.status(200).json(result);
  } catch (error) {
    logger.error({ error }, "Webhook processing failed");
    return res.status(400).json({ error: "Webhook rejected" });
  }
});

app.use(express.json({ type: "application/json" }));

const installSchema = z.object({ shop: z.string().endsWith(".myshopify.com") });
app.get("/oauth/install", (req, res) => {
  const parsed = installSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const state = createNonce();
  const installUrl = buildShopifyInstallUrl({
    shop: parsed.data.shop,
    apiKey: env.SHOPIFY_API_KEY,
    scopes: env.SHOPIFY_SCOPES,
    redirectUri: `${env.SHOPIFY_APP_URL}/oauth/callback`,
    state
  });

  return res.json({ installUrl, state });
});

const oauthCallbackSchema = z.object({
  shop: z.string().endsWith(".myshopify.com"),
  code: z.string().min(1),
  hmac: z.string().min(1),
  state: z.string().min(1)
});

app.get("/oauth/callback", async (req, res) => {
  const parsed = oauthCallbackSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (!verifyShopifyQueryHmac(req.query as Record<string, string>, env.SHOPIFY_API_SECRET)) {
    return res.status(401).json({ error: "Invalid OAuth callback signature" });
  }

  try {
    const tokenRequest = buildOAuthTokenRequest({
      shop: parsed.data.shop,
      clientId: env.SHOPIFY_API_KEY,
      clientSecret: env.SHOPIFY_API_SECRET,
      code: parsed.data.code
    });

    const response = await fetch(tokenRequest.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tokenRequest.body)
    });

    if (!response.ok) {
      logger.error({ status: response.status }, "OAuth token exchange failed");
      return res.status(502).json({ error: "OAuth exchange failed" });
    }

    const { access_token } = (await response.json()) as { access_token: string };
    logger.info(
      {
        shop: parsed.data.shop,
        tokenHash: hashToken(access_token)
      },
      "Persist merchant install session"
    );

    return res.status(200).json({ ok: true, shop: parsed.data.shop });
  } catch (error) {
    logger.error({ error }, "OAuth callback processing failed");
    return res.status(500).json({ error: "OAuth callback failed" });
  }
});

app.post("/webhooks/shopify/customers-data-request", (req, res) => {
  logger.info({ body: req.body }, "GDPR customers/data_request webhook received");
  return res.sendStatus(200);
});

app.post("/webhooks/shopify/customers-redact", (req, res) => {
  logger.info({ body: req.body }, "GDPR customers/redact webhook received");
  return res.sendStatus(200);
});

app.post("/webhooks/shopify/shop-redact", (req, res) => {
  logger.info({ body: req.body }, "GDPR shop/redact webhook received");
  return res.sendStatus(200);
});

app.post("/payments/initiate", async (req, res) => {
  try {
    const order = orderDataSchema.parse(req.body);
    const initiated = await provider.initiatePayment(order);
    return res.status(202).json({ ...initiated, orderState: "PENDING_PAYMENT" });
  } catch (error) {
    logger.error({ error, body: req.body }, "Payment initiation failed");
    return res.status(400).json({ error: "Invalid payment request" });
  }
});

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "API listening");
});
