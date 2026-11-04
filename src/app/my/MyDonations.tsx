"use client";

import Link from "next/link";
import { useState } from "react";
import { fmtDateTime, pct, won } from "@/lib/format";
import type { MyDonationsResult } from "@/lib/repository";

export function MyDonations({ samples }: { samples: { code: string; alias: string; count: number }[] }) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<MyDonationsResult | null>(null);
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
          <input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="D-1A2B" className="flex-1 rounded-lg border border-line px-4 py-3 font-mono text-lg tracking-wider" autoComplete="off" />
          <button type="submit" disabled={busy || !code.trim()} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-[#163BA3] disabled:opacity-60">
            {busy ? "조회 중…" : "조회"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>데모용 코드:</span>
          {samples.map((s) => (
            <button
              key={s.code}
              type="button"
              onClick={() => {
                setCode(s.code);
                lookup(s.code);
              }}
              className="rounded-full border border-line px-2.5 py-1 font-mono hover:bg-[#F3F5F8]"
            >
              {s.code} <span className="font-sans text-muted">({s.alias} · {s.count}건)</span>
            </button>
          ))}
        </div>
        {error && <p className="rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad">{error}</p>}
      </form>

      {result && alloc && (
        <>
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
              <ul className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
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
