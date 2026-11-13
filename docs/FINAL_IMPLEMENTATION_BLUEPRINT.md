# Trustchain by BlesProduction — Final Implementation Blueprint

Product: Web3 Project Trust Passport  
Business: Global B2B SaaS  
Repository: https://github.com/BlesUstetu/TRUSTCHAIN  
Architecture: Multi-chain EVM, hybrid automated + human verification  
First production integration: Base (8453); additional EVM chains are enabled only after adapter tests pass.

## 1. Non-negotiable project boundary

Trustchain is independent. It uses its own GitHub repository, Supabase project, Vercel project, environment variables, RPC credentials, storage, billing account, and operational secrets. It may read public blockchain data from networks where UStetu is deployed, but it must never import UStetu private credentials, write to UStetu databases, invoke UStetu administrative endpoints, submit transactions to UStetu contracts, or modify/deploy/upgrade UStetu contracts. No UStetu contract address is a Trustchain dependency.

## 2. Product principles

1. Evidence over scores: show what was checked, method, block/time, and limitations.
2. Provenance separation: on-chain observed, project-reported, and third-party evidence are distinct.
3. Hybrid review: automation collects reproducible facts; reviewers assess claims requiring judgment.
4. Time-bounded truth: evidence can become stale; every result has observed_at and optional valid_until.
5. Append-only history: new checks create new records; never silently rewrite old outcomes.
6. Multi-tenant by default: every customer-owned row carries organization_id and RLS.
7. No safety certification: source verification or an audit document is not a guarantee that a project is safe.

## 3. Multi-chain architecture

### Chain registry
Use chain_id as canonical network identity. The chains table stores public metadata only. RPC URLs and credentials live in server-side environment variables or a secrets manager, never in the database or browser bundle.

Initial registry: Ethereum (1), Optimism (10), BNB Chain (56), Polygon (137), Base (8453), Arbitrum One (42161). Base is the first enabled integration. Other chains remain disabled until RPC, explorer, finality, event decoding, reorg handling, and test fixtures pass acceptance checks.

### Adapter interface
Implement a common EvmChainAdapter:
- getChainId()
- getBlockNumber()
- getBlock(blockNumber)
- getBytecode(address, blockTag?)
- getLogs(filter)
- getTransaction(hash)
- getTransactionReceipt(hash)
- getTokenMetadata(address)
- getExplorerUrl(kind, value)

Each adapter receives a chain-specific public client and rate-limited RPC transport. Do not assume identical finality or explorer APIs. Normalize addresses to checksum form for display and lowercase for database uniqueness. Persist chain_id with every address and transaction reference.

### Indexing and reorg safety
Run workers outside ordinary Vercel request handlers.
1. Read the last persisted cursor.
2. Fetch bounded block/log ranges.
3. Persist raw event identity (chain_id, transaction_hash, log_index) and block hash.
4. Wait for configured chain finality before promoting observations to finalized evidence.
5. Detect changed block hashes and reconcile affected derived state.
6. Advance cursor only after the batch is durably committed.
7. Retry transient RPC errors with exponential backoff and a dead-letter queue.

Use provider failover and per-chain rate limits. Never rely on one RPC provider for every chain in production.

## 4. Hybrid verification lifecycle

### Automated checks
- Address format and chain existence.
- Contract bytecode presence at a specified block.
- Explorer source-verification lookup where supported.
- Proxy pattern detection and implementation/admin slot observation.
- Ownership and access-control role inspection when ABI/standard is known.
- Token metadata and supply snapshots.
- Registered wallet balance and transfer observations.
- Treasury inflow/outflow summaries.
- Relevant privileged event monitoring.

Each check returns pass, fail, inconclusive, or not_applicable, plus method, subject, chain, block, timestamp, source, evidence, engine version, and limitations. Never infer safety from bytecode presence or a verified source badge.

