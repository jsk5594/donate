import Link from "next/link";
import { notFound } from "next/navigation";
import { AiEngineBadge } from "@/components/AiEngineBadge";
import { ScoreBadge, StatusBadge } from "@/components/HealthBadge";
import { getPublishedReport } from "@/lib/ai/report-writer";
import { fmtDate, won } from "@/lib/format";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

/** 기부 완료 모집건의 AI 결산 보고서(자동 생성·게시) */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getRepository().getCampaignDetail(id);
  if (!detail) notFound();
  const { campaign } = detail;

  if (campaign.status !== "완료") {
    return (
      <article className="mx-auto flex max-w-3xl flex-col gap-4">
        <nav className="text-xs text-muted" aria-label="경로">
          <Link href="/reports" className="hover:text-primary">기부 보고서</Link> <span aria-hidden="true">›</span> {campaign.title}
        </nav>
        <div className="rounded-xl border border-line bg-card p-6">
          <div className="flex items-center gap-2">
            <StatusBadge status={campaign.status} />
            <h1 className="text-lg font-bold">{campaign.title}</h1>
          </div>
          <p className="mt-3 text-sm text-foreground/85">
            아직 집행이 끝나지 않은 모집건입니다. 집행이 완료되면 AI가 결산 보고서를 자동으로 작성해 게시합니다. 현재 미집행 잔액은 {won(detail.sheet.outflow.balance)}입니다.
          </p>
          <Link href={`/campaigns/${campaign.id}`} className="mt-4 inline-block rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-[#F3F5F8]">
            지금까지의 대차대조표 보기
          </Link>
        </div>
      </article>
    );
  }

  const report = await getPublishedReport(id);
  if (!report) notFound();

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-5">
      <nav className="text-xs text-muted no-print" aria-label="경로">
        <Link href="/reports" className="hover:text-primary">기부 보고서</Link> <span aria-hidden="true">›</span> {campaign.title}
      </nav>
      <header className="border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <ScoreBadge score={detail.health.score} level={detail.health.overall} />
          <span>게시 {fmtDate(report.publishedAt)}</span>
          <span>·</span>
          <span>{campaign.organizer}</span>
          <AiEngineBadge engine={report.engine} />
        </div>
        <h1 className="mt-2 text-xl font-bold tracking-tight">{report.title}</h1>
      </header>

      <div className={`rounded-lg px-4 py-2.5 text-xs ${report.verification.passed ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"}`}>
        <span className="font-bold">{report.verification.passed ? "원장 대조 검증 통과" : "검증 안내"}</span> — {report.verification.note}
      </div>

      <pre className="whitespace-pre-wrap rounded-xl border border-line bg-card p-6 font-sans text-[14px] leading-relaxed">{report.body}</pre>

      <div className="flex gap-2 no-print">
        <Link href={`/campaigns/${campaign.id}`} className="rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold hover:bg-[#F3F5F8]">
          대차대조표로 직접 검증
        </Link>
      </div>
    </article>
  );
}
