"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { timeAgo, won } from "@/lib/format";
import type { PublicDonation } from "@/lib/types";

type LiveItem = PublicDonation & { campaignTitle: string };

/** 갱신 주기: 1분 */
const POLL_MS = 60_000;
/** 실시간 합성 기부 일시 중지 — true면 폴링하지 않고 DB의 최근 기부만 보여줌. 다시 켜려면 false */
const LIVE_PAUSED = true;
/** 흐르는 속도: 항목 하나가 지나가는 시간(초). 건수가 달라도 속도가 일정하도록 전체 시간을 건수에 비례시킴 */
const SECONDS_PER_ITEM = 6;
const TYPE_STYLE: Record<PublicDonation["donorType"], string> = {
  개인: "bg-primary-soft text-primary",
  기업: "bg-ok-bg text-ok",
  단체: "bg-warn-bg text-warn",
};

/**
 * 기부 전광판 — 뉴스의 증시 자막처럼 최근 기부가 오른쪽에서 왼쪽으로 흐릅니다.
 * 같은 목록을 두 벌 이어 붙여 절반만큼 이동시키므로 끊김 없이 반복됩니다.
 * 마우스를 올리면 멈춰서 링크를 누를 수 있습니다. DB 연결 후에는 폴링 주기만 조정하거나 SSE로 바꾸면 됩니다.
 */
export function LiveDonationTicker({ initial }: { initial: LiveItem[] }) {
  const [items, setItems] = useState<LiveItem[]>(initial);
  const [now, setNow] = useState(() => Date.now());

  // "n분 전" 글자 폭이 자주 바뀌면 흐름이 튀므로 1분마다만 다시 계산
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), POLL_MS);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (LIVE_PAUSED) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: LiveItem[] };
        if (alive) setItems(data.items);
      } catch {
        /* 네트워크 오류는 다음 폴링에서 복구 */
      }
    };
    const id = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (items.length === 0) return null;

  const title = LIVE_PAUSED ? "최근 기부" : "실시간 기부";
  const list = (copy: boolean) => (
    <ul className="flex shrink-0" inert={copy} aria-hidden={copy || undefined}>
      {items.map((d) => (
        <li key={d.id} className="flex items-center gap-2 whitespace-nowrap border-r border-line px-5 text-sm">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TYPE_STYLE[d.donorType]}`}>{d.donorType}</span>
          <span className="font-semibold">{d.donorAlias}</span>
          <Link href={`/campaigns/${d.campaignId}`} className="text-muted hover:text-primary">
            {d.campaignTitle}
          </Link>
          <span className="font-bold tnum">{won(d.amount)}</span>
          <span className="text-xs text-muted" suppressHydrationWarning>{timeAgo(d.donatedAt, now)}</span>
        </li>
      ))}
    </ul>
  );

  return (
    // 본문 폭을 벗어나 화면 양 끝까지 닿는 띠 (넘치는 폭은 body의 overflow-x-clip이 자름)
    <section aria-label={`${title}(기부자명은 가명)`} className="no-print -mt-6 ml-[calc(50%-50vw)] flex h-11 w-screen items-stretch border-b border-line bg-card">
      <h2 className="flex shrink-0 items-center gap-2 border-r border-line px-4 text-sm font-bold lg:px-5">
        <span className="relative flex h-2.5 w-2.5">
          <span className={`absolute inline-flex h-full w-full rounded-full bg-bad opacity-75 ${LIVE_PAUSED ? "hidden" : "animate-ping"}`} />
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${LIVE_PAUSED ? "bg-muted" : "bg-bad"}`} />
        </span>
        {title}
      </h2>
      <div className="ticker-band min-w-0 flex-1">
        <div className="ticker-track h-full" style={{ animationDuration: `${items.length * SECONDS_PER_ITEM}s` }}>
          {list(false)}
          {list(true)}
        </div>
      </div>
    </section>
  );
}
