import { NextResponse } from "next/server";
import { answer } from "@/lib/ai/assistant";
import type { ChatTurn } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

/** 기부 도우미 챗봇 — 대화 기록을 받아 원장 조회 + AI 답변 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { messages?: ChatTurn[] } | null;
  const messages = (body?.messages ?? []).filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim());
  if (!messages.length || messages.at(-1)!.role !== "user") {
    return NextResponse.json({ error: "질문을 입력해 주세요." }, { status: 400 });
  }
  const result = await answer(messages);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
