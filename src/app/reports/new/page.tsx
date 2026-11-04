import Link from "next/link";
import { ReportEditor } from "./ReportEditor";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function NewReportPage({ searchParams }: { searchParams: Promise<{ campaign?: string; draft?: string }> }) {
  const sp = await searchParams;
  const campaigns = await getRepository().listCampaigns();
  return (
    <div className="flex flex-col gap-5">
      <nav className="text-xs text-muted" aria-label="경로">
        <Link href="/reports" className="hover:text-primary">기부 보고서</Link> <span aria-hidden="true">›</span> 새 보고서 작성
      </nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">기부 보고서 작성</h1>
        <p className="mt-1 text-sm text-muted">모집건과 기간을 고르면 원장 수치로 개조식 초안이 만들어집니다. 수치는 원장에서만 오고, 담당자는 소명·향후 계획을 채운 뒤 게시합니다.</p>
      </header>
      <ReportEditor campaigns={campaigns.map((c) => ({ id: c.id, title: c.title, lastDisclosedAt: c.lastDisclosedAt }))} initialCampaignId={sp.campaign} draftId={sp.draft} />
    </div>
  );
}
