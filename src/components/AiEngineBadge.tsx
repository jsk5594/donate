import type { EngineInfo } from "@/lib/ai/config";

/** AI 엔진 표시 — 실제 모델 연결 시 모델명, 키가 없으면 "데모 모드" */
export function AiEngineBadge({ engine }: { engine: EngineInfo }) {
  const live = engine.mode === "live";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${live ? "bg-primary-soft text-primary" : "bg-[#EEF1F5] text-muted"}`}
      title={live ? "실제 AI 모델이 생성" : ".env.local 에 API 키를 넣으면 실제 AI로 동작합니다"}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-primary" : "bg-muted"}`} aria-hidden="true" />
      AI · {engine.label}
    </span>
  );
}