### Manual review
Review is required for team/treasury wallet attribution, token allocation and vesting claims, audit report scope/authenticity, document interpretation, disputed evidence, and high-impact findings before public presentation.

Review states: pending, approved, rejected, request_changes. Each decision stores reviewer, timestamp, checklist, rationale, and the exact run/evidence reviewed. A reviewer appends a decision; the reviewer cannot alter the original observation.

### Public evidence statuses
- observed: directly read from a chain/source.
- verified: a defined claim passed a documented procedure.
- reported: supplied by the project and not independently confirmed.
- unverified: insufficient evidence.
- stale: validity window elapsed or refresh overdue.
- alert: monitored condition triggered.

Always display scope and timestamp.

## 5. Target GitHub repository structure

```
TRUSTCHAIN/
├── app/
│   ├── (marketing)/{page.tsx, pricing/page.tsx, docs/page.tsx}
│   ├── (auth)/{login/page.tsx, signup/page.tsx, callback/route.ts}
│   ├── (workspace)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── projects/{page.tsx,new/page.tsx,[projectId]/page.tsx}
│   │   ├── projects/[projectId]/{contracts,wallets}/page.tsx
│   │   ├── evidence/page.tsx
│   │   ├── reviews/page.tsx
│   │   ├── monitoring/page.tsx
│   │   ├── alerts/page.tsx
│   │   ├── api-keys/page.tsx
│   │   ├── billing/page.tsx
│   │   └── settings/page.tsx
│   ├── passport/[slug]/page.tsx
│   └── api/v1/...
├── components/{layout,dashboard,projects,evidence,verification,passport,ui}/
├── lib/
│   ├── auth/ billing/ permissions/ rate-limit/ validation/ observability/
│   ├── blockchain/{adapter.ts,registry.ts,adapters/}
│   ├── verification/{engine.ts,checks/,policies/}
│   ├── evidence/
│   └── supabase/{browser,server,admin}.ts
├── workers/{indexer,verification,monitoring,notifications}/
├── supabase/{migrations,seed.sql,tests}/
├── docs/{FINAL_IMPLEMENTATION_BLUEPRINT.md,API_CONTRACT.md,SECURITY_MODEL.md,RUNBOOK.md}
├── tests/{unit,integration,e2e}/
├── .github/workflows/ci.yml
├── .env.example
├── package.json
└── README.md
```

The current scaffold is retained and expanded incrementally. Do not create empty placeholders for every future module.

## 6. Supabase data model

Identity/tenancy: organizations, organization_members, subscriptions.  
Projects/chains: projects, chains, project_networks, project_contracts, project_wallets.  
Evidence/verification: evidence_claims, evidence_records, verification_runs, verification_reviews, verification_history, public_passport_snapshots.  
Operations: chain_events, indexer_cursors, monitoring_rules, monitoring_jobs, alerts, audit_logs, api_keys, usage_metrics.

Security:
- RLS on every tenant-owned table.
- Resolve organization membership from authenticated session; never trust organization_id from request JSON.
- Browser uses only publishable/anon key.
- Service role is server-only and used after explicit authorization.
- Operational writes go through server APIs/workers.
- Public reads use only curated public_passport_snapshots where published and parent project visibility is public.
- Never expose reviewer notes, private wallet labels, unpublished claims, API key hashes, or organization metadata publicly.
- Preserve evidence history; write new records for new checks.

Apply migrations in numerical order to a new dedicated Trustchain Supabase project only. Never apply them to UStetu's database.

## 7. API v1 endpoints

All endpoints use JSON envelope:
Success: { "data": ..., "error": null, "meta": { "requestId": "..." } }
Failure: { "data": null, "error": { "code": "...", "message": "..." }, "meta": ... }

