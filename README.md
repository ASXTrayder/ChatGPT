# Shopify Pay-by-Bank Extension Scaffold

Production-oriented scaffold for a Shopify embedded app that orchestrates pay-by-bank payments through regulated providers (no fund custody, no settlement intermediation).

## Monorepo layout

- `apps/api`: OAuth onboarding, payment initiation, webhook endpoint.
- `apps/dashboard`: merchant analytics, savings, CSV export primitives.
- `apps/checkout-extension`: checkout flow payload builder and retry UX helpers.
- `packages/provider-connectors`: pluggable provider abstraction.
- `packages/ledger`: double-entry + status machine.
- `packages/webhook-handler`: secure, idempotent webhook processing.
- `packages/auth`, `packages/config`, `packages/utils`: shared infrastructure.

## Key architectural guarantees

- No custody/intermediation of funds; provider APIs only.
- Explicit transition state machine: `INITIATED -> PENDING -> CONFIRMED -> SETTLED|FAILED`.
- Idempotent webhook processing via idempotency records.
- Mandatory audit log model for all state changes.
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

This scaffold is intentionally modular and ready for replacing the `MockPayToProvider` with production provider SDK/API clients while preserving core orchestration logic.
