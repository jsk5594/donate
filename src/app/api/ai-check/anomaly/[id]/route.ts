import { NextResponse } from "next/server";
import { explainAnomalies } from "@/lib/ai/anomaly-audit";

export const dynamic = "force-dynamic";

/** 모집건 하나의 확인 필요 지출 후보에 대한 AI 설명(키 없으면 규칙 기반 설명) */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await explainAnomalies(id);
  if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(result);
}
