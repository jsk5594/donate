"use client";

import { pct, won, wonShort } from "@/lib/format";
import type { BalanceSheet } from "@/lib/types";

export type SegmentKey = "individual" | "corporate" | "group" | "other" | "program" | "admin" | "fundraising" | "balance";

export interface Segment {
  key: SegmentKey;
  side: "in" | "out";
  label: string;
  sub: string;
  color: string;
  amount: number;
}

export function segmentsOf(sheet: BalanceSheet): Segment[] {
  return [
    { key: "individual", side: "in", label: "개인 기부", sub: "개인 기부자 입금", color: "var(--in-individual)", amount: sheet.inflow.individual },
    { key: "corporate", side: "in", label: "기업 기부", sub: "법인·사업자 입금", color: "var(--in-corporate)", amount: sheet.inflow.corporate },
    { key: "group", side: "in", label: "단체 기부", sub: "모임·협회·종교단체", color: "var(--in-group)", amount: sheet.inflow.group },
    { key: "other", side: "in", label: "이자 등 기타수입", sub: "전용계좌 이자수익", color: "var(--in-other)", amount: sheet.inflow.other },
    { key: "program", side: "out", label: "기부됨 (사업수행비용)", sub: "수혜자에게 전달·사업 현장 집행", color: "var(--out-program)", amount: sheet.outflow.program },
    { key: "admin", side: "out", label: "운영비 (일반관리비용)", sub: "인건비·임차·회계감사·통신", color: "var(--out-admin)", amount: sheet.outflow.admin },
    { key: "fundraising", side: "out", label: "모금비용", sub: "홍보·결제수수료·문자·행사", color: "var(--out-fundraising)", amount: sheet.outflow.fundraising },
    { key: "balance", side: "out", label: "미집행 잔액", sub: "다음 공개주기로 이월", color: "var(--out-balance)", amount: sheet.outflow.balance },
  ];
}

interface Props {
  sheet: BalanceSheet;
  selected: SegmentKey | null;
  onSelect: (key: SegmentKey | null) => void;
  height?: number;
  compact?: boolean;
}

export function BalanceSheetChart({ sheet, selected, onSelect, height = 380, compact = false }: Props) {
  const segs = segmentsOf(sheet);
  const total = Math.max(sheet.inflow.total, sheet.outflow.total, 1);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
      <Column side="in" title="기부받은 돈 (차변)" caption="누가 보냈나" segs={segs} sheet={sheet} total={total} height={height} selected={selected} compact={compact} onSelect={onSelect} />
      <Column side="out" title="쓰인 돈 + 잔액 (대변)" caption="어디에 갔나" segs={segs} sheet={sheet} total={total} height={height} selected={selected} compact={compact} onSelect={onSelect} />
    </div>
  );
}

function Column({ side, title, caption, segs, sheet, total, height, selected, compact, onSelect }: { side: "in" | "out"; title: string; caption: string; segs: Segment[]; sheet: BalanceSheet; total: number; height: number; selected: SegmentKey | null; compact: boolean; onSelect: (k: SegmentKey | null) => void }) {
  const list = segs.filter((s) => s.side === side && s.amount > 0);
  const colTotal = side === "in" ? sheet.inflow.total : sheet.outflow.total;
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-muted">{title}</div>
          <div className="text-lg font-bold tnum">{won(colTotal)}</div>
        </div>
        <div className="text-xs text-muted">{caption}</div>
      </div>
      <div className="flex flex-col-reverse overflow-hidden rounded-xl border border-line bg-[#F7F8FA]" style={{ height }}>
        {list.map((s) => {
          const h = (s.amount / total) * height;
          const isSel = selected === s.key;
          const dim = selected !== null && !isSel;
          // 미집행 잔액은 '아직 쓰이지 않은 돈'이라 점선 테두리 + 옅은 배경으로 구분한다.
          const pending = s.key === "balance";
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onSelect(isSel ? null : s.key)}
              aria-pressed={isSel}
              aria-label={`${s.label} ${won(s.amount)} (${pct(s.amount / colTotal)}) — 자세히 보기`}
              title={`${s.label} · ${won(s.amount)}`}
              className="relative w-full cursor-pointer text-left outline-none transition-[opacity,filter] focus-visible:ring-2 focus-visible:ring-primary"
              style={{
                height: Math.max(h, 8),
                background: pending ? `color-mix(in srgb, ${s.color} 35%, transparent)` : s.color,
                border: pending ? `2px dashed ${isSel ? "#15202B" : "#5b6878"}` : undefined,
                opacity: dim ? 0.35 : 1,
                filter: isSel ? "brightness(1.08)" : undefined,
                boxShadow: pending ? undefined : isSel ? "inset 0 0 0 3px #15202B" : "inset 0 -1px 0 rgba(255,255,255,.5)",
              }}
            >
              {h >= 24 && (
                <span className={`absolute inset-x-3 top-1/2 -translate-y-1/2 truncate ${compact ? "text-xs" : "text-[13px]"} font-semibold ${s.key === "other" || s.key === "group" || s.key === "balance" ? "text-foreground" : "text-white"}`}>
                  {s.label} <span className="font-normal opacity-90">{wonShort(s.amount)} · {pct(s.amount / colTotal, 0)}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <ul className="mt-3 space-y-1.5">
        {segs
          .filter((s) => s.side === side)
          .map((s) => {
            const isSel = selected === s.key;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => onSelect(isSel ? null : s.key)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] hover:bg-[#F3F5F8] ${isSel ? "bg-[#F3F5F8] font-semibold" : ""}`}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={s.key === "balance" ? { background: `color-mix(in srgb, ${s.color} 35%, transparent)`, border: "1.5px dashed #5b6878" } : { background: s.color }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{s.label}</span>
                  <span className="shrink-0 text-muted tnum">{pct(colTotal ? s.amount / colTotal : 0)}</span>
                  <span className="w-28 shrink-0 text-right tnum">{won(s.amount)}</span>
                </button>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
