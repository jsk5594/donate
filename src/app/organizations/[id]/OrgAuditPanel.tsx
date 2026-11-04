"use client";

import { useEffect, useState } from "react";
import { AiEngineBadge } from "@/components/AiEngineBadge";
import { TrustGradeBadge } from "@/components/TrustGradeBadge";
import type { OrgAuditResult } from "@/lib/ai/org-audit";

/** AI 감사의견 — 페이지는 먼저 그리고, 의견은 AI 응답을 받아 채움 */
export function OrgAuditPanel({ orgId }: { orgId: string }) {
  const [data, setData] = useState<OrgAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/organizations/${orgId}/audit`)
      .then(async (r) => {
        if (!r.ok) throw new Error("감사의견을 불러오지 못했습니다.");
        return (await r.json()) as OrgAuditResult;
      })
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [orgId]);

  return (
    <section className="rounded-xl border-2 border-primary/30 bg-card p-5" aria-busy={!data && !error}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">AI 감사의견</h2>
        {data && <AiEngineBadge engine={data.engine} />}
      </div>

      {!data && !error && (
        <div className="mt-4 flex flex-col gap-2" aria-live="polite">
          <p className="text-sm text-muted">AI가 5년치 결산 공시·감사의견·처분 이력을 읽고 있습니다…</p>
          <div className="h-4 w-2/3 animate-pulse rounded bg-[#EEF1F5]" />
          <div className="h-4 w-full animate-pulse rounded bg-[#EEF1F5]" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-[#EEF1F5]" />
        </div>
      )}
      {error && <p className="mt-4 text-sm text-bad">{error}</p>}

      {data && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <TrustGradeBadge grade={data.opinion.grade} size="md" />
            <span className="text-sm text-muted tnum">신뢰 점수 {data.opinion.score} / 100</span>
          </div>
          <p className="text-base font-semibold leading-relaxed">{data.opinion.headline}</p>
          <p className="text-sm leading-relaxed text-foreground/85">{data.opinion.summary}</p>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold text-ok">믿을 수 있는 근거</h3>
              {data.opinion.strengths.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {data.opinion.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">뚜렷한 강점이 확인되지 않았습니다.</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-bad">확인이 필요한 점</h3>
              {data.opinion.risks.length ? (
                <ul className="mt-2 space-y-2 text-sm">
                  {data.opinion.risks.map((r, i) => (
                    <li key={i} className="rounded-lg bg-[#F7F8FA] px-3 py-2">
                      <div className="font-semibold">{r.title}</div>
                      <div className="text-xs text-muted">근거: {r.evidence}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">특별한 위험 신호가 없습니다.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-primary-soft px-4 py-3 text-sm">
            <span className="font-bold text-primary">기부 전 권고 </span>
            {data.opinion.advice}
          </div>
          {data.fallbackReason && <p className="text-xs text-warn">{data.fallbackReason}</p>}
          <p className="text-xs text-muted">AI 의견은 아래 공시 데이터만 근거로 작성되며, 최종 판단은 기부자에게 있습니다.</p>
        </div>
      )}
    </section>
  );
}
