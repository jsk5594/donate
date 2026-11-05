import Link from "next/link";
import { notFound } from "next/navigation";
import { BalanceExplorer } from "@/components/BalanceExplorer";
import { CampaignCard } from "@/components/CampaignCard";
import { won } from "@/lib/format";
import { getRepository } from "@/lib/repository";
import { STAGES, stageOf } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const overview = await getRepository().getOverview();
  const cat = overview.categories.find((c) => c.category.id === id);
  if (!cat) notFound();
  const ids = new Set(cat.campaigns.map((s) => s.campaign.id));
  const titles =Object.fromEntries(cat.campaigns.map((s) => [s.campaign.id, s.campaign.title]));

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-xs text-muted" aria-label="경로">
        <Link href="/" className="hover:text-primary">홈</Link> <span aria-hidden="true">›</span> {cat.category.name}
      </nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{cat.category.name}</h1>
        <p className="mt-1 text-sm text-muted">{cat.category.description}</p>
        <p className="mt-2 text-sm">
          모집건 {cat.campaigns.length}개 · 기부받은 돈 <strong className="tnum">{won(cat.sheet.inflow.total)}</strong> · 기부됨 <strong className="tnum">{won(cat.sheet.outflow.program)}</strong>
        </p>
      </header>

      {STAGES.map((phase) => {
        const list = cat.campaigns.filter((s) => stageOf(s.campaign.status) === phase);
        if (list.length === 0) return null;
        return (
          <section key={phase}>
            <h2 className="mb-3 text-base font-bold">
              {phase} <span className="text-sm font-normal text-muted">{list.length}건</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((s) => (
                <CampaignCard key={s.campaign.id} s={s} />
              ))}
            </div>
          </section>
        );
      })}

      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-4 text-lg font-bold">{cat.category.name} 항목 합산 대차대조표</h2>
        <BalanceExplorer
          sheet={cat.sheet}
          donations={overview.donations.filter((d) => ids.has(d.campaignId))}
          expenses={overview.expenses.filter((e) => ids.has(e.campaignId))}
          campaignTitles={titles}
          height={360}
        />
      </section>
    </div>
  );
}
