# Trustchain Security Model

## Trust boundaries
1. Browser is untrusted.
2. Customer metadata and documents are untrusted.
3. RPC responses are external input and can be incomplete or inconsistent.
4. Worker queue payloads must be schema-validated.
5. Public passport is a curated projection, not a database dump.

## Secrets
Service-role key, RPC provider credentials, billing secrets, worker secret and notification tokens are server-only. Never commit .env.local or secrets. Rotate any credential exposed in logs or repository history.

## Tenant isolation
Every customer-owned record carries organization_id. Resolve access from authenticated membership. RLS is defense in depth; server routes also perform explicit authorization. Never use client-supplied organization_id as authorization.

## Verification integrity
Store check method, engine version, subject, chain, block, timestamp, source and limitations. Preserve historical records. Manual decisions append a review record and cannot rewrite the underlying observation.

## Public data
Only publish a deliberately constructed passport snapshot. Never include private wallet labels, internal reviewer notes, unpublished claims, customer email, API key material, or internal metadata.

## Blockchain limitations
Bytecode presence is not source verification. Source verification is not an audit. Account for proxy implementations and privileged roles. Use chain-specific finality and reorg handling. Mark checks inconclusive when data is unavailable.

## Abuse prevention
Rate limit public endpoints and API keys. Validate addresses and URLs. Restrict outbound URL fetching to prevent SSRF. Limit document type and size. Sanitize rendered content. Verify webhook signatures and deduplicate events.

## Production gate
Require tenant isolation tests, secret scanning, dependency review, RPC failure tests, worker recovery tests, backup restore, rate limiting and independent security review before production billing.
