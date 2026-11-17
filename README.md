# Trustchain by BlesProduction

Web3 Project Trust Passport — a multi-chain EVM transparency and monitoring SaaS with hybrid automated and human verification.

## Project boundaries

Trustchain is an independent application with its own repository, Supabase project, Vercel project, RPC credentials, environment variables, storage, and billing configuration. It must not write to UStetu systems, use UStetu secrets, invoke UStetu admin endpoints, or modify/deploy/upgrade UStetu contracts. Trustchain only reads public blockchain data.

## Current repository status

The repository currently includes:
- Next.js 15 / React 19 / TypeScript / Tailwind dashboard preview.
- Supabase browser/server clients with cookie-based SSR sessions, email/password and Google/GitHub/Discord OAuth flows, password recovery, and protected dashboard routing.
- Base-first Sign-In with Ethereum (SIWE) wallet authentication using a one-time nonce, domain/origin binding, signature verification, and a Supabase session.
- Read-only Base bytecode-presence helper using viem.
- Project input validation and GitHub Actions CI.
- Final multi-chain / hybrid-verification implementation blueprint.
- API v1 contract and security model documentation.
- Supabase migration 0002 for EVM chain registry, project networks, verification runs/reviews, public passport snapshots, worker cursors/jobs, and audit logs.

The dashboard still contains illustrative demo metrics. Project CRUD, organization onboarding, live indexing, verification workflows, notifications, public passport publishing, and billing are not complete. Email/social authentication requires Supabase provider configuration. Wallet authentication additionally requires the server-only service-role key and WALLET_AUTH_SECRET to be configured in Vercel.

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
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy)
- NEXT_PUBLIC_APP_URL

Server-only:
- SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY (legacy)
- WALLET_AUTH_SECRET (minimum 32 characters; stable across deployments)
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

### Enable social sign-in

After the dedicated Trustchain Supabase project exists:

1. In Supabase Dashboard, open **Authentication → Sign In / Providers**.
2. Enable Google, GitHub, and Discord individually.
3. Create an OAuth application in each provider's developer console and enter its Client ID and Client Secret in that provider's Supabase settings. Keep all client secrets in Supabase; never place them in frontend environment variables.
4. In each provider's OAuth application, register the Supabase callback URL shown in the provider settings. It normally follows this format: `https://<project-ref>.supabase.co/auth/v1/callback`.
5. In **Authentication → URL Configuration**, use these Trustchain production values:
   - Site URL: `https://trustchain-delta.vercel.app`
   - Allowed redirect URL: `https://trustchain-delta.vercel.app/auth/callback`
   - Local development: `http://localhost:3000/auth/callback`
   - Add exact Vercel preview callback patterns only if preview deployments will be used.
6. The Supabase project ref is `sesijxvpfuimcyaibqgk`; the provider callback URL to register with Google, GitHub, and Discord is `https://sesijxvpfuimcyaibqgk.supabase.co/auth/v1/callback`.

The app calls `signInWithOAuth` and returns through `/auth/callback`. OAuth provider credentials and allow-list settings are still pending; the buttons will show a provider/configuration error until the dedicated Supabase project is configured.

## Verification limitations

The Base helper currently checks only whether bytecode exists at an address. Bytecode presence is not source verification, an audit, or a safety assessment. Every production check must preserve its method, subject, chain, block/time, source, engine version, and limitations.

## Development roadmap

See the final implementation blueprint for phased tasks, acceptance criteria, API endpoints, UI routes, data model, and production readiness gates.

## License

Proprietary until a license is explicitly added.


### Wallet sign-in (Base / SIWE)

The login page includes a wallet option for injected EVM wallets (for example, MetaMask or a compatible browser wallet) on Base (chain ID 8453). The user signs an EIP-4361 message; this is an off-chain authentication signature, not a transaction, and it does not spend gas.

The server issues a short-lived, HTTP-only nonce cookie, validates the SIWE message against the request host/origin, nonce, expiration, version, and Base chain ID, then establishes a normal Supabase Auth session. The server accepts the newer `SUPABASE_SECRET_KEY` environment variable, with the legacy service-role variable retained as a fallback. Wallet-only identities are provisioned server-side with a reserved synthetic email and a deterministic password derived from the wallet address plus `WALLET_AUTH_SECRET`; the secret never reaches the browser.

Required Vercel server environment variables:
- `SUPABASE_SECRET_KEY` — create a dedicated Trustchain secret API key (preferred), or use the legacy `service_role` key as `SUPABASE_SERVICE_ROLE_KEY`; server-only.
- `WALLET_AUTH_SECRET` — generate a random value of at least 32 characters (for example, `openssl rand -hex 32`). Keep it stable; changing it without a wallet-account credential migration will prevent existing wallet identities from signing in.

Do not paste either secret into chat, GitHub, source files, or any `NEXT_PUBLIC_*` variable. Add them directly in the Trustchain Vercel project's Environment Variables, then redeploy. This initial wallet flow targets Base and injected browser wallets; WalletConnect/mobile deep-link support and broader chain selection are future work. Wallet accounts still need organization membership before they can access tenant-owned records.
