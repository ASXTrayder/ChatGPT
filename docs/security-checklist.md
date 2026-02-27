# Security Checklist

- [x] HMAC verification on all provider webhooks.
- [x] Idempotency enforcement for webhook and mutation processing.
- [x] Rate limiting on public API routes.
- [x] Strict input schema validation (`zod`) on all boundaries.
- [x] Secrets only loaded from environment variables.
- [x] Audit log model included for all state-changing events.
- [x] No balance fields without double-entry ledger postings.
- [x] Contextual error logging with non-silent failures.
