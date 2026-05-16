const BASE = process.env.ESIGN_API_BASE_URL ?? "https://esign.newcommerce.no/api/v1";
async function request(path, init = {}) {
    const res = await fetch(`${BASE}${path}`, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok)
        throw new Error(`${res.status} ${body?.error?.code ?? ""}: ${body?.error?.message ?? "request failed"}`);
    return body;
}
export const api = {
    create: (b) => request("/signing-requests", { method: "POST", body: JSON.stringify(b) }),
    status: (id, token) => request(`/signing-requests/${id}`, { headers: { "x-lookup-token": token } }),
    cancel: (id, token) => request(`/signing-requests/${id}/cancel`, { method: "POST", headers: { "x-lookup-token": token } }),
    downloadFinal: async (documentId, token) => {
        const res = await fetch(`${BASE}/documents/${documentId}/final`, { headers: { "x-lookup-token": token } });
        if (!res.ok)
            throw new Error(`${res.status}: download failed`);
        const buf = await res.arrayBuffer();
        return Buffer.from(buf).toString("base64");
    },
};
