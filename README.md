# Trustchain

**Web3 Project Transparency & Monitoring Platform**

Trustchain collects, checks, and presents evidence about Web3 project contracts, token activity, treasury wallets, and operational changes. It deliberately separates independently observed facts from project-submitted claims.

> Trustchain is an evidence and monitoring product. It does not certify that a project, token, contract, or investment is safe.

## Current implementation status

This repository contains the initial Next.js application scaffold, a dashboard preview using clearly labeled illustrative data, shared types, a read-only Base address inspection helper, a Supabase multi-tenant schema migration, and GitHub Actions validation.

The following are **not yet implemented**: production authentication/onboarding, live project persistence, background indexing, automated alerts, public passport read model, billing, API key issuance, and production security controls. Dashboard numbers and projects are demo data, not live chain results.

## Stack

- Next.js 15 / React 19 / TypeScript
- Tailwind CSS 4
- Supabase PostgreSQL and Auth
- viem for read-only Base RPC inspection
- Vercel deployment target
- GitHub Actions CI

## Local development

Requirements: Node.js 20+

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

Environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase publishable/anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key; never expose it to the browser.
- `BASE_RPC_URL`: dedicated Base Mainnet RPC endpoint. The read-only chain helper fails closed when it is not configured.
- `NEXT_PUBLIC_APP_URL`: public application URL.

## Supabase setup

1. Create a dedicated Supabase project for Trustchain.
2. Open the SQL Editor.
3. Apply `supabase/migrations/0001_initial_schema.sql`.
4. Configure the public URL and anon/publishable key in local environment variables.
5. Do not place the service-role key in any `NEXT_PUBLIC_*` variable.

The initial schema enables tenant-scoped row-level security. Organization onboarding and write APIs are not yet implemented; do not disable RLS to make the preview work. Public passport access must be added through a deliberately scoped read model or server-side route, not broad anonymous table policies.

## Base inspection helper

`lib/blockchain/base.ts` provides a read-only helper that checks whether bytecode exists at an EVM address on Base (chain ID 8453). Bytecode presence does not prove source verification, audit status, safe ownership, or project legitimacy. Use a dedicated RPC provider and implement request authentication/rate limits before exposing chain inspection through a public API.

## Evidence model

Every evidence record should preserve:

- What was checked and the exact subject.
- Source type: on-chain observed, project-reported, or third-party.
- Source URI, transaction hash, chain ID, and block number where applicable.
- Observation timestamp and optional validity window.
- Historical result; previous evidence must not be silently overwritten.

Recommended public statuses: `verified`, `observed`, `reported`, `unverified`, `stale`, and `alert`. A status must always be accompanied by its verification method and scope.

## Security principles

- Never request or store user wallet private keys.
- Treat project-submitted metadata and on-chain strings as untrusted input.
- Keep tenant data isolated with RLS and server-side authorization.
- Hash API keys at rest and show raw keys only once.
- Preserve immutable-style evidence history with append-only application behavior.
- Do not claim that a project is safe based on one check.
- Obtain an independent security review before handling sensitive customer data or launching paid production monitoring.

## Roadmap

1. Foundation and dashboard preview.
2. Authentication, organization onboarding, and tenant-safe project CRUD.
3. Base contract and wallet registration.
4. Evidence Ledger and verification history.
5. Background event indexer and alert delivery.
6. Public Trust Passport with carefully scoped public data.
7. Subscription billing, usage limits, and API access.

## License

Proprietary until a license is explicitly added.