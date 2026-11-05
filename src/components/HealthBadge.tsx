import type { HealthLevel } from "@/lib/types";

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

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "모집중"
      ? "bg-primary-soft text-primary"
      : status === "집행중"
        ? "bg-ok-bg text-ok"
        : status === "예정"
          ? "bg-warn-bg text-warn"
          : status === "완료"
          ? "border border-line bg-card text-foreground"
          : "bg-[#E9EDF3] text-muted";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>;
}
