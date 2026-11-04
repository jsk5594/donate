"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { HealthBadge } from "./HealthBadge";
import { fmtDate, wonShort } from "@/lib/format";
import type { CampaignPhase, HealthLevel } from "@/lib/types";

export interface SidebarCampaign {
  id: string;
  title: string;
  region: string;
  status: string;
  startDate: string;
  health: HealthLevel;
  received: number;
}

export interface SidebarCategory {
  id: string;
  name: string;
  received: number;
  campaigns: SidebarCampaign[];
}

export interface SidebarGroup {
  phase: CampaignPhase;
  count: number;
  categories: SidebarCategory[];
}

const PHASE_DOT: Record<CampaignPhase, string> = {
  진행중: "bg-primary",
  "진행 예정": "bg-warn",
  완료: "bg-muted",
};

export function Sidebar({ groups }: { groups: SidebarGroup[] }) {
  const pathname = usePathname();
  // 그룹·항목 접힘 상태 (키: "phase" 또는 "phase/categoryId") — 기본은 모두 펼침
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  // 데스크톱: 사이드바를 왼쪽으로 집어넣기(얇은 막대만 남김)
  const [collapsed, setCollapsed] = useState(false);
  const toggle = (key: string) => setClosed((o) => ({ ...o, [key]: !o[key] }));

  // 접기/펼치기: 바깥 폭이 줄어드는 동안 안쪽 패널은 왼쪽으로 미끄러지며 흐려지고, 얇은 막대가 뒤따라 나타남
  const ease = "duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";
  return (
    <aside
      className={`relative w-full shrink-0 border-b border-line bg-card transition-[width] lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-hidden lg:border-b-0 lg:border-r ${ease} ${collapsed ? "lg:w-11" : "lg:w-72"}`}
    >
      <div
        className={`hidden transition-opacity lg:absolute lg:inset-0 lg:flex lg:flex-col lg:items-center lg:pt-4 ${ease} ${collapsed ? "lg:opacity-100 lg:delay-150" : "lg:pointer-events-none lg:opacity-0"}`}
        aria-hidden={!collapsed}
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          tabIndex={collapsed ? 0 : -1}
          aria-label="기부 현황 펼치기"
          aria-expanded={false}
          title="기부 현황 펼치기"
          className="flex flex-col items-center gap-2 rounded-md px-1.5 py-2 text-muted hover:bg-[#F3F5F8] hover:text-primary"
        >
          <SideArrow dir="right" />
          <span className="text-center text-xs font-semibold leading-tight">
            기부
            <br />
            현황
          </span>
        </button>
      </div>
      <div
        inert={collapsed}
        className={`lg:h-full lg:w-72 lg:overflow-y-auto transition-[transform,opacity] ${ease} ${collapsed ? "lg:-translate-x-full lg:opacity-0" : "lg:translate-x-0 lg:opacity-100"}`}
      >
      <div className="flex items-center justify-between px-4 pb-2 pt-4 lg:pt-5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">기부 현황</span>
        <Link href="/status" className="ml-auto mr-1 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-soft">
          자세히 →
        </Link>
        <button type="button" onClick={() => setMobileOpen((v) => !v)} aria-expanded={mobileOpen} className="rounded-md border border-line px-2.5 py-1 text-xs lg:hidden">
          {mobileOpen ? "접기" : "항목 펼치기"}
        </button>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="기부 현황 집어넣기"
          aria-expanded={true}
          title="왼쪽으로 집어넣기"
          className="hidden h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-[#F3F5F8] hover:text-primary lg:flex"
        >
          <SideArrow dir="left" />
        </button>
      </div>
      <nav className={`px-2 pb-6 ${mobileOpen ? "" : "hidden lg:block"}`}>
        {groups.map((g) => {
          const groupOpen = !closed[g.phase];
          return (
            <section key={g.phase} className="mb-3">
              <button
                type="button"
                onClick={() => toggle(g.phase)}
                aria-expanded={groupOpen}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[#F3F5F8]"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${PHASE_DOT[g.phase]}`} aria-hidden="true" />
                <span className="text-[13px] font-bold">{g.phase}</span>
                <span className="text-xs text-muted tnum">{g.count}건</span>
                <Chevron open={groupOpen} className="ml-auto text-muted" />
              </button>

              {groupOpen && (
                <div className="mt-0.5">
                  {g.categories.length === 0 && <p className="px-3 py-1.5 text-xs text-muted">해당 모집건이 없습니다.</p>}
                  {g.categories.map((cat) => {
                    const key = `${g.phase}/${cat.id}`;
                    const isOpen = !closed[key];
                    const catActive = pathname === `/categories/${cat.id}`;
                    return (
                      <div key={key} className="mb-0.5">
                        <div className={`flex items-center rounded-lg ${catActive ? "bg-primary-soft" : "hover:bg-[#F3F5F8]"}`}>
                          <Link href={`/categories/${cat.id}`} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-4 pr-2">
                            <span className={`truncate text-sm font-semibold ${catActive ? "text-primary" : ""}`}>{cat.name}</span>
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
                          <ul className="ml-5 mt-0.5 border-l border-line pl-2">
                            {cat.campaigns.map((c) => {
                              const active = pathname === `/campaigns/${c.id}`;
                              return (
                                <li key={c.id}>
                                  <Link
                                    href={`/campaigns/${c.id}`}
                                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] ${active ? "bg-primary-soft font-semibold text-primary" : g.phase === "완료" ? "text-muted hover:bg-[#F3F5F8]" : "text-foreground hover:bg-[#F3F5F8]"}`}
                                  >
                                    <span className="min-w-0 flex-1 truncate">{c.title}</span>
                                    {g.phase === "진행 예정" ? (
                                      <span className="shrink-0 text-[11px] text-muted tnum">{fmtDate(c.startDate)} 시작</span>
                                    ) : (
                                      <HealthBadge level={c.health} />
                                    )}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </nav>
      <div className={`mx-4 mb-6 rounded-lg bg-[#F3F5F8] p-3 text-xs leading-relaxed text-muted ${mobileOpen ? "" : "hidden lg:block"}`}>
        배지는 운영 세칙 판정의 종합 등급입니다. <Link href="/rules/scoring" className="text-primary underline-offset-2 hover:underline">판정 기준표 보기</Link>
      </div>
      </div>
    </aside>
  );
}

function SideArrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={dir === "right" ? "rotate-180" : ""}>
      <path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 2.5v11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Chevron({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""} ${className}`}>
      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
