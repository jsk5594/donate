"use client";

import { useId, useState, type ReactNode } from "react";

/** 메인 상단 카드: 아래 화살표를 누르면 카드가 아래로 열리며 panel(전체 대차대조표)을 보여줌 */
export function HeroExpand({ top, panel, label }: { top: ReactNode; panel: ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const ease = "duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";

  return (
    <section className="rounded-2xl bg-[#15202B] text-white">
      <div className="px-6 pb-1 pt-5 md:px-8 md:pt-6">{top}</div>

      {/* 0fr → 1fr 그리드 행 전환으로 높이를 부드럽게 펼침 */}
      <div id={panelId} inert={!open} className={`grid transition-[grid-template-rows,opacity] ${ease} ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="mx-3 mt-2 rounded-xl bg-card p-5 text-foreground md:mx-5">{panel}</div>
        </div>
      </div>

      <div className="flex justify-center pb-2 pt-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="group flex items-center gap-1.5 rounded-full px-4 py-1 text-xs font-semibold text-[#B9C4D3] hover:bg-white/10 hover:text-white"
        >
          {open ? `${label} 접기` : `${label} 보기`}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={`transition-transform ${ease} ${open ? "rotate-180" : ""}`}>
            <path d="M3.5 6l4.5 4.5L12.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </section>
  );
}
