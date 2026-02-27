import { PaymentStatus } from "@paybank/provider-connectors";
import { DomainError } from "@paybank/utils";

const allowedTransitions: Record<PaymentStatus, PaymentStatus[]> = {
  INITIATED: ["PENDING", "FAILED"],
  PENDING: ["CONFIRMED", "FAILED"],
  CONFIRMED: ["SETTLED", "FAILED"],
  SETTLED: [],
  FAILED: []
};

export type LedgerEntry = {
  id: string;
  paymentId: string;
  type: "debit" | "credit";
  account: "payment_pending" | "payment_confirmed" | "payment_settled" | "payment_failed";
  amount: number;
  currency: string;
  createdAt: Date;
  idempotencyKey: string;
};

export type PaymentRecord = {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
};

export const nextStatus = (current: PaymentStatus, requested: PaymentStatus): PaymentStatus => {
  if (!allowedTransitions[current].includes(requested)) {
    throw new DomainError("Invalid status transition", { current, requested });
  }
  return requested;
};

export const buildDoubleEntry = (
  payment: PaymentRecord,
  newStatus: PaymentStatus,
  idempotencyKey: string,
  now: Date = new Date()
): [LedgerEntry, LedgerEntry] => {
  const fromAccount = statusAccount(payment.status);
  const toAccount = statusAccount(newStatus);

  return [
    {
      id: `${payment.paymentId}:${idempotencyKey}:debit`,
      paymentId: payment.paymentId,
      type: "debit",
      account: fromAccount,
      amount: payment.amount,
      currency: payment.currency,
      createdAt: now,
      idempotencyKey
    },
    {
      id: `${payment.paymentId}:${idempotencyKey}:credit`,
      paymentId: payment.paymentId,
      type: "credit",
      account: toAccount,
      amount: payment.amount,
      currency: payment.currency,
      createdAt: now,
      idempotencyKey
    }
  ];
};

const statusAccount = (status: PaymentStatus): LedgerEntry["account"] => {
  switch (status) {
    case "INITIATED":
    case "PENDING":
      return "payment_pending";
    case "CONFIRMED":
      return "payment_confirmed";
    case "SETTLED":
      return "payment_settled";
    case "FAILED":
      return "payment_failed";
  }
};
