import Link from "next/link";
import { HealthBadge } from "@/components/HealthBadge";
import { SavedDrafts } from "./SavedDrafts";
import { fmtDate, won } from "@/lib/format";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const overview = await getRepository().getOverview();
  const rows = [...overview.campaigns].sort((a, b) => b.campaign.lastDisclosedAt.localeCompare(a.campaign.lastDisclosedAt));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">기부 보고서</h1>
          <p className="mt-1 text-sm text-muted">공개주기(14일)마다 원장 수치로 자동 생성되는 사용내역 공개보고입니다. 담당자는 초안을 검토·보완해 게시합니다.</p>
        </div>
        <Link href="/reports/new" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#163BA3]">
          새 보고서 작성
        </Link>
      </header>

      <section className="overflow-hidden rounded-xl border border-line bg-card">
        <div className="border-b border-line bg-[#F7F8FA] px-5 py-2.5 text-xs font-semibold text-muted">최근 공개보고 (모집건별 최신 회차)</div>
        <ul className="divide-y divide-line">
          {rows.map((s) => (
            <li key={s.campaign.id}>
              <Link href={`/reports/${s.campaign.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-[#F7F8FA]">
                <HealthBadge level={s.health.overall} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{s.campaign.title} 기부금 사용내역 공개보고</span>
                  <span className="block text-xs text-muted">
                    {s.campaign.organizer} · 기부받은 돈 {won(s.sheet.inflow.total)} · 기부됨 {won(s.sheet.outflow.program)}
                  </span>
                </span>
                <span className="text-xs text-muted tnum">공개 {fmtDate(s.campaign.lastDisclosedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <SavedDrafts />
    </div>
  );
}
