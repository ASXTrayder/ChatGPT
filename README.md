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

## Shopify best-practice alignment in this scaffold

- OAuth install + callback shape with query HMAC verification.
- Provider webhook raw-body signature verification path.
- Shopify GDPR webhook endpoints scaffolded.
- Input validation and rate limits on public endpoints.

## What still must be completed before production App Store submission

- Persist OAuth `state` nonce server-side and enforce replay/CSRF checks.
- Verify Shopify webhook HMAC headers for compliance endpoints.
- Use official Shopify App Bridge + session token verification middleware for embedded routes.
- Implement full checkout extension UI with Shopify extension runtime APIs.
- Add CI with executed tests, coverage threshold, and Shopify partner review checks.

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
