import Link from "next/link";
import { BalanceExplorer } from "@/components/BalanceExplorer";
import { HealthBadge } from "@/components/HealthBadge";
import { KpiHero } from "@/components/KpiHero";
import { LiveDonationTicker } from "@/components/LiveDonationTicker";
import { AssistantChat } from "@/components/AssistantChat";
import { engineInfo } from "@/lib/ai/config";
import { getRepository, sampleDonorCodes } from "@/lib/repository";
import { phaseOf } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const repo = getRepository();
  const [overview, live] = await Promise.all([repo.getOverview(), repo.getLiveDonations(undefined, 12)]);
  const titles = Object.fromEntries(overview.campaigns.map((s) => [s.campaign.id, s.campaign.title]));
  const flagged = overview.campaigns.filter((s) => s.health.overall !== "양호" && phaseOf(s.campaign.status) === "진행중").sort((a, b) => (a.health.overall === "위반" ? -1 : 1) - (b.health.overall === "위반" ? -1 : 1));

  return (
    <div className="flex flex-col gap-8">
      <KpiHero sheet={overview.sheet} donationCount={overview.totals.donationCount} campaignCount={overview.totals.campaignCount} />

      {/* 대차대조표(왼쪽) + 챗봇·실시간 기부(오른쪽 세로 배치) */}
      {/* items-stretch: 두 열의 아래 끝을 맞춤 — 실시간 기부 카드가 남는 높이를 채움 */}
      <section className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 rounded-xl border border-line bg-card p-5">
          <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-bold">전체 기부금 대차대조표</h2>
            <span className="text-sm text-muted">왼쪽은 기부받은 돈, 오른쪽은 그 돈이 간 곳 — 양쪽은 항상 같아야 합니다.</span>
          </div>
          <BalanceExplorer sheet={overview.sheet} donations={overview.donations} expenses={overview.expenses} campaignTitles={titles} height={460} />
        </div>
        <div className="flex flex-col gap-6">
          <AssistantChat engine={engineInfo()} sampleCode={sampleDonorCodes()[0]?.code} />
          <div className="h-[300px] xl:h-auto xl:max-h-[440px] xl:min-h-[240px] xl:flex-1">
            <LiveDonationTicker initial={live} />
          </div>
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
    </div>
  );
}
