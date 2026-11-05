import { stageOf, type CampaignStatus, type HealthLevel, type Stage } from "@/lib/types";

const STYLE: Record<HealthLevel, string> = {
  양호: "bg-ok-bg text-ok",
  주의: "bg-warn-bg text-warn",
  위반: "bg-bad-bg text-bad",
};

/** 기부투명도지수 배지 — 점수 + 등급 (compact: 점수만) */
export function ScoreBadge({ score, level, size = "sm", compact = false }: { score: number | null; level: HealthLevel; size?: "sm" | "md"; compact?: boolean }) {
  if (score === null) return null;
  return (
    <span
      title={`기부투명도지수 ${score}점 (${level})`}
      className={`inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap rounded-full font-semibold ${STYLE[level]} ${size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"}`}
    >
      <span className="font-bold tnum">{score}</span>
      {compact ? null : (
        <>
          <span className="opacity-70">점</span>
          <span>· {level}</span>
        </>
      )}
    </span>
  );
}

export function HealthBadge({ level, size = "sm" }: { level: HealthLevel; size?: "sm" | "md" }) {
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${STYLE[level]} ${size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"}`}>
      {level}
    </span>
  );
}

const STAGE_STYLE: Record<Stage, string> = {
  진행중: "bg-primary-soft text-primary",
  "진행 예정": "bg-warn-bg text-warn",
  종료: "bg-[#E9EDF3] text-muted",
};

/** 진행상황 배지 — 화면에는 진행중 / 진행 예정 / 종료 3구분으로만 표시 */
export function StatusBadge({ status, warm = false }: { status: CampaignStatus; warm?: boolean }) {
  const stage = stageOf(status);
  const color = warm && stage === "진행중" ? "bg-risk-amber text-risk-ink" : STAGE_STYLE[stage];
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>{stage}</span>;
}
