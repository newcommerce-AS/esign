import { api } from "../api-client.js";
export const getStatusTool = {
    name: "get_signing_status",
    description: "Get the current status of a signing request (sender-side view). Requires the sender_lookup_token returned at creation.",
    inputSchema: {
        type: "object",
        properties: {
            signing_request_id: { type: "string", format: "uuid" },
            sender_lookup_token: { type: "string" },
        },
        required: ["signing_request_id", "sender_lookup_token"],
    },
    async execute(args) {
        return await api.status(args.signing_request_id, args.sender_lookup_token);
    },
};
