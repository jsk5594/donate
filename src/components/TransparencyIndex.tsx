import type { HealthLevel } from "@/lib/types";
import { Term } from "@/components/Term";
import { LEVEL_TEXT } from "@/lib/terms";

const COLOR: Record<HealthLevel, string> = {
  양호: "var(--color-ok)",
  주의: "var(--color-warn)",
  위반: "var(--color-bad)",
};

/** 기부투명도지수 큰 표시 — 점수, 등급, 0~100 구간 막대(60·80 경계) */
export function TransparencyIndex({ score, level }: { score: number; level: HealthLevel }) {
  return (
    <div className="flex min-w-[220px] flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-semibold text-muted"><Term k="score" /></span>
        <span className="text-3xl font-bold tnum" style={{ color: COLOR[level] }}>
          {score}
        </span>
        <span className="text-sm text-muted">/ 100</span>
        <span className="ml-auto text-sm font-bold" style={{ color: COLOR[level] }}>
          {LEVEL_TEXT[level]}
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-[#E9EDF3]" role="img" aria-label={`투명도 점수 ${score}점, ${LEVEL_TEXT[level]}`}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: COLOR[level] }} />
        {/* 구간 경계: 60(위반|주의), 80(주의|양호) */}
        <span className="absolute inset-y-0 left-[60%] w-px bg-white" aria-hidden="true" />
        <span className="absolute inset-y-0 left-[80%] w-px bg-white" aria-hidden="true" />
      </div>
      <div className="relative h-3 text-[10px] text-muted tnum" aria-hidden="true">
        <span className="absolute left-0">0</span>
        <span className="absolute left-[60%] -translate-x-1/2">60</span>
        <span className="absolute left-[80%] -translate-x-1/2">80</span>
        <span className="absolute right-0">100</span>
      </div>
    </div>
  );
}
