export interface CreateInput {
    sender_email: string;
    sender_name?: string;
    document: {
        filename: string;
        format: "pdf" | "markdown" | "text";
        content_base64: string;
    };
    signers: {
        name: string;
        email: string;
        phone?: string;
    }[];
    expires_in_days?: number;
    webhook_url?: string;
    metadata?: Record<string, unknown>;
}
export declare const api: {
    create: (b: CreateInput) => Promise<unknown>;
    status: (id: string, token: string) => Promise<unknown>;
    cancel: (id: string, token: string) => Promise<unknown>;
    downloadFinal: (documentId: string, token: string) => Promise<string>;
};
