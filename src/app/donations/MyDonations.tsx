"use client";

import Link from "next/link";
import { useState } from "react";
import { fmtDate, fmtDateTime, pct, won, wonShort } from "@/lib/format";
import type { MyDonationsResult } from "@/lib/repository";

/** initialCode/initialResult: 챗봇 등에서 /donations?code=D-XXXXXXXX 로 들어오면 서버에서 미리 조회한 결과 */
export function MyDonations({ initialCode, initialResult }: { initialCode?: string; initialResult?: MyDonationsResult | null }) {
  const [code, setCode] = useState(initialCode ?? "");
  const [result, setResult] = useState<MyDonationsResult | null>(initialResult ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookup(c: string) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/my?code=${encodeURIComponent(c)}`, { cache: "no-store" });
      const data = (await res.json()) as MyDonationsResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "조회 실패");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "조회 중 오류");
    } finally {
      setBusy(false);
    }
  }

  const alloc = result
    ? result.items.reduce(
        (a, i) => ({ program: a.program + i.allocation.program, admin: a.admin + i.allocation.admin, fundraising: a.fundraising + i.allocation.fundraising, balance: a.balance + i.allocation.balance }),
        { program: 0, admin: 0, fundraising: 0, balance: 0 },
      )
    : null;

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) lookup(code.trim());
        }}
        className="flex flex-col gap-3 rounded-xl border border-line bg-card p-5"
      >
        <label htmlFor="code" className="text-xs font-semibold text-muted">
          기부코드
        </label>
        <div className="flex gap-2">
          <input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="D-1A2B3C4D" className="flex-1 rounded-lg border border-line px-4 py-3 font-mono text-lg tracking-wider" autoComplete="off" />
          <button type="submit" disabled={busy || !code.trim()} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-[#163BA3] disabled:opacity-60">
            {busy ? "조회 중…" : "조회"}
          </button>
        </div>
        <p className="text-xs text-muted">기부코드는 기부 완료 안내 문자에 있습니다. 이름이나 연락처 없이 코드만으로 조회합니다.</p>
        {error && <p className="rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad">{error}</p>}
      </form>

      {result && alloc && (
        <>
          <section className="rounded-xl border border-ok/30 bg-ok-bg p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ok">{result.standing.tier}</p>
                <p className="mt-1 text-xl font-bold">{result.donorAlias}님의 기부로 <span className="text-ok tnum">{won(alloc.program)}</span>이 수혜자에게 닿았습니다</p>
                <p className="mt-1 text-sm text-foreground/80">
                  {fmtDate(result.standing.firstDonatedAt)}부터 모집건 {result.standing.campaigns}개와 함께했고, 그중 {result.standing.completedCampaigns}개는 끝까지 전달을 마쳤습니다.
                </p>
              </div>
              {/* 순위는 상위 절반일 때만 보여줌. 기부 규모로 누군가를 민망하게 만들지 않기 위함 */}
              {result.standing.topPercent <= 50 && (
                <div className="rounded-lg bg-card px-4 py-2 text-center">
                  <div className="text-xs text-muted">{result.standing.type} 기부자 {result.standing.of.toLocaleString("ko-KR")}{result.standing.type === "개인" ? "명" : "곳"} 중</div>
                  <div className="text-xl font-bold text-ok tnum">상위 {result.standing.topPercent < 10 ? result.standing.topPercent.toFixed(1) : Math.ceil(result.standing.topPercent)}%</div>
                </div>
              )}
            </div>
            <ul className="mt-3 flex flex-wrap gap-2 text-xs">
              {result.standing.categories.map((c) => (
                <li key={c.name} className="rounded-full bg-card px-2.5 py-1 font-semibold">{c.name} <span className="font-normal text-muted tnum">{wonShort(c.amount)}</span></li>
              ))}
            </ul>
            {result.standing.nextTier && <p className="mt-3 text-xs text-foreground/70">{won(result.standing.nextTier.remaining)} 더 함께하시면 {result.standing.nextTier.name} 단계가 됩니다.</p>}
          </section>

          <section className="rounded-xl border border-line bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className="text-xs text-muted">
                  기부코드 <span className="font-mono">{result.donorCode}</span> · {result.donorAlias}
                </div>
                <div className="mt-1 text-2xl font-bold tnum">총 {won(result.total)}</div>
                <div className="text-xs text-muted">{result.items.length}건</div>
              </div>
              <div className="text-right text-sm">
                <div className="text-xs text-muted">내 기부금 1만원 중 수혜자에게</div>
                <div className="text-xl font-bold text-ok tnum">{Math.round((alloc.program / (result.total || 1)) * 10000).toLocaleString("ko-KR")}원</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1 text-xs font-semibold text-muted">내 기부금은 지금 어디에 있나 (모집건별 집행 비율로 비례 배분)</div>
              <div className="flex h-4 overflow-hidden rounded-full bg-[#E9EDF3]" role="img" aria-label={`기부됨 ${pct(alloc.program / result.total)}, 운영비 ${pct(alloc.admin / result.total)}, 모금비용 ${pct(alloc.fundraising / result.total)}, 잔액 ${pct(alloc.balance / result.total)}`}>
                <div style={{ width: `${(alloc.program / result.total) * 100}%`, background: "var(--out-program)" }} />
                <div style={{ width: `${(alloc.admin / result.total) * 100}%`, background: "var(--out-admin)" }} />
                <div style={{ width: `${(alloc.fundraising / result.total) * 100}%`, background: "var(--out-fundraising)" }} />
                <div style={{ width: `${(alloc.balance / result.total) * 100}%`, background: "var(--out-balance)" }} />
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
                <Leg c="var(--out-program)" l="기부됨" v={alloc.program} />
                <Leg c="var(--out-admin)" l="운영비" v={alloc.admin} />
                <Leg c="var(--out-fundraising)" l="모금비용" v={alloc.fundraising} />
                <Leg c="var(--out-balance)" l="미집행 잔액" v={alloc.balance} />
              </ul>
            </div>
          </section>

          <ul className="flex flex-col gap-3">
            {result.items.map((i) => (
              <li key={i.id} className="rounded-xl border border-line bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link href={`/campaigns/${i.campaignId}`} className="text-[15px] font-bold hover:text-primary">
                      {i.campaignTitle}
                    </Link>
                    <div className="text-xs text-muted">
                      {fmtDateTime(i.donatedAt)} · {i.method} · 거래 {i.id}
                    </div>
                  </div>
                  <div className="text-lg font-bold tnum">{won(i.amount)}</div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <span>기부됨 <strong className="tnum">{won(i.allocation.program)}</strong></span>
                  <span>운영비 <strong className="tnum">{won(i.allocation.admin)}</strong></span>
                  <span>모금비용 <strong className="tnum">{won(i.allocation.fundraising)}</strong></span>
                  <span>잔액 <strong className="tnum">{won(i.allocation.balance)}</strong></span>
                </div>
                {i.message && <div className="mt-2 rounded bg-[#F3F5F8] px-2 py-1 text-xs">내 메시지: “{i.message}”</div>}
                <div className="mt-3 flex gap-2 text-xs">
                  <Link href={`/campaigns/${i.campaignId}`} className="rounded-md border border-line px-2.5 py-1 hover:bg-[#F3F5F8]">
                    이 모집건 대차대조표
                  </Link>
                  <Link href={`/reports/${i.campaignId}`} className="rounded-md border border-line px-2.5 py-1 hover:bg-[#F3F5F8]">
                    최신 공개보고
                  </Link>
                  <span className="rounded-md border border-dashed border-line px-2.5 py-1 text-muted" title="모집기관 시스템과 연계 후 제공">
                    기부금영수증 (연계 예정)
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Leg({ c, l, v }: { c: string; l: string; v: number }) {
  return (
    <li className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} aria-hidden="true" />
      <span className="text-muted">{l}</span>
      <span className="ml-auto font-semibold tnum">{won(v)}</span>
    </li>
  );
}
