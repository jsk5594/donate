import type { TrustGrade } from "@/lib/ai/org-audit";

const STYLE: Record<TrustGrade, string> = {
  "신뢰 가능": "bg-ok-bg text-ok",
  "주의 필요": "bg-warn-bg text-warn",
  "추가 확인 권장": "bg-bad-bg text-bad",
};

export function TrustGradeBadge({ grade, size = "sm" }: { grade: TrustGrade; size?: "sm" | "md" }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full font-semibold ${STYLE[grade]} ${size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"}`}>{grade}</span>;
}
