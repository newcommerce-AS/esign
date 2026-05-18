import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db/client";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  const status: Record<string, unknown> = {
    ok: true,
    version: process.env.APP_VERSION ?? "unknown",
    checks: {} as Record<string, string>,
  };
  try {
    await initDb();
    await db.execute(sql`select 1`);
    (status.checks as Record<string, string>).db = "ok";
  } catch {
    status.ok = false;
    (status.checks as Record<string, string>).db = "fail";
  }
  (status.checks as Record<string, string>).resend = process.env.RESEND_API_KEY ? "configured" : "missing";
  (status.checks as Record<string, string>).blob = process.env.BLOB_READ_WRITE_TOKEN ? "configured" : "missing";
  (status.checks as Record<string, string>).twilio = process.env.TWILIO_ACCOUNT_SID ? "configured" : "missing (SMS disabled)";
  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
