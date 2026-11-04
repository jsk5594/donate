import Link from "next/link";
import { notFound } from "next/navigation";
import { HealthBadge } from "@/components/HealthBadge";
import { computeOrgMetrics, signalsOf } from "@/lib/ai/org-audit";
import { pct, won } from "@/lib/format";
import { getOrganization } from "@/lib/org-data";
import { legalFundraisingCap } from "@/lib/rules";
import { OrgAuditPanel } from "./OrgAuditPanel";

export const dynamic = "force-dynamic";

export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = getOrganization(id);
  if (!org) notFound();
  const m = await computeOrgMetrics(org);
  const signals = signalsOf(m);
  const years = [...org.years].sort((a, b) => a.year - b.year);

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-xs text-muted" aria-label="경로">
        <Link href="/organizations" className="hover:text-primary">주관기관 감사</Link> <span aria-hidden="true">›</span> {org.name}
      </nav>

      <header>
        <div className="text-xs text-muted">
          {org.legalType} · {org.founded}년 설립 · {org.designated ? "지정기부금단체" : "지정기부금단체 아님"}
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{org.name}</h1>
        <p className="mt-1 text-sm text-foreground/80">{org.field}</p>
      </header>

      <OrgAuditPanel orgId={org.id} />

      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="text-base font-bold">AI가 읽은 데이터 ① 연도별 결산 공시</h2>
        <p className="mt-1 text-xs text-muted">막대: 기부금 수입 대비 사용 비율 — 사업비 · 운영비 · 모금비용 · 이월 잔액(점선)</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 pr-3 font-semibold">연도</th>
                <th className="py-2 pr-3 text-right font-semibold">수입</th>
                <th className="w-[38%] py-2 pr-3 font-semibold">사용 비율</th>
                <th className="py-2 pr-3 text-right font-semibold">모금비용(한도)</th>
                <th className="py-2 pr-3 text-right font-semibold">공시 지연</th>
                <th className="py-2 font-semibold">외부감사</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {years.map((y) => {
                const r = (v: number) => v / y.received;
                const cap = legalFundraisingCap(y.received);
                return (
                  <tr key={y.year}>
                    <td className="py-2.5 pr-3 font-semibold tnum">{y.year}</td>
                    <td className="py-2.5 pr-3 text-right tnum">{won(y.received)}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex h-3.5 overflow-hidden rounded-full bg-[#E9EDF3]" role="img" aria-label={`사업비 ${pct(r(y.program))}, 운영비 ${pct(r(y.admin))}, 모금비용 ${pct(r(y.fundraising))}, 이월 ${pct(r(y.carryover))}`}>
                        <div style={{ width: `${r(y.program) * 100}%`, background: "var(--out-program)" }} />
                        <div style={{ width: `${r(y.admin) * 100}%`, background: "var(--out-admin)" }} />
                        <div style={{ width: `${r(y.fundraising) * 100}%`, background: "var(--out-fundraising)" }} />
                        <div style={{ width: `${r(y.carryover) * 100}%`, background: "color-mix(in srgb, var(--out-balance) 35%, transparent)", border: "1px dashed #5b6878" }} />
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted tnum">
                        사업 {pct(r(y.program), 0)} · 운영 {pct(r(y.admin))} · 이월 {pct(r(y.carryover), 0)}
                      </div>
                    </td>
                    <td className={`py-2.5 pr-3 text-right tnum ${r(y.fundraising) > cap ? "font-semibold text-bad" : ""}`}>
                      {pct(r(y.fundraising))} <span className="text-xs text-muted">({pct(cap, 0)})</span>
                    </td>
                    <td className={`py-2.5 pr-3 text-right tnum ${y.disclosureDelayDays > 14 ? "font-semibold text-warn" : ""}`}>{y.disclosureDelayDays ? `${y.disclosureDelayDays}일` : "기한 내"}</td>
                    <td className={`py-2.5 ${y.auditOpinion === "적정" ? "" : y.auditOpinion === "미실시" ? "text-muted" : "font-semibold text-warn"}`}>{y.auditOpinion}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-card p-5">
          <h2 className="text-base font-bold">AI가 읽은 데이터 ② 지표 신호</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {signals.map((s) => (
              <li key={s.key} className="flex items-center gap-3 py-2">
                <HealthBadge level={s.level} />
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{s.label}</span> <span className="text-xs text-muted">· {s.basis}</span>
                </span>
                <span className="shrink-0 text-right text-xs tnum">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-card p-5">
            <h2 className="text-base font-bold">AI가 읽은 데이터 ③ 처분·지적 이력</h2>
            {org.issues.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {org.issues.map((i, k) => (
                  <li key={k} className="flex gap-2">
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${i.severity === "중대" ? "bg-bad-bg text-bad" : "bg-warn-bg text-warn"}`}>{i.severity}</span>
                    <span>
                      <span className="tnum">{i.year}</span> {i.title} <span className="text-xs text-muted">— {i.source}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">최근 5년간 처분·지적 이력이 없습니다.</p>
            )}
          </div>
          <div className="rounded-xl border border-line bg-card p-5">
            <h2 className="text-base font-bold">AI가 읽은 데이터 ④ 현재 모집건</h2>
            {m.currentCampaigns.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {m.currentCampaigns.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <HealthBadge level={c.health} />
                    <Link href={`/campaigns/${c.id}`} className="font-semibold hover:text-primary">
                      {c.title}
                    </Link>
                    <span className="text-xs text-muted">{c.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">기부CCTV에 등록된 모집건이 없습니다.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
