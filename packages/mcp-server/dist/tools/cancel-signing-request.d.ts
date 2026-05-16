export declare const cancelTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            signing_request_id: {
                type: string;
                format: string;
            };
            sender_lookup_token: {
                type: string;
            };
            reason: {
                type: string;
            };
        };
        required: string[];
    };
    execute(args: Record<string, unknown>): Promise<unknown>;
};
