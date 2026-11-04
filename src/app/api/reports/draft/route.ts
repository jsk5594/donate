import { NextResponse } from "next/server";
import { polishWithLLM } from "@/lib/ai";
import { buildReportDraft } from "@/lib/report";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

/**
 * 보고서 초안 생성
 * body: { campaignId, periodFrom, periodTo, instruction? }
 * - 항상 원장 기반 템플릿 초안을 만들고, LLM이 설정되어 있고 instruction이 있으면 문장만 다듬습니다.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { campaignId?: string; periodFrom?: string; periodTo?: string; instruction?: string } | null;
  if (!body?.campaignId || !body.periodFrom || !body.periodTo) {
    return NextResponse.json({ error: "campaignId, periodFrom, periodTo 가 필요합니다." }, { status: 400 });
  }
  const detail = await getRepository().getCampaignDetail(body.campaignId);
  if (!detail) return NextResponse.json({ error: "모집건을 찾을 수 없습니다." }, { status: 404 });

  const draft = buildReportDraft(detail, body.periodFrom, body.periodTo);
  let generatedBy: "template" | "llm" = "template";
  let text = draft.body;
  if (body.instruction?.trim()) {
    const polished = await polishWithLLM(draft.body, body.instruction.trim());
    if (polished) {
      text = polished;
      generatedBy = "llm";
    }
  }
  return NextResponse.json({ title: draft.title, body: text, generatedBy, llmConfigured: Boolean(process.env.LLM_BASE_URL && process.env.LLM_MODEL) });
}
