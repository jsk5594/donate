"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AiEngineBadge } from "@/components/AiEngineBadge";
import type { AnomalyAuditResult, AnomalyFinding, Severity } from "@/lib/ai/anomaly-audit";
import type { PublicExpense } from "@/lib/types";

const SEV_STYLE: Record<Severity, string> = { 높음: "bg-bad-bg text-bad", 중간: "bg-warn-bg text-warn", 낮음: "bg-[#EEF1F5] text-foreground" };
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const kst = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 16).replace("T", " ");

interface Props {
  campaign: { id: string; title: string; organizer: string; purpose: string };
  findings: AnomalyFinding[];
  expenses: PublicExpense[];
}

/** 선택한 모집건의 확인 신호마다 검토 의견(확인이 필요한 이유·정상 가능성·기관에 물어볼 질문) */
export function AnomalyPanel({ campaign, findings, expenses }: Props) {
  const [data, setData] = useState<AnomalyAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/ai-check/anomaly/${campaign.id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("검토 의견을 불러오지 못했습니다.");
        return (await r.json()) as AnomalyAuditResult;
      })
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [campaign.id]);

  const explain = new Map(data?.items.map((i) => [i.findingId, i]) ?? []);

  return (
    <section className="flex flex-col gap-4 rounded-xl border-2 border-primary/30 bg-card p-5" aria-busy={!data && !error}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold">검토 의견 · {campaign.title}</h2>
          {data && <AiEngineBadge engine={data.engine} />}
          <Link href={`/campaigns/${campaign.id}`} className="ml-auto text-xs text-primary hover:underline">
            모집건 상세
          </Link>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {campaign.organizer} · {campaign.purpose}
        </p>
      </div>

      {!data && !error && (
        <div className="flex flex-col gap-2" aria-live="polite">
          <p className="text-sm text-muted">확인 신호 {findings.length}건과 관련 지출을 검토하고 있습니다.</p>
          <div className="h-4 w-2/3 animate-pulse rounded bg-[#EEF1F5]" />
          <div className="h-4 w-full animate-pulse rounded bg-[#EEF1F5]" />
        </div>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}

      {data && (
        <>
          <div className="rounded-lg bg-primary-soft px-4 py-3 text-sm">
            <span className="font-bold text-primary">검토 요약 </span>
            {data.summary}
          </div>
          {data.fallbackReason && <p className="text-xs text-warn">{data.fallbackReason}</p>}
          <ul className="flex flex-col gap-3">
            {findings.map((f) => {
              const x = explain.get(f.id);
              const rows = expenses.filter((e) => f.expenseIds.includes(e.id));
              return (
                <li key={f.id} className="rounded-lg border border-line p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${SEV_STYLE[x?.priority ?? f.severity]}`}>우선순위 {x?.priority ?? f.severity}</span>
                    <span className="font-bold">{f.label}</span>
                    <span className="ml-auto font-bold tnum">{won(f.amount)}</span>
                  </div>
                  {x && (
                    <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                      <div>
                        <div className="text-xs font-bold text-bad">확인이 필요한 이유</div>
                        <p className="mt-0.5">{x.explanation}</p>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-ok">정상일 수 있는 경우</div>
                        <p className="mt-0.5">{x.benign}</p>
                      </div>
                    </div>
                  )}
                  {x && x.questions.length > 0 && (
                    <div className="mt-2 rounded-md bg-[#F7F8FA] px-3 py-2 text-sm">
                      <div className="text-xs font-bold">모집기관에 물어볼 질문</div>
                      <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                        {x.questions.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <table className="mt-3 w-full text-xs">
                    <tbody className="divide-y divide-line">
                      {rows.map((e) => (
                        <tr key={e.id}>
                          <td className="py-1.5 pr-2 text-muted tnum">{kst(e.spentAt)}</td>
                          <td className="py-1.5 pr-2">{e.type}</td>
                          <td className="py-1.5 pr-2">
                            {e.description} <span className="text-muted">· {e.vendor}</span>
                          </td>
                          <td className="py-1.5 pr-2 text-muted">{e.receiptId}</td>
                          <td className="py-1.5 text-right tnum">{won(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted">확인 신호는 위법 판정이 아니라 설명이 필요하다는 신호입니다. 최종 판단은 모집기관 설명과 등록청 확인으로 합니다(운영 세칙 제28조·제49조).</p>
        </>
      )}
    </section>
  );
}
