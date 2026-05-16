import { NextRequest, NextResponse } from "next/server";
import { confirmSender } from "@/lib/services/confirm-sender";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ confirm_token: string }> }) {
  const { confirm_token } = await params;
  const result = await confirmSender(confirm_token, process.env.APP_BASE_URL!);
  if (!result.ok) {
    const message = result.reason === "already_confirmed" ? "Allerede bekreftet." : result.reason === "not_found" ? "Ugyldig eller utløpt bekreftelseslenke." : "Kan ikke bekrefte i nåværende tilstand.";
    return new NextResponse(htmlPage("Kunne ikke bekrefte", message), { status: 400, headers: { "content-type": "text/html; charset=utf-8" } });
  }
  return new NextResponse(htmlPage("Bekreftet ✓", "Signantene har nå mottatt invitasjonen sin på e-post."), { headers: { "content-type": "text/html; charset=utf-8" } });
}

function htmlPage(title: string, message: string) {
  return `<!doctype html><html lang="nb"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:system-ui;max-width:560px;margin:80px auto;padding:0 20px;line-height:1.5}h1{font-size:24px}</style></head><body><h1>${title}</h1><p>${message}</p></body></html>`;
}
