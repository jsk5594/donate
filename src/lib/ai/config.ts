/**
 * AI 연결 설정 — 값은 모두 .env.local 에서 읽습니다(키는 코드·깃에 넣지 않음).
 *
 * AI_PROVIDER : openai | gemini | anthropic | (빈칸 = 키가 입력된 첫 번째 제공자 자동 선택)
 * 키가 하나도 없으면 "데모 모드"로 동작합니다. 데모 모드는 같은 입력(원장 지표)으로
 * 규칙 기반 응답을 만들어 화면 흐름을 그대로 시연할 수 있게 하며, 화면에 "데모 모드"로 표시됩니다.
 */

export type ProviderId = "openai" | "gemini" | "anthropic";

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  apiKey: string;
  model: string;
  baseUrl: string;
}

/** 모델명을 비워 두면 쓰는 기본값 — 각 사 문서에서 최신 모델명을 확인해 .env.local 에서 바꾸세요. */
const DEFAULT_MODEL: Record<ProviderId, string> = {
  openai: "gpt-4.1-mini",
  gemini: "gemini-2.5-flash",
  anthropic: "claude-sonnet-5-5",
};

const DEFAULT_BASE: Record<ProviderId, string> = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  anthropic: "https://api.anthropic.com/v1",
};

const LABEL: Record<ProviderId, string> = { openai: "OpenAI GPT", gemini: "Google Gemini", anthropic: "Anthropic Claude" };

const ENV_PREFIX: Record<ProviderId, string> = { openai: "OPENAI", gemini: "GEMINI", anthropic: "ANTHROPIC" };

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

function configOf(id: ProviderId): ProviderConfig {
  const p = ENV_PREFIX[id];
  return {
    id,
    label: LABEL[id],
    apiKey: env(`${p}_API_KEY`),
    model: env(`${p}_MODEL`) || DEFAULT_MODEL[id],
    baseUrl: (env(`${p}_BASE_URL`) || DEFAULT_BASE[id]).replace(/\/$/, ""),
  };
}

/** 사용할 제공자. 키가 없으면 null(데모 모드). */
export function activeProvider(): ProviderConfig | null {
  const wanted = env("AI_PROVIDER").toLowerCase();
  const order: ProviderId[] = ["openai", "gemini", "anthropic"];
  if (order.includes(wanted as ProviderId)) {
    const c = configOf(wanted as ProviderId);
    return c.apiKey ? c : null;
  }
  for (const id of order) {
    const c = configOf(id);
    if (c.apiKey) return c;
  }
  return null;
}

/** 화면 표시용 엔진 정보 */
export interface EngineInfo {
  mode: "live" | "demo";
  label: string; // 예: "Anthropic Claude · claude-sonnet-5-5" / "자동 분석"(AI 미연결)
}

export function engineInfo(): EngineInfo {
  const p = activeProvider();
  return p ? { mode: "live", label: `${p.label} · ${p.model}` } : { mode: "demo", label: "자동 분석" };
}

export const DEMO_ENGINE: EngineInfo = { mode: "demo", label: "자동 분석" };
