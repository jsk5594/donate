"use client";

import Link from "next/link";
import { useState } from "react";
import { ScoreBadge } from "./HealthBadge";
import { fmtDate, wonShort } from "@/lib/format";
import type { HealthLevel, Stage } from "@/lib/types";

export interface TreeCampaign {
  id: string;
  title: string;
  startDate: string;
  health: HealthLevel;
  score: number | null;
}

export interface TreeCategory {
  id: string;
  name: string;
  received: number;
  campaigns: TreeCampaign[];
}

export interface TreeGroup {
  phase: Stage;
  count: number;
  categories: TreeCategory[];
}

const PHASE_DOT: Record<Stage, string> = {
  진행중: "bg-primary",
  "진행 예정": "bg-warn",
  종료: "bg-muted",
};

/** 메인 페이지 '기부 현황' 카드 — 진행중 / 진행 예정 / 종료를 ‹ › 로 넘겨 보기 */
export function CampaignTreeCard({ groups }: { groups: TreeGroup[] }) {
  const [idx, setIdx] = useState(0);
  // 항목 접힘 상태 (키: "phase/categoryId") — 기본은 모두 펼침
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setClosed((o) => ({ ...o, [key]: !o[key] }));
  const go = (d: number) => setIdx((i) => (i + d + groups.length) % groups.length);
  const cur = groups[idx];

  return (
    <section className="flex flex-col rounded-xl border border-line bg-card" aria-roledescription="carousel" aria-label="기부 현황">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-5">
        <h2 className="text-base font-bold">기부 현황</h2>
        <Link href="/status" className="ml-auto rounded-md px-2 py-1 text-sm font-semibold text-primary hover:bg-primary-soft">
          자세히 →
        </Link>
      </header>

      {/* ‹ 진행상황 › */}
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <ArrowButton dir="prev" onClick={() => go(-1)} label={`이전: ${groups[(idx - 1 + groups.length) % groups.length].phase}`} />
        <div className="flex flex-1 flex-col items-center" aria-live="polite">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${PHASE_DOT[cur.phase]}`} aria-hidden="true" />
            <h3 className="text-sm font-bold">{cur.phase}</h3>
            <span className="text-xs text-muted tnum">{cur.count}건</span>
          </div>
          <div className="mt-1 flex gap-1.5" aria-hidden="true">
            {groups.map((x, i) => (
              <span key={x.phase} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-primary" : "w-1.5 bg-line"}`} />
            ))}
          </div>
        </div>
        <ArrowButton dir="next" onClick={() => go(1)} label={`다음: ${groups[(idx + 1) % groups.length].phase}`} />
      </div>

      {/* 세 묶음을 같은 칸에 겹쳐 두고 현재 것만 보이게. 높이는 고정(5개년 종료건이 많아 넘치면 카드 안에서 스크롤) */}
      <div className="grid h-[460px]">
      {groups.map((g, gi) => (
      <div key={g.phase} inert={gi !== idx} aria-hidden={gi !== idx} className={`min-h-0 overflow-y-auto px-3 py-3 [grid-area:1/1] ${gi === idx ? "" : "invisible"}`}>
        {g.categories.length === 0 && <p className="px-3 py-1.5 text-xs text-muted">해당 모집건이 없습니다.</p>}
        {g.categories.map((cat) => {
          const key = `${g.phase}/${cat.id}`;
          const isOpen = !closed[key];
          return (
            <div key={key} className="mb-0.5">
              <div className="flex items-center rounded-lg hover:bg-[#F3F5F8]">
                <Link href={`/categories/${cat.id}`} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-3 pr-2">
                  <span className="truncate text-sm font-semibold">{cat.name}</span>
                  {g.phase !== "진행 예정" && <span className="ml-auto shrink-0 text-xs text-muted tnum">{wonShort(cat.received)}</span>}
                </Link>
                <button
                  type="button"
                  aria-label={isOpen ? `${g.phase} ${cat.name} 접기` : `${g.phase} ${cat.name} 펼치기`}
                  aria-expanded={isOpen}
                  onClick={() => toggle(key)}
                  className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-[#E9EDF3]"
                >
                  <Chevron open={isOpen} />
                </button>
              </div>
              {isOpen && (
                <ul className="ml-4 mt-0.5 border-l border-line pl-2">
                  {cat.campaigns.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/campaigns/${c.id}`}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-[#F3F5F8] ${g.phase === "종료" ? "text-muted" : "text-foreground"}`}
                      >
                        <span className="min-w-0 flex-1 truncate">{c.title}</span>
                        {g.phase === "진행 예정" ? (
                          <span className="shrink-0 text-[11px] text-muted tnum">{fmtDate(c.startDate)} 시작</span>
                        ) : (
                          <ScoreBadge score={c.score} level={c.health} />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      ))}
      </div>
    </section>
  );
}

function ArrowButton({ dir, onClick, label }: { dir: "prev" | "next"; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-muted hover:border-primary hover:text-primary">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className={dir === "next" ? "rotate-180" : ""}>
        <path d="M8.5 3L4.5 7l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
