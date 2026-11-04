import Link from "next/link";
import { HealthBadge, StatusBadge } from "./HealthBadge";
import { fmtDate, pct, wonShort } from "@/lib/format";
import type { CampaignSummary } from "@/lib/types";

export function CampaignCard({ s }: { s: CampaignSummary }) {
  const t = s.sheet.inflow.total || 1;
  const bars = [
    { v: s.sheet.outflow.program, c: "var(--out-program)", l: "기부됨" },
    { v: s.sheet.outflow.admin, c: "var(--out-admin)", l: "운영비" },
    { v: s.sheet.outflow.fundraising, c: "var(--out-fundraising)", l: "모금비용" },
    { v: s.sheet.outflow.balance, c: "var(--out-balance)", l: "잔액" },
  ];
  return (
    <Link href={`/campaigns/${s.campaign.id}`} className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4 transition hover:border-primary hover:shadow-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted">
            {s.category.name} · {s.campaign.region}
          </div>
          <div className="truncate text-[15px] font-bold">{s.campaign.title}</div>
        </div>
        <HealthBadge level={s.health.overall} />
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-bold tnum">{wonShort(s.sheet.inflow.total)}</span>
        <span className="text-xs text-muted">목표 {wonShort(s.campaign.goal)} · {pct(s.sheet.inflow.total / s.campaign.goal, 0)}</span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-[#E9EDF3]" aria-hidden="true">
        {bars.map((b) => (
          <div key={b.l} style={{ width: `${(b.v / t) * 100}%`, background: b.c }} />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        {s.campaign.status === "예정" ? (
          <span>모집 시작 {fmtDate(s.campaign.startDate)} · 마감 {fmtDate(s.campaign.endDate)}</span>
        ) : (
          <span>기부됨 {pct(s.sheet.outflow.program / t, 0)} · 운영비 {pct(s.sheet.outflow.admin / t)} · 모금 {pct(s.sheet.outflow.fundraising / t)}</span>
        )}
        <StatusBadge status={s.campaign.status} />
      </div>
    </Link>
  );
}
