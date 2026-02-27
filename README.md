# Shopify Pay-by-Bank Extension Scaffold

Production-oriented scaffold for a Shopify embedded app that orchestrates pay-by-bank payments through regulated providers (no fund custody, no settlement intermediation).

## Monorepo layout

- `apps/api`: OAuth onboarding/callback, payment initiation, provider+Shopify webhooks.
- `apps/dashboard`: merchant analytics, savings, CSV export primitives.
- `apps/checkout-extension`: checkout flow payload builder + Shopify extension scaffold.
- `packages/provider-connectors`: pluggable provider abstraction.
- `packages/ledger`: double-entry + status machine.
- `packages/webhook-handler`: secure, idempotent webhook processing.
- `packages/auth`, `packages/config`, `packages/utils`: shared infrastructure.

## Shopify/App Store hardening included

- OAuth install + callback query HMAC verification.
- Signed OAuth `state` and replay-safe nonce consumption.
- Provider webhook raw-body signature verification path.
- Shopify compliance webhook HMAC verification path.
- Embedded session token verification middleware scaffold for authenticated app routes.
- Input validation and rate limits on public endpoints.

## Run

```bash
pnpm install
pnpm test
pnpm --filter @paybank/api dev
```

## Database schema

Prisma schema lives in `apps/api/prisma/schema.prisma` and models:
- merchants
- payments
- ledger entries (double-entry)
- audit events
- idempotency records

## Notes

This scaffold is modular and intended for replacing `MockPayToProvider` with production provider integrations while preserving orchestration logic.
