import Link from "next/link";
import { ScoreBadge, StatusBadge } from "@/components/HealthBadge";
import { fmtDate, pct, wonShort } from "@/lib/format";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

const ORDER = { 위반: 0, 주의: 1, 양호: 2 } as const;

export default async function MonitorPage() {
  const overview = await getRepository().getOverview();
  // 진행 예정은 판정 대상이 아니므로 감시 현황에서 제외
  const upcomingCount = overview.campaigns.filter((s) => s.campaign.status === "예정").length;
  const rows = overview.campaigns.filter((s) => s.campaign.status !== "예정").sort((a, b) => ORDER[a.health.overall] - ORDER[b.health.overall] || (a.health.score ?? 0) - (b.health.score ?? 0));
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + (r.health.score ?? 0), 0) / rows.length) : 0;
  const count = (lv: keyof typeof ORDER) => rows.filter((r) => r.health.overall === lv).length;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">감시 현황</h1>
        <p className="mt-1 text-sm text-muted">모든 모집건을 운영 세칙 6개 항목으로 매일 자동 점검합니다. 6개 항목 점수를 합한 기부투명도지수(0~100)로 보여줍니다.{upcomingCount > 0 && ` 진행 예정 ${upcomingCount}건은 모집 시작 후 판정합니다.`}</p>
      </header>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-line bg-card p-4"><div className="text-xs text-muted">평균 기부투명도지수</div><div className="mt-1 text-2xl font-bold tnum">{avg}<span className="text-sm font-normal text-muted"> / 100</span></div></div>
        <div className="rounded-xl border border-line bg-card p-4"><div className="text-xs text-muted">위반 (60점 미만)</div><div className="mt-1 text-2xl font-bold text-bad">{count("위반")}건</div></div>
        <div className="rounded-xl border border-line bg-card p-4"><div className="text-xs text-muted">주의 (60~79점)</div><div className="mt-1 text-2xl font-bold text-warn">{count("주의")}건</div></div>
        <div className="rounded-xl border border-line bg-card p-4"><div className="text-xs text-muted">양호 (80점 이상)</div><div className="mt-1 text-2xl font-bold text-ok">{count("양호")}건</div></div>
      </section>
      <section className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="bg-[#F7F8FA] text-left text-xs text-muted">
              <th className="px-4 py-2.5 font-semibold">투명도지수</th>
              <th className="px-4 py-2.5 font-semibold">모집건</th>
              <th className="px-3 py-2.5 text-right font-semibold">기부받은 돈</th>
              <th className="px-3 py-2.5 text-right font-semibold">기부됨</th>
              <th className="px-3 py-2.5 text-right font-semibold">운영비</th>
              <th className="px-3 py-2.5 text-right font-semibold">모금비용</th>
              <th className="px-3 py-2.5 text-right font-semibold">잔액</th>
              <th className="px-3 py-2.5 font-semibold">마지막 공개</th>
              <th className="px-4 py-2.5 font-semibold">판정 사유</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((s) => {
              const t = s.sheet.inflow.total || 1;
              const issues = s.health.checks.filter((c) => c.level !== "양호");
              return (
                <tr key={s.campaign.id} className="align-top hover:bg-[#F7F8FA]">
                  <td className="px-4 py-3"><ScoreBadge score={s.health.score} level={s.health.overall} /></td>
                  <td className="px-4 py-3">
                    <Link href={`/campaigns/${s.campaign.id}`} className="font-semibold hover:text-primary">{s.campaign.title}</Link>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted"><StatusBadge status={s.campaign.status} />{s.campaign.organizer}</div>
                  </td>
                  <td className="px-3 py-3 text-right tnum">{wonShort(s.sheet.inflow.total)}</td>
                  <td className="px-3 py-3 text-right tnum">{pct(s.sheet.outflow.program / t)}</td>
                  <td className={`px-3 py-3 text-right tnum ${s.sheet.outflow.admin / t > 0.1 ? "font-bold text-bad" : s.sheet.outflow.admin / t > 0.08 ? "font-bold text-warn" : ""}`}>{pct(s.sheet.outflow.admin / t)}</td>
                  <td className={`px-3 py-3 text-right tnum ${s.health.checks.find((c) => c.key === "fundraising")?.level === "위반" ? "font-bold text-bad" : ""}`}>{pct(s.sheet.outflow.fundraising / t)}</td>
                  <td className="px-3 py-3 text-right tnum">{pct(s.sheet.outflow.balance / t)}</td>
                  <td className="px-3 py-3 text-xs text-muted">{fmtDate(s.campaign.lastDisclosedAt)}</td>
                  <td className="px-4 py-3 text-xs text-muted">{issues.length ? issues.map((c) => `[${c.level}] ${c.label} ${c.value}`).join(" / ") : "전 항목 양호"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
