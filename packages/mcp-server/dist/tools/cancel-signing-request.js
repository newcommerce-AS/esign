import { api } from "../api-client.js";
export const cancelTool = {
    name: "cancel_signing_request",
    description: "Cancel a signing request. Requires the sender_lookup_token. Cannot cancel completed/cancelled/expired requests.",
    inputSchema: {
        type: "object",
        properties: {
            signing_request_id: { type: "string", format: "uuid" },
            sender_lookup_token: { type: "string" },
            reason: { type: "string" },
        },
        required: ["signing_request_id", "sender_lookup_token"],
    },
    async execute(args) {
        return await api.cancel(args.signing_request_id, args.sender_lookup_token);
    },
};
