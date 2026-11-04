import type { HealthLevel } from "@/lib/types";

const STYLE: Record<HealthLevel, string> = {
  양호: "bg-ok-bg text-ok",
  주의: "bg-warn-bg text-warn",
  위반: "bg-bad-bg text-bad",
};

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
