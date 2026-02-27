# Deployment Guide

1. Provision PostgreSQL.
2. Set environment variables from `.env.example` in your secret manager.
3. Install dependencies: `pnpm install`.
4. Run migrations: `pnpm --filter @paybank/api prisma migrate deploy`.
5. Deploy API as stateless service behind HTTPS.
6. Configure Shopify app URLs + webhook endpoint.
7. Enable structured logs and alerting for webhook failures.
