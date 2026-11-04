import Link from "next/link";
import { notFound } from "next/navigation";
import { HealthBadge } from "@/components/HealthBadge";
import { fmtDate } from "@/lib/format";
import { buildReportDraft } from "@/lib/report";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

/** 모집건별 최신 회차 공개보고(원장에서 자동 생성) */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getRepository().getCampaignDetail(id);
  if (!detail) notFound();
  const to = new Date(detail.campaign.lastDisclosedAt);
  const from = new Date(to.getTime() - 13 * 86400000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const report = buildReportDraft(detail, iso(from), iso(to));

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-5">
      <nav className="text-xs text-muted no-print" aria-label="경로">
        <Link href="/reports" className="hover:text-primary">기부 보고서</Link> <span aria-hidden="true">›</span> {detail.campaign.title}
      </nav>
      <header className="border-b border-line pb-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          <HealthBadge level={detail.health.overall} />
          <span>공개일 {fmtDate(detail.campaign.lastDisclosedAt)}</span>
          <span>·</span>
          <span>{detail.campaign.organizer}</span>
        </div>
        <h1 className="mt-2 text-xl font-bold tracking-tight">{report.title}</h1>
        <p className="mt-1 text-xs text-muted">원장 기준 자동 생성 · 모든 수치는 모집건 페이지의 대차대조표와 일치합니다.</p>
      </header>
      <pre className="whitespace-pre-wrap rounded-xl border border-line bg-card p-6 font-sans text-[14px] leading-relaxed">{report.body}</pre>
      <div className="flex gap-2 no-print">
        <Link href={`/campaigns/${detail.campaign.id}`} className="rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold hover:bg-[#F3F5F8]">
          대차대조표로 검증
        </Link>
        <Link href={`/reports/new?campaign=${detail.campaign.id}`} className="rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold hover:bg-[#F3F5F8]">
          이 모집건 새 회차 작성
        </Link>
      </div>
    </article>
  );
}
