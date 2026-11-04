import { NextResponse } from "next/server";
import { auditOrganization } from "@/lib/ai/org-audit";

export const dynamic = "force-dynamic";

/** 주관기관 AI 감사의견 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await auditOrganization(id);
  if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(result);
}
