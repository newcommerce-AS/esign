# @newcommerce/esign-mcp

MCP server that gives any MCP-compatible AI agent (Claude Desktop, Claude Code, etc.) the ability to orchestrate e-signing via [esign.newcommerce.no](https://esign.newcommerce.no).

## Install

```bash
npm install -g @newcommerce/esign-mcp
```

## Claude Desktop config

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "esign": {
      "command": "esign-mcp",
      "env": {
        "ESIGN_API_BASE_URL": "https://esign.newcommerce.no/api/v1",
        "ESIGN_DEFAULT_SENDER_EMAIL": "you@example.com"
      }
    }
  }
}
```

## Tools

- `create_signing_request` — kick off a new signing flow.
- `confirm_signing_request` — release the invitation emails (the sender confirm step), using the `confirm_token` from create.
- `get_signing_status` — see progress (needs sender_lookup_token).
- `cancel_signing_request` — cancel before completion.

The signed PDF is delivered only by email. To process it from an AI agent, use a Gmail/IMAP MCP server to fetch the attachment from the recipient's inbox.

The flow: agent calls `create_signing_request` → the sender receives a confirmation email and opens `confirm_url`, where they review the document and click **Bekreft** (or an agent calls `confirm_signing_request` with the `confirm_token`) → signers receive invitations → when all signers sign, the final PDF is emailed to everyone and all data is immediately deleted from our servers.

> Confirmation never happens on a plain GET — opening `confirm_url` only shows a preview. Releasing the invitations requires the explicit **Bekreft** action (a `POST` to `confirm_api_url`), so link prefetchers and email scanners can't trigger it.
