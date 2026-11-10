import { NextResponse } from "next/server";
import { FEATURED_DONATIONS, FEATURED_EVERY, mixFeatured } from "@/lib/featured-donations";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

/** 실시간 기부 티커용 — 최근 기부(가명처리) + 지정 내역(featured-donations.ts) */
export async function GET() {
  const items = mixFeatured(await getRepository().getLiveDonations(Date.now(), FEATURED_DONATIONS.length * FEATURED_EVERY));
  return NextResponse.json({ items, at: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
