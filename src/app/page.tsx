import Link from "next/link";
import { BalanceExplorer } from "@/components/BalanceExplorer";
import { ScoreBadge } from "@/components/HealthBadge";
import { KpiHero, type YearSummary } from "@/components/KpiHero";
import { SCORE_BANDS } from "@/lib/rules";
import { LiveDonationTicker } from "@/components/LiveDonationTicker";
import { getRepository } from "@/lib/repository";
import { buildIndexTrend } from "@/lib/index-trend";
import { IndexTrendCard } from "@/components/IndexTrendCard";
import { STAGES, stageOf } from "@/lib/types";
import { CampaignTreeCard, type TreeGroup } from "@/components/CampaignTreeCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const repo = getRepository();
  const [overview, live] = await Promise.all([repo.getOverview(), repo.getLiveDonations(undefined, 12)]);
  const titles = Object.fromEntries(overview.campaigns.map((s) => [s.campaign.id, s.campaign.title]));
  const yearSummary = summarizeYear(overview, new Date().getFullYear());
  // 5개년 기부 1만여 건을 모두 브라우저로 보내지 않도록, 유형별 최근 200건 + 전체 건수·최고액만 전달
  const explorer = (() => {
    const types = ["개인", "기업", "단체"] as const;
    const stats: Record<string, { count: number; max: number }> = {};
    const donations = types.flatMap((t) => {
      const list = overview.donations.filter((d) => d.donorType === t);
      stats[t] = { count: list.length, max: list.reduce((m, d) => Math.max(m, d.amount), 0) };
      return [...list].sort((a, b) => b.donatedAt.localeCompare(a.donatedAt)).slice(0, 200);
    });
    return { donations, stats };
  })();
  // 기부 현황 카드: 진행상황 → 항목 → 모집건
  const treeGroups: TreeGroup[] = STAGES.map((phase) => {
    const categories = overview.categories
      .map((c) => {
        const list = c.campaigns.filter((s) => stageOf(s.campaign.status) === phase);
        if (phase === "진행 예정") list.sort((a, b) => a.campaign.startDate.localeCompare(b.campaign.startDate));
        return {
          id: c.category.id,
          name: c.category.name,
          received: list.reduce((a, s) => a + s.sheet.inflow.total, 0),
          campaigns: list.map((s) => ({ id: s.campaign.id, title: s.campaign.title, startDate: s.campaign.startDate, health: s.health.overall, score: s.health.score })),
        };
      })
      .filter((c) => c.campaigns.length > 0);
    return { phase, count: categories.reduce((a, c) => a + c.campaigns.length, 0), categories };
  });
  const flagged = overview.campaigns.filter((s) => s.health.overall !== "양호" && (s.campaign.status === "모집중" || s.campaign.status === "집행중")).sort((a, b) => (a.health.overall === "위반" ? -1 : 1) - (b.health.overall === "위반" ? -1 : 1));

  return (
    <div className="flex flex-col gap-8">
      {/* 상단 카드의 아래 화살표로 펼치는 전체 대차대조표 */}
      <KpiHero y={yearSummary}>
        <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-lg font-bold">전체 기부금 대차대조표</h2>
          <span className="text-sm text-muted">왼쪽은 기부받은 돈, 오른쪽은 그 돈이 간 곳 — 양쪽은 항상 같아야 합니다. (전체 기간 누적)</span>
        </div>
        <BalanceExplorer sheet={overview.sheet} donations={explorer.donations} donorStats={explorer.stats} expenses={overview.expenses} campaignTitles={titles} height={460} />
      </KpiHero>

      {/* 기부 현황 · 실시간 기부 · 확인 필요 모집건 3열 (줄 높이는 기부 현황 카드 기준, 실시간 기부는 그 높이에 맞춤) */}
      <div className="grid gap-6 xl:grid-cols-3">
      <CampaignTreeCard groups={treeGroups} />

      <div className="relative h-[420px] xl:h-auto">
        <div className="h-full xl:absolute xl:inset-0">
          <LiveDonationTicker initial={live} />
        </div>
      </div>

      {/* 높이는 기부 현황 카드에 맞춤(absolute), 넘치면 카드 안에서 스크롤 */}
      <div className="relative xl:h-auto">
      <section className="flex h-full flex-col rounded-xl border border-line bg-card xl:absolute xl:inset-0">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-5">
          <h2 className="text-base font-bold">지금 확인이 필요한 모집건</h2>
          <Link href="/monitor" className="ml-auto rounded-md px-2 py-1 text-sm font-semibold text-primary hover:bg-primary-soft">
            감시 현황 →
          </Link>
        </header>
        <p className="shrink-0 border-b border-line bg-[#F7F8FA] px-5 py-2 text-xs text-muted">진행 중(모집중·집행중) 모집건 중 기부투명도지수 80점 미만</p>
        {flagged.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">지금 확인이 필요한 모집건이 없습니다.</p>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
            {flagged.map((s) => {
              const worst = s.health.checks.filter((c) => c.level === s.health.overall);
              return (
                <li key={s.campaign.id} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/campaigns/${s.campaign.id}`} className="min-w-0 flex-1 truncate font-semibold hover:text-primary">
                      {s.campaign.title}
                    </Link>
                    <ScoreBadge score={s.health.score} level={s.health.overall} />
                  </div>
                  <p className="mt-1 text-sm text-muted">{worst.map((c) => `${c.label} ${c.value}`).join(" · ")}</p>
                  <p className="mt-0.5 text-xs text-muted">{s.campaign.organizer}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      </div>
      </div>

      {/* 완료 모집건 지수 추이 — 월별/연별 × 종합/기부항목별 */}
      <div className="grid gap-6 xl:grid-cols-2">
        <IndexTrendCard trend={buildIndexTrend(overview)} />
      </div>
    </div>
  );
}

type Overview = Awaited<ReturnType<ReturnType<typeof getRepository>["getOverview"]>>;

/**
 * 한 해 기준 요약 — 입금일·지출일이 그해인 돈만 합산.
 * 종합 기부투명도지수 = 그해 입출금이 있었던 모집건 지수의 '그해 기부받은 돈' 가중 평균(진행 예정 제외)
 */
function summarizeYear(o: Overview, year: number): YearSummary {
  const inYear = (iso: string) => new Date(iso).getFullYear() === year;
  const recvBy = new Map<string, number>();
  let received = 0;
  let donationCount = 0;
  for (const d of o.donations) {
    if (!inYear(d.donatedAt)) continue;
    received += d.amount;
    donationCount += 1;
    recvBy.set(d.campaignId, (recvBy.get(d.campaignId) ?? 0) + d.amount);
  }
  let program = 0;
  let admin = 0;
  let fundraising = 0;
  const active = new Set(recvBy.keys());
  for (const e of o.expenses) {
    if (!inYear(e.spentAt)) continue;
    active.add(e.campaignId);
    if (e.type === "사업수행비용") program += e.amount;
    else if (e.type === "일반관리비용") admin += e.amount;
    else fundraising += e.amount;
  }
  const scored = o.campaigns.filter((s) => active.has(s.campaign.id) && s.health.score !== null);
  const weight = scored.reduce((a, s) => a + (recvBy.get(s.campaign.id) ?? 0), 0);
  const score = scored.length
    ? Math.floor(
        weight > 0
          ? scored.reduce((a, s) => a + (s.health.score ?? 0) * (recvBy.get(s.campaign.id) ?? 0), 0) / weight
          : scored.reduce((a, s) => a + (s.health.score ?? 0), 0) / scored.length,
      )
    : 100;
  const level = score >= SCORE_BANDS.good ? "양호" : score >= SCORE_BANDS.warn ? "주의" : "위반";
  return {
    year,
    received,
    donationCount,
    campaignCount: active.size,
    program,
    admin,
    fundraising,
    balance: Math.max(0, received - program - admin - fundraising),
    score,
    level,
  };
}
