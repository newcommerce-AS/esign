import { api } from "../api-client.js";

export const downloadTool = {
  name: "download_signed_document",
  description: "Download the final signed PDF as base64. The request must be in status 'completed'. The document_id is on the `document.id` field of get_signing_status's response. Requires the sender_lookup_token.",
  inputSchema: {
    type: "object",
    properties: {
      document_id: { type: "string", format: "uuid" },
      sender_lookup_token: { type: "string" },
    },
    required: ["document_id", "sender_lookup_token"],
  },
  async execute(args: Record<string, unknown>) {
    const content_base64 = await api.downloadFinal(args.document_id as string, args.sender_lookup_token as string);
    return { content_base64, filename: "signed.pdf" };
  },
};
