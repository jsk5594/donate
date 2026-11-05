"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { timeAgo, won } from "@/lib/format";
import type { PublicDonation } from "@/lib/types";

type LiveItem = PublicDonation & { campaignTitle: string };

/** 갱신 주기: 1분 */
const POLL_MS = 60_000;
/** 실시간 합성 기부 일시 중지 — true면 폴링하지 않고 DB의 최근 기부만 보여줌. 다시 켜려면 false */
const LIVE_PAUSED = true;
/** 표시 건수: 카드 높이 안에 스크롤 없이 들어가는 8건 */
const SHOW = 8;
const TYPE_STYLE: Record<PublicDonation["donorType"], string> = {
  개인: "bg-primary-soft text-primary",
  기업: "bg-ok-bg text-ok",
  단체: "bg-warn-bg text-warn",
};

/**
 * 실시간 기부 티커 — 1분마다 /api/live 를 폴링해 새 건을 위로 밀어 넣습니다.
 * DB 연결 후에는 폴링 주기만 조정하거나 SSE로 바꾸면 됩니다.
 */
export function LiveDonationTicker({ initial }: { initial: LiveItem[] }) {
  const [items, setItems] = useState<LiveItem[]>(initial);
  const [now, setNow] = useState(() => Date.now());
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [paused, setPaused] = useState(false);
  const known = useRef(new Set(initial.map((i) => i.id)));

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (paused || LIVE_PAUSED) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: LiveItem[] };
        if (!alive) return;
        const newOnes = data.items.filter((i) => !known.current.has(i.id));
        newOnes.forEach((i) => known.current.add(i.id));
        if (newOnes.length) setFresh(new Set(newOnes.map((i) => i.id)));
        setItems(data.items);
      } catch {
        /* 네트워크 오류는 다음 폴링에서 복구 */
      }
    };
    const id = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [paused]);

  const sumMinute = items.filter((i) => now - new Date(i.donatedAt).getTime() < 60_000).reduce((s, i) => s + i.amount, 0);

  return (
    <div className="flex h-full flex-col rounded-xl border border-line bg-card">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-5">
        <span className="relative flex h-2.5 w-2.5">
          <span className={`absolute inline-flex h-full w-full rounded-full bg-bad opacity-75 ${paused || LIVE_PAUSED ? "hidden" : "animate-ping"}`} />
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${LIVE_PAUSED ? "bg-muted" : "bg-bad"}`} />
        </span>
        <h2 className="text-base font-bold">{LIVE_PAUSED ? "최근 기부" : "실시간 기부"}</h2>
        {LIVE_PAUSED ? (
          <span className="ml-auto rounded bg-[#F3F5F8] px-2 py-0.5 text-xs text-muted">실시간 갱신 일시 중지</span>
        ) : (
          <>
            <span className="text-xs text-muted" suppressHydrationWarning>최근 1분 {won(sumMinute)}</span>
            <button type="button" onClick={() => setPaused((p) => !p)} className="ml-auto rounded px-2 py-0.5 text-xs text-muted hover:bg-[#F3F5F8]" aria-pressed={paused}>
              {paused ? "재개" : "일시정지"}
            </button>
          </>
        )}
      </div>
      {/* 8줄이 카드 높이를 똑같이 나눠 가짐(flex-1) → 잘리지 않고 간격 일정 */}
      <ul className="flex min-h-0 flex-1 flex-col divide-y divide-line overflow-hidden">
        {items.slice(0, SHOW).map((d) => (
          <li key={d.id} className={`flex min-h-0 flex-1 items-center gap-3 px-4 py-1 ${fresh.has(d.id) ? "ticker-new" : ""}`}>
            {/* 순위처럼 보이는 번호 대신 기부자 유형 아이콘 */}
            <span className={`flex h-6 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${TYPE_STYLE[d.donorType]}`}>{d.donorType}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-semibold">{d.donorAlias}</span>
                {fresh.has(d.id) && <span className="rounded bg-bad-bg px-1 text-[10px] font-bold text-bad">NEW</span>}
              </div>
              <Link href={`/campaigns/${d.campaignId}`} className="block truncate text-xs text-muted hover:text-primary">
                {d.campaignTitle}
              </Link>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-bold tnum">{won(d.amount)}</div>
              <div className="text-[11px] text-muted" suppressHydrationWarning>{timeAgo(d.donatedAt, now)}</div>
            </div>
          </li>
        ))}
      </ul>
      <div className="border-t border-line px-4 py-2 text-[11px] text-muted">가명처리된 기부자명 · {LIVE_PAUSED ? "DB에 기록된 가장 최근 기부" : "1분마다 갱신"}</div>
    </div>
  );
}
