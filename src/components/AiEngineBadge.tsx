import type { EngineInfo } from "@/lib/ai/config";

/** 분석 주체 표시 — AI 모델이 연결되면 모델명, 연결되지 않으면 원장 기준 자동 분석 */
export function AiEngineBadge({ engine }: { engine: EngineInfo }) {
  const live = engine.mode === "live";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${live ? "bg-primary-soft text-primary" : "bg-[#EEF1F5] text-muted"}`}
      title={live ? "AI 모델이 작성했습니다" : "원장 데이터와 판정 기준으로 작성했습니다"}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-primary" : "bg-muted"}`} aria-hidden="true" />
      {live ? `AI · ${engine.label}` : engine.label}
    </span>
  );
}
