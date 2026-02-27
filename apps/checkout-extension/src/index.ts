import { z } from "zod";

const checkoutPayloadSchema = z.object({
  merchantId: z.string().uuid(),
  orderId: z.string(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  customerReference: z.string().min(1)
});

export type CheckoutPayload = z.infer<typeof checkoutPayloadSchema>;

export const buildPaymentRequest = (input: CheckoutPayload) => {
  const payload = checkoutPayloadSchema.parse(input);
  return {
    ...payload,
    idempotencyKey: `${payload.orderId}:${payload.customerReference}`
  };
};

export const renderRetryMessage = (timedOut: boolean) =>
  timedOut ? "Payment confirmation timed out. Please retry Pay-by-Bank." : "Awaiting bank confirmation...";
