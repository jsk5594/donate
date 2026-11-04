"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { fmtDateTime } from "@/lib/format";
import type { ReportDraft } from "@/lib/types";

export const DRAFT_KEY = "donation-cctv:report-drafts";
const EVENT = "donation-cctv:drafts-changed";

export function loadDrafts(): ReportDraft[] {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "[]") as ReportDraft[];
  } catch {
    return [];
  }
}

export function saveDrafts(list: ReportDraft[]) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* 저장 불가 환경(사생활 모드 등)은 무시 */
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}
function getSnapshot() {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
const getServerSnapshot = () => "[]";

/** 브라우저 저장 초안을 구독 — 서버 렌더에서는 빈 배열 */
export function useDrafts(): ReportDraft[] {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => {
    try {
      return JSON.parse(raw) as ReportDraft[];
    } catch {
      return [];
    }
  }, [raw]);
}

/** 담당자가 작성 중인 초안 — DB 연결 전까지는 브라우저에만 저장 */
export function SavedDrafts() {
  const drafts = useDrafts();
  if (drafts.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-card">
      <div className="flex items-center justify-between border-b border-line bg-[#F7F8FA] px-5 py-2.5 text-xs font-semibold text-muted">
        <span>내가 작성 중인 초안 (이 브라우저에만 저장됨)</span>
        <button type="button" onClick={() => saveDrafts([])} className="text-xs text-muted hover:text-bad">
          모두 삭제
        </button>
      </div>
      <ul className="divide-y divide-line">
        {drafts.map((d) => (
          <li key={d.id}>
            <Link href={`/reports/new?draft=${d.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-[#F7F8FA]">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{d.title}</span>
              <span className="rounded bg-[#F3F5F8] px-1.5 py-0.5 text-[11px] text-muted">{d.generatedBy === "llm" ? "LLM 다듬음" : "템플릿"}</span>
              <span className="text-xs text-muted">{fmtDateTime(d.createdAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
