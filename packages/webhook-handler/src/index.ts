import { buildDoubleEntry, nextStatus, PaymentRecord } from "@paybank/ledger";
import { parseProviderWebhook, PaymentProvider } from "@paybank/provider-connectors";
import { DomainError, logger } from "@paybank/utils";

export interface PaymentRepository {
  findByProviderPaymentId(providerPaymentId: string): Promise<PaymentRecord | null>;
  hasProcessedIdempotencyKey(key: string): Promise<boolean>;
  saveTransition(input: {
    payment: PaymentRecord;
    nextState: PaymentRecord["status"];
    idempotencyKey: string;
    ledgerRows: ReturnType<typeof buildDoubleEntry>;
    rawWebhook: unknown;
  }): Promise<void>;
}

export const processWebhook = async (
  provider: PaymentProvider,
  repository: PaymentRepository,
  payloadRaw: string,
  signature: string,
  idempotencyKey: string
) => {
  if (!provider.verifyWebhook(payloadRaw, signature)) {
    throw new DomainError("Invalid webhook signature", { idempotencyKey });
  }

  if (await repository.hasProcessedIdempotencyKey(idempotencyKey)) {
    logger.info({ idempotencyKey }, "Duplicate webhook ignored");
    return { deduplicated: true };
  }

  const payload = parseProviderWebhook(JSON.parse(payloadRaw));
  const payment = await repository.findByProviderPaymentId(payload.providerPaymentId);

  if (!payment) {
    throw new DomainError("Payment not found", { providerPaymentId: payload.providerPaymentId });
  }

  const next = nextStatus(payment.status, payload.status);
  const ledgerRows = buildDoubleEntry(payment, next, idempotencyKey);

  await repository.saveTransition({
    payment,
    nextState: next,
    idempotencyKey,
    ledgerRows,
    rawWebhook: payload
  });

  logger.info({ paymentId: payment.paymentId, next, idempotencyKey }, "Webhook processed successfully");
  return { deduplicated: false, next };
};
