export declare const getStatusTool: {
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
        };
        required: string[];
    };
    execute(args: Record<string, unknown>): Promise<unknown>;
};
