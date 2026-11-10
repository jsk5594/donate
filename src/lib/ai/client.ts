/**
 * 제공자 공통 호출 — OpenAI / Gemini / Claude 를 같은 함수로 부릅니다(SDK 없이 fetch).
 * 실패하거나 키가 없으면 null 을 돌려주고, 호출자는 데모 응답으로 대체합니다.
 */

import { activeProvider, type EngineInfo, type ProviderConfig } from "./config";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  system: string;
  messages: ChatTurn[];
  /** true 면 JSON 객체 하나만 출력하도록 요청 */
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface GenerateResult {
  text: string;
  engine: EngineInfo;
}

/** 모든 AI 기능에 공통으로 붙이는 문체 기준 — 화면 글이 사람이 쓴 안내문처럼 읽히도록 */
const PLAIN_STYLE = `
[문체]
- 공공기관 안내문처럼 짧고 평이한 문장으로 씁니다. 한 문장에 한 가지 내용만 담습니다.
- 줄표(—)와 이모지를 쓰지 않습니다. 따옴표나 괄호로 꾸미지 않습니다.
- '핵심', '종합적으로', '~라고 할 수 있습니다', '~하는 것이 중요합니다' 같은 상투적 표현과 과장된 수식어를 쓰지 않습니다.
- 숫자와 사실을 먼저 말하고, 결론을 되풀이하지 않습니다.`;

export async function generate(opts: GenerateOptions): Promise<GenerateResult | null> {
  const p = activeProvider();
  if (!p) return null;
  try {
    const text = await CALL[p.id](p, { ...opts, system: `${opts.system}
${PLAIN_STYLE}` });
    if (!text?.trim()) return null;
    return { text: text.trim(), engine: { mode: "live", label: `${p.label} · ${p.model}` } };
  } catch (e) {
    console.error(`[ai] ${p.id} 호출 실패:`, e instanceof Error ? e.message : e);
    return null;
  }
}

const CALL: Record<ProviderConfig["id"], (p: ProviderConfig, o: GenerateOptions) => Promise<string | undefined>> = {
  async openai(p, o) {
    const res = await fetch(`${p.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.apiKey}` },
      body: JSON.stringify({
        model: p.model,
        temperature: o.temperature ?? 0.2,
        max_tokens: o.maxTokens ?? 1500,
        ...(o.json ? { response_format: { type: "json_object" } } : {}),
        messages: [{ role: "system", content: o.system }, ...o.messages],
      }),
      signal: AbortSignal.timeout(o.timeoutMs ?? 45000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return j.choices?.[0]?.message?.content;
  },

  async gemini(p, o) {
    const res = await fetch(`${p.baseUrl}/models/${encodeURIComponent(p.model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": p.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: o.system }] },
        contents: o.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: {
          temperature: o.temperature ?? 0.2,
          maxOutputTokens: o.maxTokens ?? 1500,
          ...(o.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
      signal: AbortSignal.timeout(o.timeoutMs ?? 45000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
    const j = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return j.candidates?.[0]?.content?.parts?.map((x) => x.text ?? "").join("");
  },

  async anthropic(p, o) {
    const res = await fetch(`${p.baseUrl}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": p.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: p.model,
        max_tokens: o.maxTokens ?? 1500,
        temperature: o.temperature ?? 0.2,
        system: o.json ? `${o.system}\n\n반드시 JSON 객체 하나만 출력하세요. 코드블록·설명 없이.` : o.system,
        messages: o.messages,
      }),
      signal: AbortSignal.timeout(o.timeoutMs ?? 45000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
    const j = (await res.json()) as { content?: { type: string; text?: string }[] };
    return j.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  },
};

/** 모델 출력에서 JSON 객체를 꺼냄(코드블록으로 감싸 오는 경우 대비) */
export function parseJsonObject<T>(text: string): T | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
