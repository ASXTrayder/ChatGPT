import { z } from "zod";

const transactionSchema = z.object({
  paymentId: z.string(),
  orderId: z.string(),
  status: z.enum(["INITIATED", "PENDING", "CONFIRMED", "SETTLED", "FAILED"]),
  amount: z.number(),
  cardFeeEquivalent: z.number(),
  createdAt: z.string()
});

export type TransactionRow = z.infer<typeof transactionSchema>;

export const computeSavings = (rows: TransactionRow[]) =>
  rows.reduce((sum, row) => sum + row.cardFeeEquivalent, 0);

export const toCsv = (rows: TransactionRow[]) => {
  const header = "paymentId,orderId,status,amount,cardFeeEquivalent,createdAt";
  const body = rows
    .map((row) =>
      [row.paymentId, row.orderId, row.status, row.amount.toFixed(2), row.cardFeeEquivalent.toFixed(2), row.createdAt].join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
};

/**
 * Architectural decision: analytics calculations are pure functions to keep the
 * dashboard stateless and deterministic (easy to test and cache).
 */
export const buildAnalytics = (rows: TransactionRow[]) => ({
  volume: rows.reduce((acc, row) => acc + row.amount, 0),
  savings: computeSavings(rows),
  settledCount: rows.filter((row) => row.status === "SETTLED").length
});
