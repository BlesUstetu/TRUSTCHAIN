# Trustchain

Web3 Project Transparency & Monitoring Platform.

Trustchain collects, verifies, and presents evidence about Web3 project contracts, token activity, treasury wallets, and operational changes. It reports observable facts and project-supplied claims separately; it does not certify that a project or token is safe.

## Initial scope

- Base-first project registration
- Contract and wallet registry
- Evidence ledger with provenance and timestamps
- Public project passport
- Monitoring worker and alert pipeline
- Multi-tenant SaaS foundation

## Status

Initial repository scaffold is being established. Production monitoring, billing, and security review are not yet complete.

## Development

Requirements: Node.js 20+

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure Supabase using `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Never expose service-role keys in the browser.

## Security principles

- Never request or store user private keys.
- Separate project-reported claims from independently observed chain data.
- Preserve verification history; do not silently overwrite evidence.
- Treat all on-chain and user-submitted content as untrusted input.
- Do not describe a project as safe solely because a contract is verified.

## License

Proprietary until a license is explicitly added.