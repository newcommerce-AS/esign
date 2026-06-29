import { api } from "../api-client.js";

export const confirmSigningRequestTool = {
  name: "confirm_signing_request",
  description: "Confirm a pending signing request — the sender step that releases the invitation emails to the signers. Equivalent to the sender reviewing the document and clicking 'Bekreft' on the confirm page. Takes the confirm_token from the create_signing_request response (the last path segment of confirm_url / confirm_api_url). Idempotent: confirming an already-active request succeeds.",
  inputSchema: {
    type: "object",
    properties: {
      confirm_token: { type: "string", description: "The token from confirm_url / confirm_api_url returned by create_signing_request." },
    },
    required: ["confirm_token"],
  },
  async execute(args: Record<string, unknown>) {
    return await api.confirm(args.confirm_token as string);
  },
};
