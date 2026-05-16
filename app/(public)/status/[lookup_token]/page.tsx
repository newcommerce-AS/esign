"use client";
import { useState } from "react";
import { useParams } from "next/navigation";

export default function StatusPage() {
  const params = useParams<{ lookup_token: string }>();
  const lookup_token = params.lookup_token;
  const [id, setId] = useState("");
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const r = await fetch(`/api/v1/signing-requests/${id}`, { headers: { "x-lookup-token": lookup_token } });
    if (r.ok) setData(await r.json()); else { const j = await r.json(); setError(j.error?.message); }
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Status</h1>
      <p className="text-sm text-gray-600 mt-2">Skriv inn signing-request ID for å se status.</p>
      <div className="mt-4 flex gap-2">
        <input value={id} onChange={(e) => setId(e.target.value)} placeholder="uuid" className="border rounded px-3 py-2 flex-1" />
        <button className="bg-black text-white px-4 py-2 rounded" onClick={load}>Hent</button>
      </div>
      {error && <p className="text-red-600 mt-3">{error}</p>}
      {data ? <pre className="mt-4 text-xs bg-gray-50 p-4 overflow-auto">{JSON.stringify(data, null, 2)}</pre> : null}
    </main>
  );
}
