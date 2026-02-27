import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { buildShopifyInstallUrl, createNonce } from "@paybank/auth";
import { loadEnv } from "@paybank/config";
import { MockPayToProvider, orderDataSchema } from "@paybank/provider-connectors";
import { logger } from "@paybank/utils";
import { processWebhook } from "@paybank/webhook-handler";

const env = loadEnv();
const provider = new MockPayToProvider(env.PROVIDER_API_KEY, env.PROVIDER_WEBHOOK_SECRET);

const app = express();
app.use(express.json({ type: "application/json" }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: env.RATE_LIMIT_PER_MINUTE,
    standardHeaders: true,
    legacyHeaders: false
  })
);

const installSchema = z.object({ shop: z.string().min(1) });
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

app.post("/payments/initiate", async (req, res) => {
  try {
    const order = orderDataSchema.parse(req.body);
    const initiated = await provider.initiatePayment(order);
    // Decision: orders remain pending until signed webhook confirms status.
    return res.status(202).json({ ...initiated, orderState: "PENDING_PAYMENT" });
  } catch (error) {
    logger.error({ error, body: req.body }, "Payment initiation failed");
    return res.status(400).json({ error: "Invalid payment request" });
  }
});

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

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "API listening");
});
