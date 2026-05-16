const BASE = process.env.ESIGN_API_BASE_URL ?? "https://esign.newcommerce.no/api/v1";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${body?.error?.code ?? ""}: ${body?.error?.message ?? "request failed"}`);
  return body as T;
}

export interface CreateInput {
  sender_email: string; sender_name?: string;
  document: { filename: string; format: "pdf" | "markdown" | "text"; content_base64: string };
  signers: { name: string; email: string; phone?: string }[];
  expires_in_days?: number; webhook_url?: string; metadata?: Record<string, unknown>;
}

export const api = {
  create: (b: CreateInput) => request<unknown>("/signing-requests", { method: "POST", body: JSON.stringify(b) }),
  status: (id: string, token: string) => request<unknown>(`/signing-requests/${id}`, { headers: { "x-lookup-token": token } }),
  cancel: (id: string, token: string) => request<unknown>(`/signing-requests/${id}/cancel`, { method: "POST", headers: { "x-lookup-token": token } }),
  downloadFinal: async (documentId: string, token: string) => {
    const res = await fetch(`${BASE}/documents/${documentId}/final`, { headers: { "x-lookup-token": token } });
    if (!res.ok) throw new Error(`${res.status}: download failed`);
    const buf = await res.arrayBuffer();
    return Buffer.from(buf).toString("base64");
  },
};
