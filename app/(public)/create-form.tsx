"use client";
import { useState } from "react";

export function CreateForm() {
  const [file, setFile] = useState<File | null>(null);
  const [senderEmail, setSenderEmail] = useState("");
  const [signers, setSigners] = useState([{ name: "", email: "", phone: "" }]);
  const [result, setResult] = useState<{ confirm_url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Velg et dokument");
    setSubmitting(true); setError(null);
    const format = file.name.endsWith(".pdf") ? "pdf" : file.name.endsWith(".md") ? "markdown" : "text";
    const buf = await file.arrayBuffer();
    const content_base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const res = await fetch("/api/v1/signing-requests", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sender_email: senderEmail,
        document: { filename: file.name, format, content_base64 },
        signers: signers.filter((s) => s.email).map((s) => ({ name: s.name, email: s.email, phone: s.phone || undefined })),
      }),
    });
    setSubmitting(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j?.error?.message ?? "Feil"); return; }
    setResult(await res.json());
  }

  if (result) return (
    <div className="mt-6 p-4 border rounded bg-green-50">
      <p className="font-medium">Sjekk innboksen din ({senderEmail}) og klikk bekreftelseslenken for å sende invitasjon til signantene.</p>
      <p className="text-sm mt-2 break-all">Eller åpne direkte: <a className="underline" href={result.confirm_url}>{result.confirm_url}</a></p>
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium">Din e-post (avsender)</label>
        <input required type="email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium">Dokument (PDF, Markdown eller tekst)</label>
        <input required type="file" accept=".pdf,.md,.txt,.text" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 w-full" />
      </div>
      <div>
        <label className="block text-sm font-medium">Signanter</label>
        {signers.map((s, i) => (
          <div key={i} className="mt-2 flex gap-2">
            <input placeholder="Navn" value={s.name} onChange={(e) => { const c = [...signers]; c[i].name = e.target.value; setSigners(c); }} className="border rounded px-3 py-2 flex-1" />
            <input placeholder="E-post" type="email" value={s.email} onChange={(e) => { const c = [...signers]; c[i].email = e.target.value; setSigners(c); }} className="border rounded px-3 py-2 flex-1" />
            <input placeholder="+47... (valgfri SMS)" value={s.phone} onChange={(e) => { const c = [...signers]; c[i].phone = e.target.value; setSigners(c); }} className="border rounded px-3 py-2 flex-1" />
          </div>
        ))}
        <button type="button" onClick={() => setSigners([...signers, { name: "", email: "", phone: "" }])} className="mt-2 text-sm underline">+ legg til signant</button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={submitting} className="bg-black text-white px-4 py-2 rounded disabled:opacity-50">{submitting ? "Sender..." : "Send til bekreftelse"}</button>
    </form>
  );
}
