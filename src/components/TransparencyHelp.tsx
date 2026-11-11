"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { SCORE_BANDS, SCORE_WEIGHTS } from "@/lib/rules";

/** 투명도 점수를 이루는 7개 기준(배점은 운영 세칙과 같은 값) */
const CRITERIA: { key: keyof typeof SCORE_WEIGHTS; label: string; desc: string }[] = [
  { key: "integrity", label: "장부 일치", desc: "들어온 돈 = 나간 돈 + 남은 돈" },
  { key: "fundraising", label: "모금에 쓴 돈 비율", desc: "법정·세칙 한도 이내인가" },
  { key: "admin", label: "운영비 비율", desc: "기부받은 돈의 10% 이내인가" },
  { key: "program", label: "수혜자에게 간 비율", desc: "쓴 돈 대부분이 수혜자에게 갔는가" },
  { key: "balance", label: "남은 돈", desc: "모집이 끝난 뒤 쌓여만 있지 않은가" },
  { key: "disclosure", label: "사용 내역 공개", desc: "정해진 주기마다 공개했는가" },
  { key: "registration", label: "모집등록·기간", desc: "등록하고 기간을 지켰는가" },
];

/**
 * '투명도란?' 안내 — 처음 온 사람이 투명도 점수의 뜻을 바로 확인하도록 버튼을 누르면 설명 창이 열림.
 * tone: dark(어두운 요약 카드 위) / light(일반 카드)
 */
export function TransparencyHelp({ tone = "light", align = "left" }: { tone?: "dark" | "light"; align?: "left" | "right" | "center" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const btn =
    tone === "dark"
      ? "border-white/25 text-[#D5DDE8] hover:border-white/60 hover:text-white"
      : "border-line text-muted hover:border-primary hover:text-primary";
  const pos = align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0";

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${btn}`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="5.25" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4.6 4.6a1.45 1.45 0 1 1 2 1.35c-.4.18-.6.45-.6.85v.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="6" cy="8.85" r=".7" fill="currentColor" />
        </svg>
        투명도란?
      </button>
      {open && (
        <div id={panelId} role="dialog" aria-label="투명도 점수 안내" className={`absolute top-full z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-card p-4 text-left text-sm font-normal text-foreground shadow-xl ${pos}`}>
          <p className="font-bold">투명도 점수는 &lsquo;기부금이 약속대로 쓰이고 있는가&rsquo;를 100점으로 나타낸 값입니다.</p>
          <p className="mt-1 text-xs text-muted">모든 모집건의 장부를 매일 운영 세칙 7개 기준으로 점검해 기준별 점수를 더합니다.</p>
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line text-xs">
            {CRITERIA.map((c) => (
              <li key={c.key} className="flex items-center gap-2 px-3 py-1.5">
                <span className="whitespace-nowrap font-semibold">{c.label}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{c.desc}</span>
                <span className="shrink-0 font-semibold tnum">{SCORE_WEIGHTS[c.key]}점</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-xs">
            <span className="rounded-md bg-ok-bg px-1 py-1.5 font-semibold text-ok">{SCORE_BANDS.good}점 이상<br />통과</span>
            <span className="rounded-md bg-warn-bg px-1 py-1.5 font-semibold text-warn">{SCORE_BANDS.warn}~{SCORE_BANDS.good - 1}점<br />주의</span>
            <span className="rounded-md bg-bad-bg px-1 py-1.5 font-semibold text-bad">{SCORE_BANDS.warn}점 미만<br />기준 초과</span>
          </div>
          <p className="mt-3 text-xs text-muted">점수가 낮다고 부정이 있다는 뜻은 아닙니다. 기부하기 전에 한 번 더 살펴볼 곳을 알려 주는 신호입니다.</p>
          <Link href="/rules" onClick={() => setOpen(false)} className="mt-2 inline-block text-xs font-semibold text-primary hover:underline">
            판정 기준 자세히 보기(운영 세칙) →
          </Link>
        </div>
      )}
    </span>
  );
}
