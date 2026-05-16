import { api } from "../api-client.js";
export const downloadTool = {
    name: "download_signed_document",
    description: "Download the final signed PDF as base64. The request must be in status 'completed'. Requires the document_id (from get_signing_status) and the sender_lookup_token.",
    inputSchema: {
        type: "object",
        properties: {
            document_id: { type: "string", format: "uuid" },
            sender_lookup_token: { type: "string" },
        },
        required: ["document_id", "sender_lookup_token"],
    },
    async execute(args) {
        const content_base64 = await api.downloadFinal(args.document_id, args.sender_lookup_token);
        return { content_base64, filename: "signed.pdf" };
    },
};
