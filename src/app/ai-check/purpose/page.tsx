import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditTabs } from "@/components/AuditTabs";
import { scanPurpose } from "@/lib/ai/purpose-audit";
import { getRepository } from "@/lib/repository";
import { PurposePanel } from "./PurposePanel";

export const dynamic = "force-dynamic";

/** 모집 목적 부합 점검 — 왼쪽: 모집건별 확인 필요 지출 수 / 오른쪽: 선택한 모집건 점검 결과 */
export default async function PurposeAuditPage({ searchParams }: { searchParams: Promise<{ c?: string | string[] }> }) {
  const sp = await searchParams;
  const scan = await scanPurpose();
  const wanted = typeof sp.c === "string" ? sp.c : undefined;
  const selectedId = wanted ?? scan.rows.find((r) => r.flagged > 0)?.campaign.id ?? scan.rows[0]?.campaign.id;
  const detail = selectedId ? await getRepository().getCampaignDetail(selectedId) : null;
  if (wanted && !detail) notFound();
  const flagged = scan.rows.reduce((n, r) => n + r.flagged, 0);
  const flaggedCampaigns = scan.rows.filter((r) => r.flagged > 0).length;

  return (
    <div className="flex flex-col gap-6">
      <AuditTabs active="purpose" />
      <p className="-mt-2 max-w-3xl text-sm text-muted">
        기부금은 모집 목적에만 쓸 수 있습니다(기부금품법 제12조). 수혜자에게 간 돈으로 잡힌 지출 중 모집 목적과 맞지 않거나, 운영비·모금에 쓴 돈을 사업비로 잡은 지출을 찾습니다. 점검 결과는 위법
        판정이 아니며, 모집기관 소명과 등록청 확인을 거쳐 판단합니다.
      </p>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="검토한 모집건" value={`${scan.rows.length}건`} sub="진행 예정 모집건 제외" />
        <Kpi label="검토한 사업비 지출" value={`${scan.totalProgram.toLocaleString("ko-KR")}건`} sub="수혜자에게 간 돈으로 잡힌 지출" />
        <Kpi label="확인 필요 지출" value={`${flagged}건`} sub="모집건을 고르면 이유와 기관에 물어볼 질문을 볼 수 있습니다" tone={flagged ? "warn" : "ok"} />
        <Kpi label="해당 모집건" value={`${flaggedCampaigns}건`} sub="확인 필요 지출이 1건 이상인 모집건" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-xl border border-line bg-card">
          <h2 className="border-b border-line px-4 py-3 text-sm font-bold">모집건 선택 <span className="font-normal text-muted">· 확인 필요 지출 수</span></h2>
          <ul className="max-h-[720px] divide-y divide-line overflow-y-auto">
            {scan.rows.map((r) => {
              const on = r.campaign.id === selectedId;
              return (
                <li key={r.campaign.id}>
                  <Link href={`/ai-check/purpose?c=${r.campaign.id}`} scroll={false} aria-current={on ? "true" : undefined} className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${on ? "bg-primary-soft" : "hover:bg-[#F7F8FA]"}`}>
                    <span className="min-w-0">
                      <span className={`block truncate ${on ? "font-bold text-primary" : "font-semibold"}`}>{r.campaign.title}</span>
                      <span className="block truncate text-xs text-muted">
                        {r.categoryName} · {r.campaign.organizer} · 사업비 {r.programCount}건
                      </span>
                    </span>
                    {r.flagged > 0 ? (
                      <span className="shrink-0 rounded-full bg-bad-bg px-2 py-0.5 text-xs font-bold text-bad tnum">{r.flagged}</span>
                    ) : (
                      <span className="shrink-0 text-xs text-muted">—</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {detail ? (
          <PurposePanel
            key={detail.campaign.id}
            campaign={{ id: detail.campaign.id, title: detail.campaign.title, purpose: detail.campaign.purpose, organizer: detail.campaign.organizer, legalBasis: detail.campaign.legalBasis, category: detail.category.name }}
            expenses={detail.expenses.filter((e) => e.type === "사업수행비용")}
          />
        ) : (
          <p className="text-sm text-muted">점검할 모집건이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 text-xl font-bold tnum ${tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : ""}`}>{value}</div>
      <div className="mt-0.5 text-xs text-muted">{sub}</div>
    </div>
  );
}
