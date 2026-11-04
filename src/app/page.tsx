import Link from "next/link";
import { BalanceExplorer } from "@/components/BalanceExplorer";
import { CampaignCard } from "@/components/CampaignCard";
import { HealthBadge } from "@/components/HealthBadge";
import { KpiHero } from "@/components/KpiHero";
import { LiveDonationTicker } from "@/components/LiveDonationTicker";
import { fmtDate, won, wonShort } from "@/lib/format";
import { getRepository } from "@/lib/repository";
import { phaseOf } from "@/lib/types";
import { RULE_POSTS } from "@/lib/rules-content";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const repo = getRepository();
  const [overview, live] = await Promise.all([repo.getOverview(), repo.getLiveDonations(undefined, 12)]);
  const titles = Object.fromEntries(overview.campaigns.map((s) => [s.campaign.id, s.campaign.title]));
  const upcoming = overview.campaigns.filter((s) => s.campaign.status === "예정").sort((a, b) => a.campaign.startDate.localeCompare(b.campaign.startDate));
  const completed = overview.campaigns
    .filter((s) => s.campaign.status === "완료")
    .sort((a, b) => (b.campaign.completedAt ?? "").localeCompare(a.campaign.completedAt ?? ""));
  const flagged = overview.campaigns.filter((s) => s.health.overall !== "양호" && phaseOf(s.campaign.status) === "진행중").sort((a, b) => (a.health.overall === "위반" ? -1 : 1) - (b.health.overall === "위반" ? -1 : 1));

  return (
    <div className="flex flex-col gap-8">
      <KpiHero sheet={overview.sheet} donationCount={overview.totals.donationCount} campaignCount={overview.totals.campaignCount} />

      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-line bg-card p-5">
          <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-bold">전체 기부금 대차대조표</h2>
            <span className="text-sm text-muted">왼쪽은 기부받은 돈, 오른쪽은 그 돈이 간 곳 — 양쪽은 항상 같아야 합니다.</span>
          </div>
          <BalanceExplorer sheet={overview.sheet} donations={overview.donations} expenses={overview.expenses} campaignTitles={titles} height={360} />
        </div>
        <div className="min-h-[420px]">
          <LiveDonationTicker initial={live} />
        </div>
      </section>

      {flagged.length > 0 && (
        <section className="rounded-xl border border-line bg-card">
          <header className="flex items-center gap-3 border-b border-line px-5 py-4">
            <h2 className="text-base font-bold">지금 확인이 필요한 모집건</h2>
            <span className="text-sm text-muted">운영 세칙 판정 ‘주의’ 이상</span>
            <Link href="/monitor" className="ml-auto text-sm text-primary hover:underline">
              감시 현황 전체
            </Link>
          </header>
          <ul className="divide-y divide-line">
            {flagged.map((s) => {
              const worst = s.health.checks.filter((c) => c.level === s.health.overall);
              return (
                <li key={s.campaign.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <HealthBadge level={s.health.overall} />
                  <Link href={`/campaigns/${s.campaign.id}`} className="font-semibold hover:text-primary">
                    {s.campaign.title}
                  </Link>
                  <span className="text-sm text-muted">{worst.map((c) => `${c.label} ${c.value}`).join(" · ")}</span>
                  <span className="ml-auto text-xs text-muted">{s.campaign.organizer}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">항목별 현황</h2>
          <span className="text-sm text-muted">막대: 기부됨 · 운영비 · 모금비용 · 잔액</span>
        </div>
        <div className="flex flex-col gap-6">
          {overview.categories.map((c) => {
            const active = c.campaigns.filter((s) => phaseOf(s.campaign.status) === "진행중");
            if (active.length === 0) return null;
            return (
              <div key={c.category.id}>
                <div className="mb-2 flex items-baseline gap-3">
                  <Link href={`/categories/${c.category.id}`} className="text-base font-bold hover:text-primary">
                    {c.category.name}
                  </Link>
                  <span className="text-sm text-muted">
                    {c.category.description} · 기부받은 돈 {wonShort(c.sheet.inflow.total)} · 기부됨 {wonShort(c.sheet.outflow.program)}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {active.map((s) => (
                    <CampaignCard key={s.campaign.id} s={s} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {upcoming.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">진행 예정 모집건</h2>
            <span className="text-sm text-muted">
              {upcoming.length}건 · 목표 합계 {wonShort(upcoming.reduce((a, s) => a + s.campaign.goal, 0))} · 모집 시작 전
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((s) => (
              <CampaignCard key={s.campaign.id} s={s} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">기부 완료된 모집건</h2>
            <span className="text-sm text-muted">
              {completed.length}건 · 기부받은 돈 {wonShort(completed.reduce((a, s) => a + s.sheet.inflow.total, 0))} 전액 집행 · 잔액 0원
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {completed.map((s) => (
              <CampaignCard key={s.campaign.id} s={s} />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <Link href="/rules" className="rounded-xl border border-line bg-card p-5 hover:border-primary">
          <div className="text-xs font-semibold text-muted">운영 세칙</div>
          <div className="mt-1 text-base font-bold">기부금은 어떻게 쓰여야 하나</div>
          <p className="mt-2 text-sm text-muted">
            기부금품법 제12·13·14조, 공익법인회계기준, BBB 65% 기준을 바탕으로 한 {RULE_POSTS.length}개 장. 모금비용 한도·운영비 상한·공개주기.
          </p>
        </Link>
        <Link href="/reports" className="rounded-xl border border-line bg-card p-5 hover:border-primary">
          <div className="text-xs font-semibold text-muted">기부 보고서</div>
          <div className="mt-1 text-base font-bold">2주마다 원장에서 자동 생성</div>
          <p className="mt-2 text-sm text-muted">모집기관 담당자는 원장 수치로 만든 개조식 초안을 검토·승인만 하면 됩니다. 최근 공개 {fmtDate(overview.campaigns.map((s) => s.campaign.lastDisclosedAt).sort().at(-1)!)}.</p>
        </Link>
        <Link href="/my" className="rounded-xl border border-line bg-card p-5 hover:border-primary">
          <div className="text-xs font-semibold text-muted">나의 기부내역</div>
          <div className="mt-1 text-base font-bold">내 돈은 어디에 쓰였나</div>
          <p className="mt-2 text-sm text-muted">기부코드(D-XXXX)만 입력하면 내 기부가 사업비·운영비·모금비용·잔액으로 어떻게 나뉘었는지 확인합니다. 전체 운영비 {won(overview.totals.admin)}.</p>
        </Link>
      </section>
    </div>
  );
}
