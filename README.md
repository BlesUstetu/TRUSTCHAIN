# Trustchain by BlesProduction

Web3 Project Trust Passport — a multi-chain EVM transparency and monitoring SaaS with hybrid automated and human verification.

## Project boundaries

Trustchain is an independent application with its own repository, Supabase project, Vercel project, RPC credentials, environment variables, storage, and billing configuration. It must not write to UStetu systems, use UStetu secrets, invoke UStetu admin endpoints, or modify/deploy/upgrade UStetu contracts. Trustchain only reads public blockchain data.

## Current repository status

The repository currently includes:
- Next.js 15 / React 19 / TypeScript / Tailwind dashboard preview.
- Supabase browser/server clients with cookie-based SSR session refresh, email/password sign-in, sign-up confirmation callback, and protected dashboard routing.
- Read-only Base bytecode-presence helper using viem.
- Project input validation and GitHub Actions CI.
- Final multi-chain / hybrid-verification implementation blueprint.
- API v1 contract and security model documentation.
- Supabase migration 0002 for EVM chain registry, project networks, verification runs/reviews, public passport snapshots, worker cursors/jobs, and audit logs.

The dashboard still contains illustrative demo metrics. Project CRUD, organization onboarding, live indexing, verification workflows, notifications, public passport publishing, and billing are not complete. Authentication requires a dedicated Supabase project and redirect configuration.

## Architecture decisions

- Multi-chain EVM design; Base (8453) is the first enabled integration.
- Ethereum, BNB Chain, Polygon, Arbitrum and Optimism are registered as future adapters and remain disabled until tested.
- Hybrid verification: automated reproducible checks plus manual review for claims requiring human judgment.
- Evidence provenance and historical records are first-class.
- No Trustchain token or smart contract is required for MVP.

## Documentation

- [Final implementation blueprint](docs/FINAL_IMPLEMENTATION_BLUEPRINT.md)
- [API v1 contract](docs/API_CONTRACT.md)
- [Security model](docs/SECURITY_MODEL.md)

## Local development

Requirements: Node.js 20+

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Environment variables

Public:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_APP_URL

Server-only:
- SUPABASE_SERVICE_ROLE_KEY
- BASE_RPC_URL
- ETHEREUM_RPC_URL
- BNB_RPC_URL
- POLYGON_RPC_URL
- ARBITRUM_RPC_URL
- OPTIMISM_RPC_URL
- EXPLORER_API_KEY_* per provider
- BILLING_SECRET_KEY
- BILLING_WEBHOOK_SECRET
- INTERNAL_WORKER_SECRET
- EMAIL_PROVIDER_API_KEY
- TELEGRAM_BOT_TOKEN

Never expose server-only values through NEXT_PUBLIC variables or commit them to Git.

## Supabase setup

Create a dedicated Trustchain Supabase project. Apply migrations in order:
1. supabase/migrations/0001_initial_schema.sql
2. supabase/migrations/0002_multichain_hybrid_verification.sql

Do not apply these migrations to UStetu's database. The service-role key must remain server-side. Keep RLS enabled; do not disable policies to make the preview work.

## Verification limitations

The Base helper currently checks only whether bytecode exists at an address. Bytecode presence is not source verification, an audit, or a safety assessment. Every production check must preserve its method, subject, chain, block/time, source, engine version, and limitations.

## Development roadmap

See the final implementation blueprint for phased tasks, acceptance criteria, API endpoints, UI routes, data model, and production readiness gates.

## License

Proprietary until a license is explicitly added.
