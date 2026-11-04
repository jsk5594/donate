import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

/** 실시간 기부 티커용 — 최근 12건(가명처리) */
export async function GET() {
  const items = await getRepository().getLiveDonations(Date.now(), 12);
  return NextResponse.json({ items, at: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
