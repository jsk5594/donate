import Link from "next/link";
import { KIND_INFO, scanAnomalies, type Severity } from "@/lib/ai/anomaly-audit";
import type { AnomalyKind } from "@/lib/audit-plants";
import { getRepository } from "@/lib/repository";
import { AnomalyPanel } from "./AnomalyPanel";

export const dynamic = "force-dynamic";

const SEV_STYLE: Record<Severity, string> = { 높음: "bg-bad-bg text-bad", 중간: "bg-warn-bg text-warn", 낮음: "bg-[#EEF1F5] text-foreground" };
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** 지출 패턴 점검 — 점검 결과 표 + 선택한 모집건 검토 의견 */
export default async function AnomalyAuditPage({ searchParams }: { searchParams: Promise<{ c?: string | string[]; k?: string | string[] }> }) {
  const sp = await searchParams;
  const scan = await scanAnomalies();
  const kind = typeof sp.k === "string" && sp.k in KIND_INFO ? (sp.k as AnomalyKind) : null;
  const list = kind ? scan.findings.filter((f) => f.kind === kind) : scan.findings;
  const selectedId = typeof sp.c === "string" && scan.campaigns[sp.c] ? sp.c : list[0]?.campaignId;
  const detail = selectedId ? await getRepository().getCampaignDetail(selectedId) : null;
  const campaignsHit = new Set(scan.findings.map((f) => f.campaignId)).size;
  const amountHit = scan.findings.reduce((n, f) => n + f.amount, 0);
  const kinds = Object.keys(KIND_INFO) as AnomalyKind[];
  const qs = (c?: string, k?: string | null) => {
    const p = new URLSearchParams();
    if (c) p.set("c", c);
    if (k) p.set("k", k);
    const s = p.toString();
    return s ? `/ai-check/anomaly?${s}` : "/ai-check/anomaly";
  };

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-xs text-muted" aria-label="경로">
        <Link href="/organizations" className="hover:text-primary">AI 점검</Link> <span aria-hidden="true">›</span>{" "}
        <Link href="/ai-check" className="hover:text-primary">AI 지출 점검</Link> <span aria-hidden="true">›</span> 지출 패턴 점검
      </nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">지출 패턴 점검</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">모든 모집건의 지출을 검사해 분할 결제, 증빙번호 중복 같은 거래 패턴을 찾습니다. 모집건을 고르면 확인이 필요한 이유와 기관에 물어볼 질문을 볼 수 있습니다.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="검사한 지출" value={`${scan.scannedExpenses.toLocaleString("ko-KR")}건`} sub={`${scan.scannedCampaigns}개 모집건`} />
        <Kpi label="확인 신호" value={`${scan.findings.length}건`} sub={`높음 ${scan.findings.filter((f) => f.severity === "높음").length} · 중간 ${scan.findings.filter((f) => f.severity === "중간").length} · 낮음 ${scan.findings.filter((f) => f.severity === "낮음").length}`} />
        <Kpi label="해당 모집건" value={`${campaignsHit}건`} sub="확인 신호가 1건 이상인 모집건" />
        <Kpi label="관련 금액" value={won(amountHit)} sub="확인 신호에 걸린 지출 합계" />
      </section>

      <section className="rounded-xl border border-line bg-card p-4">
        <h2 className="text-sm font-bold">점검 기준 8가지</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={qs(undefined, null)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${!kind ? "border-primary bg-primary text-white" : "border-line hover:bg-[#F7F8FA]"}`}>
            전체 {scan.findings.length}
          </Link>
          {kinds.map((k) => {
            const n = scan.findings.filter((f) => f.kind === k).length;
            return (
              <Link
                key={k}
                href={qs(undefined, k)}
                title={KIND_INFO[k].rule}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${kind === k ? "border-primary bg-primary text-white" : n ? "border-line hover:bg-[#F7F8FA]" : "border-line text-muted hover:bg-[#F7F8FA]"}`}
              >
                {KIND_INFO[k].label} {n}
              </Link>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">{kind ? KIND_INFO[kind].rule : "규칙 이름에 마우스를 올리면 점검 기준이 보입니다. 주말 지출은 흔한 일이라 신호로 보지 않습니다."}</p>
      </section>

      <section className="overflow-hidden rounded-xl border border-line bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-line bg-[#F7F8FA] text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-semibold">확인 우선순위</th>
                <th className="px-3 py-2.5 font-semibold">유형</th>
                <th className="px-3 py-2.5 font-semibold">모집건</th>
                <th className="px-3 py-2.5 font-semibold">근거</th>
                <th className="px-4 py-2.5 text-right font-semibold">관련 금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    이 규칙에 걸린 지출이 없습니다.
                  </td>
                </tr>
              )}
              {list.map((f) => {
                const c = scan.campaigns[f.campaignId];
                const on = f.campaignId === selectedId;
                return (
                  <tr key={f.id} className={on ? "bg-primary-soft/60" : "hover:bg-[#F7F8FA]"}>
                    <td className="px-4 py-2.5">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${SEV_STYLE[f.severity]}`}>{f.severity}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      {f.label}
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={qs(f.campaignId, kind)} scroll={false} className="font-semibold hover:text-primary">
                        {c?.title ?? f.campaignId}
                      </Link>
                      <div className="text-xs text-muted">{c?.organizer}</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-foreground/80">{f.evidence}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tnum">{won(f.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {detail && (
        <AnomalyPanel
          key={detail.campaign.id}
          campaign={{ id: detail.campaign.id, title: detail.campaign.title, organizer: detail.campaign.organizer, purpose: detail.campaign.purpose }}
          findings={scan.findings.filter((f) => f.campaignId === detail.campaign.id)}
          expenses={detail.expenses.filter((e) => scan.findings.some((f) => f.campaignId === detail.campaign.id && f.expenseIds.includes(e.id)))}
        />
      )}
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
