import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

/** 나의 기부내역 조회 — 기부코드 기반. 원본 이름은 응답에 포함되지 않습니다. */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code")?.trim() ?? "";
  if (!/^D-?[0-9A-Fa-f]{8}$/.test(code)) {
    return NextResponse.json({ error: "기부코드 형식은 D-XXXXXXXX(영문·숫자 8자리)입니다." }, { status: 400 });
  }
  const result = await getRepository().findMyDonations(code);
  if (!result) return NextResponse.json({ error: "해당 기부코드의 내역이 없습니다." }, { status: 404 });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
