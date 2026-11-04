import Link from "next/link";
import { HealthBadge } from "./HealthBadge";
import type { CampaignHealth } from "@/lib/types";

export function HealthChecks({ health }: { health: CampaignHealth }) {
  return (
    <section className="rounded-xl border border-line bg-card">
      <header className="flex items-center gap-3 border-b border-line px-5 py-4">
        <h2 className="text-base font-bold">운영 세칙 판정</h2>
        <HealthBadge level={health.overall} size="md" />
        <Link href="/rules/scoring" className="ml-auto text-xs text-primary hover:underline">
          판정 기준표
        </Link>
      </header>
      <ul className="divide-y divide-line">
        {health.checks.map((c) => (
          <li key={c.key} className="grid gap-1 px-5 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4">
            <HealthBadge level={c.level} />
            <div className="min-w-0">
              <div className="text-sm font-semibold">{c.label}</div>
              <div className="text-xs text-muted">
                {c.detail} <span className="text-[#8A98AA]">— {c.basis}</span>
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="font-bold tnum">{c.value}</div>
              <div className="text-xs text-muted">기준 {c.threshold}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
