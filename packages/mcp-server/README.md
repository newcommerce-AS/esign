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
- `get_signing_status` — see progress (needs sender_lookup_token).
- `cancel_signing_request` — cancel before completion.
- `download_signed_document` — fetch the final signed PDF when done.

The flow: agent calls `create_signing_request` → user receives a confirmation email → user clicks the `confirm_url` (also returned in the tool response) → signers receive invitations → when all signers sign, the final PDF is emailed to everyone.
