# Architecture Diagram (Text)

## High-level modules

1. **Shopify Checkout Extension (`apps/checkout-extension`)**
   - Captures pay-by-bank selection and creates a typed payment request.
2. **API (`apps/api`)**
   - Handles OAuth onboarding + callback, payment initiation, webhook ingestion, embedded session token checks, and rate-limited public routes.
3. **Provider Connectors (`packages/provider-connectors`)**
   - Uniform abstraction for provider APIs (`PaymentProvider` interface).
4. **Webhook Handler (`packages/webhook-handler`)**
   - Signature verification + idempotent transition orchestration.
5. **Ledger (`packages/ledger`)**
   - Double-entry posting and strict payment status state machine.
6. **Dashboard (`apps/dashboard`)**
   - Transaction history, analytics, fee-savings math, and CSV export.

## Data flow

- Merchant installs app via Shopify OAuth install URL.
- OAuth callback verifies query HMAC, validates signed `state`, consumes nonce, and exchanges code for access token.
- Checkout initiates payment -> provider request created with idempotency key.
- Provider sends signed webhook -> handler verifies HMAC and deduplicates.
- Valid transition writes `Payment`, `LedgerEntry`, and `AuditEvent` atomically.
- Shopify GDPR webhooks are verified via HMAC on dedicated compliance endpoints.
