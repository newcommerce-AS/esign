import { api, type CreateInput } from "../api-client.js";

export const createSigningRequestTool = {
  name: "create_signing_request",
  description: "Create a new signing request. Returns confirm_url (where the sender reviews the document and clicks Bekreft), confirm_api_url + a confirm_token an agent can pass to confirm_signing_request to release the invitation emails programmatically, and a sender_lookup_token for later status queries. No invitations go out until the request is confirmed.",
  inputSchema: {
    type: "object",
    properties: {
      sender_email: { type: "string", format: "email" },
      sender_name: { type: "string" },
      document: {
        type: "object",
        properties: {
          filename: { type: "string" },
          format: { type: "string", enum: ["pdf", "markdown", "text"] },
          content_base64: { type: "string" },
        },
        required: ["filename", "format", "content_base64"],
      },
      signers: {
        type: "array",
        minItems: 1, maxItems: 10,
        items: {
          type: "object",
          properties: {
            name: { type: "string" }, email: { type: "string", format: "email" }, phone: { type: "string" },
          },
          required: ["name", "email"],
        },
      },
      expires_in_days: { type: "integer", minimum: 1, maximum: 60 },
      webhook_url: { type: "string", format: "uri" },
      metadata: { type: "object" },
    },
    required: ["sender_email", "document", "signers"],
  },
  async execute(args: Record<string, unknown>) {
    const input = args as unknown as CreateInput;
    if (!input.sender_email && process.env.ESIGN_DEFAULT_SENDER_EMAIL) input.sender_email = process.env.ESIGN_DEFAULT_SENDER_EMAIL;
    return await api.create(input);
  },
};
