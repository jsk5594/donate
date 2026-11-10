import { NextResponse } from "next/server";
import { auditPurpose } from "@/lib/ai/purpose-audit";

export const dynamic = "force-dynamic";

/** 모집건 하나의 모집 목적 부합 점검(AI, 키 없으면 규칙 기반) */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await auditPurpose(id);
  if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(result);
}
