# esign

Free AI-agent-friendly e-signature SaaS.

- **Web:** https://esign.newcommerce.no
- **API:** `POST https://esign.newcommerce.no/api/v1/signing-requests`
- **MCP server:** `npm i -g @newcommerce/esign-mcp` ([README](packages/mcp-server/README.md))

## Local development

```bash
pnpm install
cp .env.example .env.local
# fill in Neon, Resend, Twilio, Upstash, Blob creds
pnpm db:push
pnpm dev
```

## Deployment

1. Connect this repo to Vercel; set env vars from `.env.example`.
2. Provision: Neon Postgres, Resend (verify `esign.newcommerce.no` domain with DKIM/SPF/DMARC), Twilio number, Upstash Redis.
3. `vercel.json` configures hourly expire + daily retention cron.
4. Publish the MCP server: `pnpm -F @newcommerce/esign-mcp build && pnpm -F @newcommerce/esign-mcp publish --access public`.

## Spec

See `docs/superpowers/specs/2026-05-16-esign-design.md`.
