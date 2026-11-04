import Link from "next/link";
import { notFound } from "next/navigation";
import { BalanceExplorer } from "@/components/BalanceExplorer";
import { HealthChecks } from "@/components/HealthChecks";
import { HealthBadge, StatusBadge } from "@/components/HealthBadge";
import { fmtDate, pct, won } from "@/lib/format";
import { getRepository } from "@/lib/repository";
import { legalFundraisingCap } from "@/lib/rules";

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getRepository().getCampaignDetail(id);
  if (!detail) notFound();
  const { campaign, category, sheet, health } = detail;
  const t = sheet.inflow.total || 1;
  const ended = new Date(campaign.endDate) < new Date();
  const per10k = Math.round((sheet.outflow.program / t) * 10000);
  const cap = legalFundraisingCap(sheet.inflow.total);

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-xs text-muted" aria-label="경로">
        <Link href="/" className="hover:text-primary">홈</Link> <span aria-hidden="true">›</span>{" "}
        <Link href={`/categories/${category.id}`} className="hover:text-primary">{category.name}</Link> <span aria-hidden="true">›</span> {campaign.title}
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <StatusBadge status={campaign.status} />
            <span>모집등록 {campaign.registrationNo}</span>
            <span>·</span>
            <span>{campaign.organizer}</span>
            <span>·</span>
            <span>{campaign.region}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{campaign.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-foreground/80">{campaign.purpose}</p>
          <p className="mt-1 text-xs text-muted">
            모집기간 {fmtDate(campaign.startDate)} ~ {fmtDate(campaign.endDate)}
            {campaign.completedAt && <> · 집행 완료 {fmtDate(campaign.completedAt)}</>} · 공개주기 {campaign.disclosureCycleDays}일 · 마지막 공개 {fmtDate(campaign.lastDisclosedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HealthBadge level={health.overall} size="md" />
          <Link href={`/reports/new?campaign=${campaign.id}`} className="rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold hover:bg-[#F3F5F8]">
            보고서 작성
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="기부받은 돈" value={won(sheet.inflow.total)} sub={`목표 대비 ${pct((sheet.inflow.total - sheet.inflow.other) / campaign.goal, 0)} · ${detail.donationCount}건`} />
        <Kpi label="기부됨 (사업수행비용)" value={won(sheet.outflow.program)} sub={`${pct(sheet.outflow.program / t)} · 1만원당 ${per10k.toLocaleString("ko-KR")}원`} accent="var(--out-program)" />
        <Kpi label="운영비 (일반관리비용)" value={won(sheet.outflow.admin)} sub={`${pct(sheet.outflow.admin / t)} · 세칙 한도 10%`} accent="var(--out-admin)" />
        <Kpi label="모금비용" value={won(sheet.outflow.fundraising)} sub={`${pct(sheet.outflow.fundraising / t)} · 법정 한도 ${pct(cap, 0)}`} accent="var(--out-fundraising)" />
        <Kpi label="미집행 잔액" value={won(sheet.outflow.balance)} sub={campaign.status === "완료" ? "전액 집행 완료" : `${pct(sheet.outflow.balance / t)} · 계좌 잔액 일치`} accent="var(--out-balance)" />
      </section>

      <section className="rounded-xl border border-line bg-card p-5">
        <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-lg font-bold">이 모집건의 대차대조표</h2>
          <span className="text-sm text-muted">항목을 클릭하면 기부자·지출 카드가 펼쳐집니다.</span>
        </div>
        <BalanceExplorer sheet={sheet} donations={detail.donations} expenses={detail.expenses} campaignEnded={ended} height={400} />
      </section>

      <HealthChecks health={health} />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-line bg-card p-5">
          <h3 className="text-sm font-bold">최근 입금 5건</h3>
          <ul className="mt-3 divide-y divide-line text-sm">
            {detail.donations.slice(0, 5).map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2">
                <span>
                  <span className="font-semibold">{d.donorAlias}</span> <span className="text-xs text-muted">{d.donorType} · {fmtDate(d.donatedAt)}</span>
                </span>
                <span className="font-semibold tnum">{won(d.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-card p-5">
          <h3 className="text-sm font-bold">최근 지출 5건</h3>
          <ul className="mt-3 divide-y divide-line text-sm">
            {detail.expenses.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="font-semibold">{e.description}</span>{" "}
                  <span className="text-xs text-muted">
                    {e.type} · {e.statName} · {fmtDate(e.spentAt)} · {e.receiptId}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tnum">{won(e.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted">
        {accent && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: accent }} aria-hidden="true" />}
        {label}
      </div>
      <div className="mt-1 text-lg font-bold tnum">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{sub}</div>
    </div>
  );
}
