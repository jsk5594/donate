const TITLES = {
  org: "기관 살펴보기",
  purpose: "모집 목적 점검",
  anomaly: "지출 패턴 점검",
} as const;

export type AuditTab = keyof typeof TITLES;

/** 'AI 점검' 하위 화면의 제목 — 화면 선택은 상단 메뉴 'AI 점검'에서 함 */
export function AuditTabs({ active }: { active: AuditTab }) {
  return <h1 className="text-2xl font-bold tracking-tight">{TITLES[active]}</h1>;
}
