/**
 * 모델 비종속 LLM 연결 (OpenAI 호환 Chat Completions)
 * - .env: LLM_BASE_URL (예: http://localhost:11434/v1 — Ollama/Gemma·EXAONE, 또는 https://api.openai.com/v1)
 *         LLM_API_KEY, LLM_MODEL
 * - 설정이 없으면 null을 돌려주고 호출자는 템플릿 초안을 그대로 사용합니다.
 */
export async function polishWithLLM(draft: string, instruction: string): Promise<string | null> {
  const base = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL;
  if (!base || !model) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.LLM_API_KEY ? { Authorization: `Bearer ${process.env.LLM_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "당신은 공공기관 기부금 공개보고서 작성 보조자입니다. 아래 [원장 기반 초안]의 수치·건수·판정은 절대 바꾸지 말고, 사용자가 요청한 방식으로 문장만 다듬으세요. 초안에 없는 사실을 추가하지 마세요. 개조식(□ ○ -)을 유지하세요.",
          },
          { role: "user", content: `[요청]\n${instruction}\n\n[원장 기반 초안]\n${draft}` },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}
