"use client";
import { useEffect, useState } from "react";

interface Loaded {
  signing_request_id: string;
  document: { id: string; filename: string; url: string; sha256: string };
  signer: { id: string; name: string; email: string; status: string; sms_required: boolean; sms_verified: boolean };
  sender: { email: string; name: string | null };
  expires_at: string;
}

export function SignerView({ signToken }: { signToken: string }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [smsCode, setSmsCode] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"signed" | "declined" | null>(null);

  useEffect(() => {
    fetch(`/api/v1/sign/${signToken}`).then((r) => r.json()).then((j) => {
      if (j.error) setError(j.error.message); else { setData(j); setName(j.signer.name); }
    });
  }, [signToken]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p>Laster…</p>;
  if (done === "signed") return <p className="p-4 bg-green-50 border rounded">Takk! Dokumentet er signert. Du får signert PDF på e-post når alle har signert.</p>;
  if (done === "declined") return <p className="p-4 bg-yellow-50 border rounded">Du har avvist å signere. Avsender er varslet.</p>;

  const smsNeeded = data.signer.sms_required && !data.signer.sms_verified;
  const canSign = !smsNeeded && consent && name.trim().length > 0;

  return (
    <>
      <h1 className="text-2xl font-semibold">{data.sender.email} har sendt deg <em>{data.document.filename}</em> til signering</h1>
      <iframe src={data.document.url} className="w-full h-[600px] border mt-4" />
      <p className="mt-2 text-xs text-gray-500">SHA-256: <code>{data.document.sha256}</code></p>

      {smsNeeded && (
        <div className="mt-6 p-4 border rounded">
          <p className="text-sm">SMS-verifisering kreves for denne signaturen.</p>
          {!smsSent ? (
            <button className="mt-2 underline" onClick={async () => { await fetch(`/api/v1/sign/${signToken}/sms/send`, { method: "POST" }); setSmsSent(true); }}>Send SMS-kode</button>
          ) : (
            <div className="mt-2 flex gap-2">
              <input value={smsCode} onChange={(e) => setSmsCode(e.target.value)} placeholder="6-sifret kode" className="border rounded px-3 py-2" />
              <button className="bg-black text-white px-3 py-2 rounded" onClick={async () => {
                const r = await fetch(`/api/v1/sign/${signToken}/sms/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: smsCode }) });
                if (r.ok) location.reload();
                else { const j = await r.json(); setError(j.error?.message ?? "Ugyldig kode"); }
              }}>Verifiser</button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <label className="block">Skriv ditt fulle navn:
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 border rounded px-3 py-2 w-full" />
        </label>
        <label className="flex gap-2 items-start text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>Jeg, {name || "[navn]"}, samtykker til innholdet i dette dokumentet og signerer det elektronisk.</span>
        </label>
        <div className="flex gap-2">
          <button disabled={!canSign || submitting} className="bg-black text-white px-4 py-2 rounded disabled:opacity-50" onClick={async () => {
            setSubmitting(true);
            const r = await fetch(`/api/v1/sign/${signToken}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, consent: true }) });
            setSubmitting(false);
            if (r.ok) setDone("signed"); else { const j = await r.json(); setError(j.error?.message ?? "Feil"); }
          }}>Signer</button>
          <button className="px-4 py-2 border rounded" onClick={async () => {
            const reason = prompt("Begrunnelse for å avvise:");
            if (!reason) return;
            const r = await fetch(`/api/v1/sign/${signToken}/decline`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) });
            if (r.ok) setDone("declined");
          }}>Avvis</button>
        </div>
      </div>
    </>
  );
}