| Method | Endpoint | Purpose / access |
|---|---|---|
| GET | /api/v1/chains | Enabled chain registry; public |
| GET, POST | /api/v1/projects | List/create tenant projects |
| GET, PATCH, DELETE | /api/v1/projects/:id | Read/update/archive project |
| GET, POST | /api/v1/projects/:id/networks | Project networks |
| GET, POST | /api/v1/projects/:id/contracts | Contract registry |
| GET, POST | /api/v1/projects/:id/wallets | Wallet attribution |
| GET, POST | /api/v1/projects/:id/checks | Read history / enqueue checks |
| GET, POST | /api/v1/projects/:id/evidence | Read evidence / submit project claim |
| GET, POST | /api/v1/projects/:id/reviews | Read / record manual review; reviewer |
| GET | /api/v1/projects/:id/alerts | Alert feed |
| POST | /api/v1/projects/:id/passport | Generate preview snapshot |
| POST | /api/v1/projects/:id/passport/publish | Publish approved snapshot |
| GET | /api/v1/passport/:slug | Public published passport |
| GET, POST, DELETE | /api/v1/api-keys | API key lifecycle |
| GET | /api/v1/usage | Plan usage |
| POST | /api/v1/billing/checkout | Hosted checkout |
| POST | /api/v1/billing/webhook | Signed provider webhook |

Dashboard routes use Supabase session cookies. External API uses hashed API key lookup, scopes, quotas, and usage metering. Billing webhooks verify signatures and idempotency. Internal worker endpoints are not public.

Status codes: 200 read/update, 201 create, 202 async job accepted, 400 invalid input, 401 unauthenticated, 403 role/plan denied, 404 missing/out-of-tenant, 409 conflict, 422 unsupported check/network, 429 rate limit, 500 unexpected error.

## 8. UI pages

Marketing: /, /pricing, /docs.  
Auth: /login, /signup, /callback.  
Workspace: /dashboard, /projects, /projects/new, /projects/:id, /projects/:id/contracts, /projects/:id/wallets, /evidence, /reviews, /monitoring, /alerts, /api-keys, /billing, /settings.  
Public: /passport/:slug.

Public passport shows project identity, networks, contracts, evidence status, last checked time, verification method, historical changes, and limitations. It never exposes private claims or reviewer notes.

## 9. SaaS entitlements (initial hypotheses, not validated pricing)
- Free: 1 project, 1 network, limited manual refresh, public passport.
- Starter $29/month: 1 project, 3 contracts, weekly checks.
- Growth $99/month: 3 projects, 10 contracts, scheduled monitoring, alerts, starter API quota.
- Business $299/month: 10 projects, 30 contracts, team seats, advanced reports and API quota.
- Enterprise: custom limits, integrations, support, SLA options.

Enforce limits server-side. Meter projects, monitored addresses, verification runs, API requests, and alert deliveries. Sell ongoing monitoring, evidence workflow, reports, and API reliability—not the raw public blockchain facts.

## 10. Task-by-task development plan

### Phase 0 — Environment isolation
1. Confirm TRUSTCHAIN is the only repository being changed.
2. Create dedicated Supabase project.
3. Create dedicated Vercel project.
4. Add independent env vars, domain and RPC provider.
5. Verify no UStetu credentials or write-contract code exists.
Acceptance: Trustchain deploys independently; UStetu deployment/contracts untouched.

### Phase 1 — Database and identity
1. Apply migrations 0001 and 0002 to Trustchain database.
2. Add Supabase server client and session middleware.
3. Implement signup/login/callback/logout.
4. Implement organization creation and owner membership transaction.
5. Implement invites and member roles.
6. Add tenant isolation integration tests.
Acceptance: user A cannot read or mutate organization B data, including by changing IDs.

### Phase 2 — Project registration
1. Build project wizard.
2. Validate name, slug, website and metadata.
3. Add chain selection from enabled registry.
4. Register project networks.
5. Add contract and wallet forms.
6. Detect duplicates by chain_id + normalized address.
7. Persist audit log.
Acceptance: one project registers multiple networks/contracts/wallets; no private-key input exists.

