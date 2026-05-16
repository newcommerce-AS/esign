#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createSigningRequestTool } from "./tools/create-signing-request.js";
import { getStatusTool } from "./tools/get-signing-status.js";
import { cancelTool } from "./tools/cancel-signing-request.js";
import { downloadTool } from "./tools/download-signed-document.js";

const tools = [createSigningRequestTool, getStatusTool, cancelTool, downloadTool];

const server = new Server({ name: "esign-mcp", version: "0.1.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = tools.find((t) => t.name === req.params.name);
  if (!tool) throw new Error(`Unknown tool ${req.params.name}`);
  try {
    const result = await tool.execute(req.params.arguments ?? {});
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
  }
});

await server.connect(new StdioServerTransport());
