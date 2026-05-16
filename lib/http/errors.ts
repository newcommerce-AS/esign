import { NextResponse } from "next/server";

export function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}