### Phase 3 — Adapters and indexer
1. Finalize EVM adapter interface.
2. Implement Base adapter and unit tests.
3. Implement Ethereum adapter.
4. Add BNB, Polygon, Arbitrum and Optimism behind feature flags.
5. Implement RPC timeout, retry, failover and rate limits.
6. Build cursor-based worker.
7. Add block hash/reorg reconciliation.
8. Add token/contract event decoders.
Acceptance: replay is idempotent, reorg reconciles state, unsupported chain fails closed.

### Phase 4 — Automated verification
1. Build verification run state machine.
2. Add address and bytecode checks.
3. Add explorer source-verification adapter.
4. Add proxy detection and implementation observation.
5. Add ownership/access-control checks with ABI-aware limitations.
6. Add token supply and metadata snapshots.
7. Store evidence, method, engine version and limitations.
8. Add stale evidence scheduler.
Acceptance: every result has chain, subject, method, block/time, source and limitations; inconclusive is never pass.

### Phase 5 — Human review
1. Build reviewer queue.
2. Define claim-specific checklist.
3. Implement approve/reject/request-changes.
4. Store reviewer, rationale and timestamp.
5. Require review for wallet attribution, audit documents and sensitive claims.
6. Publish only eligible evidence.
Acceptance: reviewer cannot edit original observation; decisions are traceable.

### Phase 6 — Passport and monitoring
1. Build public-safe snapshot generator.
2. Build publish/unpublish workflow.
3. Implement public slug route.
4. Add monitoring rule CRUD.
5. Add alert deduplication and severity.
6. Add email/Telegram notifications.
7. Add acknowledgement and audit events.
Acceptance: anonymous visitor sees only published snapshot; private data stays inaccessible.

### Phase 7 — SaaS billing and API
1. Select supported billing provider.
2. Implement hosted checkout/customer portal.
3. Verify webhook signatures and idempotency.
4. Enforce plan entitlements server-side.
5. Implement API key generation/hash-at-rest/one-time display.
6. Add quotas and usage aggregation.
7. Publish API docs and examples.
Acceptance: subscription changes apply only after verified webhook; revoked key stops working immediately.

### Phase 8 — Production readiness
1. Threat model and RLS review.
2. Unit, integration and E2E tests.
3. RPC failure drills.
4. Reorg and worker recovery tests.
5. Backup/restore test.
6. Rate-limit and abuse test.
7. Independent security review.
8. Production deployment and customer onboarding.
Acceptance: no critical/high unresolved issue; recovery runbooks tested.

## 11. MVP definition of done

- Customer signup and organization creation work.
- A project can register multiple EVM networks.
- Base and Ethereum adapters pass integration tests.
- Contract and wallet data persist.
- Automated checks create provenance-backed evidence.
- Reviewer can approve/reject supported claims.
- Public passport publishes safely.
- At least one monitored event class generates alerts.
- Subscription limits are enforced server-side.
- Five pilot customers can use the product without manual DB intervention.

## 12. Initial commercial milestone

First milestone is not every EVM chain. It is five paying pilot customers, weekly evidence refresh, active alert engagement, measurable retention, and at least two renewals after the first billing period. Add chain coverage only when operational reliability is proven.

## 13. Server-only environment variables

- SUPABASE_SERVICE_ROLE_KEY
- BASE_RPC_URL, ETHEREUM_RPC_URL, BNB_RPC_URL, POLYGON_RPC_URL, ARBITRUM_RPC_URL, OPTIMISM_RPC_URL
- EXPLORER_API_KEY_* per provider
- BILLING_SECRET_KEY, BILLING_WEBHOOK_SECRET
- INTERNAL_WORKER_SECRET
- EMAIL_PROVIDER_API_KEY, TELEGRAM_BOT_TOKEN

Public variables may include only NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_APP_URL. Never expose RPC credentials or service-role key through NEXT_PUBLIC variables.

---
Decision: Trustchain by BlesProduction · Multi-chain EVM · Hybrid automated/manual verification · Independent from UStetu.
