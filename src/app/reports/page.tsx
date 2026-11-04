import Link from "next/link";
import { HealthBadge, StatusBadge } from "@/components/HealthBadge";
import { publishDateOf, PUBLISH_DELAY_DAYS } from "@/lib/ai/report-writer";
import { fmtDate, won } from "@/lib/format";
import { getRepository } from "@/lib/repository";
import { phaseOf } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const overview = await getRepository().getOverview();
  const published = overview.campaigns
    .filter((s) => s.campaign.status === "완료" && s.campaign.completedAt)
    .sort((a, b) => b.campaign.completedAt!.localeCompare(a.campaign.completedAt!));
  const pending = overview.campaigns.filter((s) => phaseOf(s.campaign.status) === "진행중");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">기부 보고서</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          모집건의 집행이 끝나면 AI가 원장 수치로 결산 보고서를 작성하고, 본문의 모든 금액·비율을 원장과 대조하는 검증을 통과하면 {PUBLISH_DELAY_DAYS}일 뒤 자동으로 게시합니다. 사람이 쓰거나 고치지 않습니다.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-line bg-card">
        <div className="border-b border-line bg-[#F7F8FA] px-5 py-2.5 text-xs font-semibold text-muted">AI 자동 게시 결산 보고서 · {published.length}건</div>
        <ul className="divide-y divide-line">
          {published.map((s) => (
            <li key={s.campaign.id}>
              <Link href={`/reports/${s.campaign.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-[#F7F8FA]">
                <HealthBadge level={s.health.overall} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{s.campaign.title} 기부금 결산 공개보고서</span>
                  <span className="block text-xs text-muted">
                    {s.campaign.organizer} · 기부받은 돈 {won(s.sheet.inflow.total)} · 기부됨 {won(s.sheet.outflow.program)}
                  </span>
                </span>
                <span className="text-right text-xs text-muted tnum">
                  <span className="block">게시 {fmtDate(publishDateOf(s.campaign.completedAt!))}</span>
                  <span className="block">집행 완료 {fmtDate(s.campaign.completedAt!)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-line bg-card">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-bold">자동 생성 대기 · {pending.length}건</h2>
          <p className="mt-0.5 text-xs text-muted">진행 중인 모집건은 집행이 완료되는 시점에 결산 보고서가 자동 생성됩니다.</p>
        </div>
        <ul className="divide-y divide-line">
          {pending.map((s) => (
            <li key={s.campaign.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm">
              <StatusBadge status={s.campaign.status} />
              <Link href={`/campaigns/${s.campaign.id}`} className="min-w-0 flex-1 truncate hover:text-primary">
                {s.campaign.title}
              </Link>
              <span className="text-xs text-muted">미집행 잔액 {won(s.sheet.outflow.balance)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
