export declare const createSigningRequestTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            sender_email: {
                type: string;
                format: string;
            };
            sender_name: {
                type: string;
            };
            document: {
                type: string;
                properties: {
                    filename: {
                        type: string;
                    };
                    format: {
                        type: string;
                        enum: string[];
                    };
                    content_base64: {
                        type: string;
                    };
                };
                required: string[];
            };
            signers: {
                type: string;
                minItems: number;
                maxItems: number;
                items: {
                    type: string;
                    properties: {
                        name: {
                            type: string;
                        };
                        email: {
                            type: string;
                            format: string;
                        };
                        phone: {
                            type: string;
                        };
                    };
                    required: string[];
                };
            };
            expires_in_days: {
                type: string;
                minimum: number;
                maximum: number;
            };
            webhook_url: {
                type: string;
                format: string;
            };
            metadata: {
                type: string;
            };
        };
        required: string[];
    };
    execute(args: Record<string, unknown>): Promise<unknown>;
};
