import pino from "pino";
import { createHmac, timingSafeEqual } from "node:crypto";

export const logger = pino({ level: process.env.NODE_ENV === "production" ? "info" : "debug" });

export const hmacSha256 = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload, "utf8").digest("hex");

export const hmacSha256Base64 = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload, "utf8").digest("base64");

export const safeCompare = (a: string, b: string, encoding: BufferEncoding = "hex") => {
  const aBuffer = Buffer.from(a, encoding);
  const bBuffer = Buffer.from(b, encoding);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return timingSafeEqual(aBuffer, bBuffer);
};

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly context: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "DomainError";
  }
}
