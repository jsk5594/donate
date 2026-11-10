import Link from "next/link";

const TABS = [
  { key: "org", href: "/organizations", label: "AI 기관 살펴보기" },
  { key: "spend", href: "/ai-check", label: "AI 지출 점검" },
] as const;

export type AuditTab = (typeof TABS)[number]["key"];

/** 'AI 점검' 메뉴의 선택란 — AI 기관 살펴보기 / AI 지출 점검 (기부 현황 탭과 같은 형식) */
export function AuditTabs({ active }: { active: AuditTab }) {
  return (
    <header className="flex">
      <h1 className="sr-only">AI 점검: {TABS.find((t) => t.key === active)?.label}</h1>
      <nav className="flex flex-wrap gap-1 rounded-xl border border-line bg-card p-1" aria-label="AI 점검 종류">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            scroll={false}
            aria-current={active === t.key ? "page" : undefined}
            className={`rounded-lg px-5 py-1.5 text-2xl font-bold tracking-tight ${active === t.key ? "bg-primary text-white" : "text-muted hover:bg-primary-soft hover:text-primary"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
