"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AiEngineBadge } from "@/components/AiEngineBadge";
import type { PurposeAuditResult, PurposeVerdict } from "@/lib/ai/purpose-audit";
import type { PublicExpense } from "@/lib/types";

const VERDICT_STYLE: Record<PurposeVerdict, string> = {
  "목적 부합 확인 필요": "bg-bad-bg text-bad",
  "비용 분류 확인 필요": "bg-warn-bg text-warn",
  "확인 필요": "bg-[#EEF1F5] text-foreground",
};

interface Props {
  campaign: { id: string; title: string; purpose: string; organizer: string; legalBasis: string; category: string };
  expenses: PublicExpense[];
}

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** 선택한 모집건 점검 — 사업수행비용 전체를 보여 주고 확인 필요 지출을 강조 */
export function PurposePanel({ campaign, expenses }: Props) {
  const [data, setData] = useState<PurposeAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/ai-check/purpose/${campaign.id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("점검 결과를 불러오지 못했습니다.");
        return (await r.json()) as PurposeAuditResult;
      })
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [campaign.id]);

  const byId = new Map(data?.findings.map((f) => [f.expenseId, f]) ?? []);
  const flaggedTotal = data ? expenses.filter((e) => byId.has(e.id)).reduce((s, e) => s + e.amount, 0) : 0;
  // 확인 필요 지출을 위로
  const rows = [...expenses].sort((a, b) => Number(byId.has(b.id)) - Number(byId.has(a.id)) || b.spentAt.localeCompare(a.spentAt));

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-xl border-2 border-primary/30 bg-card p-5" aria-busy={!data && !error}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold">{campaign.title}</h2>
          {data && <AiEngineBadge engine={data.engine} />}
          <Link href={`/campaigns/${campaign.id}`} className="ml-auto text-xs text-primary hover:underline">
            모집건 상세
          </Link>
        </div>
        <p className="mt-1 text-sm">
          <span className="text-muted">모집 목적 </span>
          {campaign.purpose}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {campaign.category} · {campaign.organizer} · 근거법 {campaign.legalBasis}
        </p>
      </div>

      {!data && !error && (
        <div className="flex flex-col gap-2" aria-live="polite">
          <p className="text-sm text-muted">모집 목적과 사업비 지출 {expenses.length}건을 대조하고 있습니다.</p>
          <div className="h-4 w-2/3 animate-pulse rounded bg-[#EEF1F5]" />
          <div className="h-4 w-full animate-pulse rounded bg-[#EEF1F5]" />
        </div>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}

      {data && (
        <>
          <div className="rounded-lg bg-primary-soft px-4 py-3 text-sm">
            <span className="font-bold text-primary">점검 결과 </span>
            {data.summary}
            {data.findings.length > 0 && <span className="text-muted"> · 확인 필요 지출 합계 {won(flaggedTotal)}</span>}
          </div>
          {data.fallbackReason && <p className="text-xs text-warn">{data.fallbackReason}</p>}

          {data.findings.length > 0 && (
            <ul className="flex flex-col gap-2">
              {data.findings.map((f) => {
                const e = expenses.find((x) => x.id === f.expenseId);
                if (!e) return null;
                return (
                  <li key={f.expenseId} className="rounded-lg border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${VERDICT_STYLE[f.verdict]}`}>{f.verdict}</span>
                      <span className="font-semibold">{e.description}</span>
                      <span className="text-xs text-muted">
                        {e.vendor} · {e.statName} · {e.spentAt.slice(0, 10)} · {e.receiptId}
                      </span>
                      <span className="ml-auto font-bold tnum">{won(e.amount)}</span>
                    </div>
                    <p className="mt-1.5 text-sm">{f.reason}</p>
                    {f.suggestedType && <p className="mt-1 text-xs text-warn">맞는 분류는 {f.suggestedType}입니다. 바로잡으면 이 모집건의 사업비 비율이 낮아집니다.</p>}
                    {f.question && <p className="mt-1 text-xs text-muted">기관에 물어볼 질문: {f.question}</p>}
                  </li>
                );
              })}
            </ul>
          )}

          <details className="rounded-lg border border-line">
            <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold">사업비 지출 {expenses.length}건 전체 보기</summary>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-y border-line bg-[#F7F8FA] text-left text-xs text-muted">
                    <th className="px-3 py-2 font-semibold">판정</th>
                    <th className="px-3 py-2 font-semibold">적요</th>
                    <th className="px-3 py-2 font-semibold">거래처 · 통계목</th>
                    <th className="px-3 py-2 font-semibold">일자</th>
                    <th className="px-3 py-2 text-right font-semibold">금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((e) => {
                    const f = byId.get(e.id);
                    return (
                      <tr key={e.id} className={f ? "bg-bad-bg/40" : ""}>
                        <td className="px-3 py-2">{f ? <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${VERDICT_STYLE[f.verdict]}`}>{f.verdict}</span> : <span className="text-xs text-muted">정상</span>}</td>
                        <td className="px-3 py-2">
                          {e.description}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted">
                          {e.vendor} · {e.statName}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted tnum">{e.spentAt.slice(0, 10)}</td>
                        <td className="px-3 py-2 text-right tnum">{won(e.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
          <p className="text-xs text-muted">위법 판정이 아니라 설명이 필요한 지출입니다. 최종 판단은 모집기관 설명과 등록청 확인을 거칩니다(운영 세칙 제28조).</p>
        </>
      )}
    </section>
  );
}

