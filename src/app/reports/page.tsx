import Form from "next/form";
import Link from "next/link";
import { ScoreBadge, StatusBadge } from "@/components/HealthBadge";
import { publishDateOf, PUBLISH_DELAY_DAYS } from "@/lib/ai/report-writer";
import { fmtDate, won } from "@/lib/format";
import { getRepository } from "@/lib/repository";
import type { CampaignSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

/** 검색 대상: 모집건명·주관기관·기부 항목·지역·모집 목적·연도 */
function searchTextOf(s: CampaignSummary) {
  const c = s.campaign;
  const years = [c.startDate, c.completedAt].filter(Boolean).map((d) => `${d!.slice(0, 4)}년`);
  return [c.title, c.organizer, s.category.name, c.region, c.purpose, ...years].join(" ").toLowerCase();
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q: rawQ } = await searchParams;
  const q = (Array.isArray(rawQ) ? rawQ[0] : (rawQ ?? "")).trim();
  // 띄어쓰기로 나눈 단어를 모두 포함하는 건만
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (s: CampaignSummary) => {
    const text = searchTextOf(s);
    return terms.every((t) => text.includes(t));
  };

  const overview = await getRepository().getOverview();
  const published = overview.campaigns
    .filter((s) => s.campaign.status === "완료" && s.campaign.completedAt && matches(s))
    .sort((a, b) => b.campaign.completedAt!.localeCompare(a.campaign.completedAt!));
  const pending = overview.campaigns.filter((s) => s.campaign.status !== "예정" && s.campaign.status !== "완료" && matches(s));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">기부 보고서</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          집행이 끝난 모집건의 결산 보고서입니다. 보고서의 금액과 비율은 모두 원장과 대조해 확인한 뒤 집행 완료 {PUBLISH_DELAY_DAYS}일 뒤에 게시합니다.
        </p>
      </header>

      {/* key: '지우기'로 주소가 바뀌면 입력창도 비움 */}
      <Form action="/reports" key={q} role="search" className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card p-4">
        <input
          type="search"
          name="q"
          defaultValue={q}
          aria-label="보고서 키워드 검색"
          placeholder="모집건명, 주관기관, 항목, 지역, 연도로 검색"
          className="min-w-0 flex-1 basis-60 rounded-lg border border-line bg-card px-3.5 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <button type="submit" className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90">
          검색
        </button>
        {q && (
          <Link href="/reports" className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-[#F3F5F8]">
            지우기
          </Link>
        )}
      </Form>

      <section className="overflow-hidden rounded-xl border border-line bg-card">
        <div className="border-b border-line bg-[#F7F8FA] px-5 py-2.5 text-xs font-semibold text-muted">
          AI 자동 게시 결산 보고서 · {q ? `'${q}' 검색 결과 ` : ""}{published.length}건
        </div>
        {published.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">{q ? "검색어에 맞는 보고서가 없습니다. 다른 키워드로 찾아 보세요." : "아직 게시된 보고서가 없습니다."}</p>}
        <ul className="divide-y divide-line">
          {published.map((s) => (
            <li key={s.campaign.id}>
              <Link href={`/reports/${s.campaign.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-[#F7F8FA]">
                <ScoreBadge score={s.health.score} level={s.health.overall} />
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

      {pending.length > 0 && <section className="rounded-xl border border-line bg-card">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-bold">자동 생성 대기 · {pending.length}건</h2>
          <p className="mt-0.5 text-xs text-muted">집행이 끝나면 결산 보고서가 만들어집니다.</p>
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
      </section>}
    </div>
  );
}
