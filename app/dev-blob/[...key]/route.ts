import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  // Each segment arrives already URL-decoded by Next.js
  const filePath = path.join(process.cwd(), ".dev-blobs", ...key);
  if (!existsSync(filePath)) {
    return new NextResponse("not found", { status: 404 });
  }
  const body = readFileSync(filePath);
  let contentType = "application/pdf";
  const ctFile = filePath + ".content-type";
  if (existsSync(ctFile)) contentType = readFileSync(ctFile, "utf8");
  return new NextResponse(body, { headers: { "content-type": contentType } });
}
