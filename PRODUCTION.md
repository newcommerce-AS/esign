# Production Deployment Guide

Free-tier production deployment for `esign.newcommerce.no` on Vercel Hobby.

---

## Free-tier services to provision

| Service | URL | Plan | What we use | Free-tier limits |
|---|---|---|---|---|
| Neon Postgres | https://neon.tech | Free | Primary DB + rate limiting | 0.5 GB storage |
| Vercel Blob | (Vercel dashboard → Storage) | Hobby | PDF storage | 1 GB storage / 10 GB bw |
| Resend | https://resend.com | Free | Outbound email | 3 000/mo, 100/day, 1 verified domain |
| Twilio | https://twilio.com | Pay-as-you-go | SMS verification (optional) | No free tier; ~$15 trial credit |

> **Rate-limiting uses our existing Postgres database (Neon) — no separate Redis service needed.**

> **Twilio is optional.** The app works fully without it — signer phone numbers are simply rejected at create-time with a clear error. Enable SMS later by adding the three Twilio env vars.

---

## Deployment steps (in order)

1. **Create Vercel project** — import this repo from GitHub in the Vercel dashboard. Do not deploy yet.

2. **Provision Neon** — create a free project at https://neon.tech. Copy the connection string (`postgresql://...`).

3. **Provision Vercel Blob** — in the Vercel dashboard, go to the project → Storage → Create → Blob store. The token is injected automatically into the project env as `BLOB_READ_WRITE_TOKEN`.

4. **Provision Resend** — create a free account at https://resend.com. Add `esign.newcommerce.no` as a domain and follow the DNS instructions (DKIM/SPF/DMARC — Resend gives exact values to paste at your domain registrar). Copy the API key.

5. **(Optional) Provision Twilio** — create an account, buy a Norwegian number, note the Account SID, Auth Token, and phone number. Skip entirely to disable SMS.

6. **Set env vars in Vercel project settings** (Settings → Environment Variables):

   | Variable | Value | Required |
   |---|---|---|
   | `DATABASE_URL` | Neon connection string | Yes |
   | `BLOB_READ_WRITE_TOKEN` | Auto-injected by Vercel Blob | Yes |
   | `RESEND_API_KEY` | From Resend dashboard | Yes |
   | `RESEND_FROM_ADDRESS` | `no-reply@esign.newcommerce.no` | Yes |
   | `APP_BASE_URL` | `https://esign.newcommerce.no` | Yes |
   | `APP_VERSION` | `$VERCEL_GIT_COMMIT_SHA` (use Vercel system env) | Recommended |
   | `CRON_SECRET` | Run `openssl rand -hex 32` and paste value | Yes |
   | `TWILIO_ACCOUNT_SID` | From Twilio console | Optional |
   | `TWILIO_AUTH_TOKEN` | From Twilio console | Optional |
   | `TWILIO_FROM_NUMBER` | E.g. `+4712345678` | Optional |

7. **Run DB migrations locally against production** — before the first deploy (and after any schema change), run:

   ```bash
   DATABASE_URL="<your-neon-url>" pnpm db:migrate
   ```

   Do **not** add `db:migrate` to the Vercel build command — running migrations on every deploy is risky. Migrations are an out-of-band manual step.

8. **Configure DNS** — add a `CNAME` record: `esign → cname.vercel-dns.com`. Vercel will prompt you to verify the domain.

9. **Trigger first deploy** — Vercel auto-deploys when the GitHub connection is active. Or click "Deploy" in the dashboard.

10. **Verify deploy**:

    ```bash
    curl https://esign.newcommerce.no/api/healthz
    ```

    Expected response:
    ```json
    {
      "ok": true,
      "version": "<commit-sha>",
      "checks": {
        "db": "ok",
        "resend": "configured",
        "blob": "configured",
        "twilio": "configured"
      }
    }
    ```

    If Twilio is not configured, `twilio` will show `"missing (SMS disabled)"` and `ok` will still be `true`.

11. **Smoke-test** — create a real signing request from the UI using your own email as sender and a test email as signer. Confirm the flow end-to-end.

12. **Publish MCP package** (optional) — if you want the npm-installable MCP server:

    ```bash
    npm login
    cd packages/mcp-server
    pnpm build
    pnpm publish --access public
    ```

---

## Post-deploy

- Watch logs: `vercel logs --follow` or in the Vercel dashboard.
- Update Trello / `pending_for_ole.md` with go-live status.

---

## Free-tier headroom estimates

| Resource | Limit | Typical usage | Runway |
|---|---|---|---|
| Neon storage | 0.5 GB | ~10 KB per request (metadata only; blobs deleted on completion) | ~50 000 signing requests |
| Resend | 3 000 emails/mo | ~3 emails per flow (confirm + invite(s) + completion) | ~1 000 flows/mo |
| Vercel Blob | 1 GB storage, 10 GB bw | PDFs deleted after completion; bandwidth per signing flow | Well within limits for low-volume use |

---

## Vercel Hobby plan note

The Hobby plan TOS is for personal, non-commercial use. For a free internal tool with no monetisation this is fine. If you ever charge for the service, upgrade to Pro ($20/mo) to remain compliant. Alternatives: Cloudflare Pages (generous free tier, slightly more Next.js setup), Netlify, Fly.io.

---

## CSP (v1.1 TODO)

A Content Security Policy header was intentionally left out of v1.0 — it is brittle without testing across all pages and email redirect flows. Add it as a follow-up once the app is stable in production and you can iterate on the policy with `report-only` mode first.
