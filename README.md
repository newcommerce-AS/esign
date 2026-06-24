# esign

Free AI-agent-friendly e-signature SaaS.

- **Web:** https://esign.newcommerce.no
- **API:** `POST https://esign.newcommerce.no/api/v1/signing-requests`
- **MCP server:** `npm i -g @newcommerce/esign-mcp` ([README](packages/mcp-server/README.md))

## Local development

```bash
pnpm install
cp .env.example .env.local
# fill in Neon, Resend, Twilio, Blob creds
pnpm db:push
pnpm dev
```

## Local testing without external services

If you want to test the full signing flow locally without provisioning Neon, Resend, Twilio, or Vercel Blob, just leave the relevant env vars unset:

- **No `DATABASE_URL`** — uses PGlite (embedded Postgres) at `.dev-db/`. Migrations apply automatically on first start.
- **No `BLOB_READ_WRITE_TOKEN`** — writes rendered PDFs to `.dev-blobs/`, served at `http://localhost:3000/dev-blob/<key>`.
- **No `RESEND_API_KEY`** — emails log to terminal and write rendered HTML to `.dev-mail/<timestamp>-<to>.html` so you can open them in a browser.
- **No `TWILIO_ACCOUNT_SID`** — SMS codes log to terminal.

So the minimal local-test path is just:

```bash
pnpm install
pnpm dev
```

Visit http://localhost:3000, create a signing request with your own email as the sender and any two as signers, then open `.dev-mail/` to find the confirmation link and click it (or copy the `confirm_url` directly from the JSON response). Each signer's invite link is also in `.dev-mail/`.

## License

[AGPL-3.0](LICENSE) © 2026 newcommerce AS

The AGPL means: you can use, modify, and self-host this freely, but if you host it as a service for others, you must release your modifications under the same license. This protects esign from being commercialized by a third party who keeps improvements private.

## Deployment

See [PRODUCTION.md](PRODUCTION.md) for the full free-tier production deployment guide.

## Spec

See `docs/superpowers/specs/2026-05-16-esign-design.md`.

<!-- orchestrator dryrun OK -->
