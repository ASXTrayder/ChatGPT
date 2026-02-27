import { z } from "zod";
import { hmacSha256, safeCompare } from "@paybank/utils";

export const paymentStatusSchema = z.enum(["INITIATED", "PENDING", "CONFIRMED", "SETTLED", "FAILED"]);

export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const orderDataSchema = z.object({
  merchantId: z.string().uuid(),
  orderId: z.string(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  customerReference: z.string().min(1),
  idempotencyKey: z.string().min(12)
});

export type OrderData = z.infer<typeof orderDataSchema>;

export const providerWebhookSchema = z.object({
  providerPaymentId: z.string(),
  orderId: z.string(),
  status: paymentStatusSchema,
  occurredAt: z.string().datetime(),
  failureReason: z.string().optional()
});

export type ProviderWebhook = z.infer<typeof providerWebhookSchema>;

export interface PaymentProvider {
  initiatePayment(orderData: OrderData): Promise<{ providerPaymentId: string; redirectUrl?: string; status: PaymentStatus }>;
  verifyWebhook(payload: string, signature: string): boolean;
  getPaymentStatus(id: string): Promise<{ status: PaymentStatus; raw: unknown }>;
}

export class MockPayToProvider implements PaymentProvider {
  constructor(private readonly apiKey: string, private readonly webhookSecret: string) {}

  async initiatePayment(orderData: OrderData) {
    orderDataSchema.parse(orderData);
    return {
      providerPaymentId: `payto_${orderData.orderId}_${Date.now()}`,
      redirectUrl: `https://provider.example/pay/${orderData.orderId}`,
      status: "INITIATED" as const
    };
  }

  verifyWebhook(payload: string, signature: string) {
    const expected = hmacSha256(this.webhookSecret, payload);
    return safeCompare(expected, signature);
  }

  async getPaymentStatus(id: string) {
    return { status: "PENDING" as const, raw: { id, source: "mock" } };
  }
}

export const parseProviderWebhook = (payload: unknown) => providerWebhookSchema.parse(payload);
