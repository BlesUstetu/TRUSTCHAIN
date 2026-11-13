# Trustchain API Contract v1

Base path: /api/v1.

## Authentication
- Dashboard: Supabase authenticated session.
- External API: Authorization: Bearer tc_live_<secret>; only the hash is stored.
- Public: no authentication, published data only.
- Internal workers: signed internal request; never expose worker credentials to browsers.

## Response envelope
Success: { "data": {}, "error": null, "meta": { "requestId": "..." } }
Failure: { "data": null, "error": { "code": "VALIDATION_ERROR", "message": "..." }, "meta": { "requestId": "..." } }

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /chains | Public | Enabled chain registry |
| GET, POST | /projects | Session | List/create projects |
| GET, PATCH, DELETE | /projects/:id | Session + role | Project detail/update/archive |
| GET, POST | /projects/:id/networks | Session + role | Project EVM networks |
| GET, POST | /projects/:id/contracts | Session + role | Contract registry |
| GET, POST | /projects/:id/wallets | Session + role | Wallet attribution |
| GET, POST | /projects/:id/checks | Session/API key | Read history / enqueue check |
| GET, POST | /projects/:id/evidence | Session | Read evidence / submit project claim |
| GET, POST | /projects/:id/reviews | Reviewer | Read queue / record review decision |
| GET | /projects/:id/alerts | Session/API key | Alert feed |
| POST | /projects/:id/passport | Admin | Generate preview snapshot |
| POST | /projects/:id/passport/publish | Admin | Publish approved snapshot |
| GET | /passport/:slug | Public | Published passport only |
| GET, POST, DELETE | /api-keys | Owner/admin | API key lifecycle |
| GET | /usage | Admin | Plan usage |
| POST | /billing/checkout | Admin | Hosted checkout |
| POST | /billing/webhook | Signed provider | Billing event receiver |

## Request examples

Create project:
```json
{ "name": "Example Protocol", "slug": "example-protocol", "websiteUrl": "https://example.org", "description": "Project description" }
```

Add network:
```json
{ "chainId": 8453 }
```

Register contract:
```json
{ "chainId": 8453, "address": "0x0000000000000000000000000000000000000000", "label": "Token", "contractType": "erc20" }
```

Queue verification:
```json
{ "chainId": 8453, "subjectType": "contract", "subjectAddress": "0x0000000000000000000000000000000000000000", "checks": ["bytecode_presence", "proxy_detection", "source_verification"] }
```
Return HTTP 202 with a verification run ID. Checks execute asynchronously.

Manual review decision:
```json
{ "verificationRunId": "00000000-0000-0000-0000-000000000000", "decision": "request_changes", "checklist": { "sourceAuthenticity": true, "scopeMatchesClaim": false }, "notes": "The submitted audit does not cover the registered implementation address." }
```

## Authorization requirements
- Never trust organization_id from request JSON; derive from authenticated membership.
- Check role and subscription entitlement on every write.
- Use idempotency keys for job enqueue and billing operations.
- Return 404 for resources outside the current tenant to prevent ID enumeration.
- Apply per-user, per-organization and per-API-key rate limits.
- Public passport reads only curated published snapshots.
- Never return internal reviewer notes or API key hashes.
