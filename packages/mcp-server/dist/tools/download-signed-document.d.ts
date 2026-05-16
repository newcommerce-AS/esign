export declare const downloadTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            document_id: {
                type: string;
                format: string;
            };
            sender_lookup_token: {
                type: string;
            };
        };
        required: string[];
    };
    execute(args: Record<string, unknown>): Promise<{
        content_base64: string;
        filename: string;
    }>;
};
