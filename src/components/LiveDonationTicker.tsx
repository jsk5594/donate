"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { timeAgo, won } from "@/lib/format";
import type { PublicDonation } from "@/lib/types";

type LiveItem = PublicDonation & { campaignTitle: string };

/**
 * 실시간 기부 티커 — 5초마다 /api/live 를 폴링해 새 건을 위로 밀어 넣습니다.
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
    if (paused) return;
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
    const id = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [paused]);

  const sumMinute = items.filter((i) => now - new Date(i.donatedAt).getTime() < 60_000).reduce((s, i) => s + i.amount, 0);

  return (
    <div className="flex h-full flex-col rounded-xl border border-line bg-card">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className={`absolute inline-flex h-full w-full rounded-full bg-bad opacity-75 ${paused ? "" : "animate-ping"}`} />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-bad" />
        </span>
        <span className="text-sm font-bold">실시간 기부</span>
        <span className="text-xs text-muted" suppressHydrationWarning>최근 1분 {won(sumMinute)}</span>
        <button type="button" onClick={() => setPaused((p) => !p)} className="ml-auto rounded px-2 py-0.5 text-xs text-muted hover:bg-[#F3F5F8]" aria-pressed={paused}>
          {paused ? "재개" : "일시정지"}
        </button>
      </div>
      <ol className="flex-1 divide-y divide-line overflow-hidden">
        {items.slice(0, 10).map((d, idx) => (
          <li key={d.id} className={`flex items-center gap-3 px-4 py-2 ${fresh.has(d.id) ? "ticker-new" : ""}`}>
            <span className={`w-5 shrink-0 text-center text-sm font-bold tnum ${idx < 3 ? "text-primary" : "text-muted"}`}>{idx + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-semibold">{d.donorAlias}</span>
                <span className="text-xs text-muted">{d.donorType}</span>
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
      </ol>
      <div className="border-t border-line px-4 py-2 text-[11px] text-muted">가명처리된 기부자명 · 5초마다 갱신</div>
    </div>
  );
}
