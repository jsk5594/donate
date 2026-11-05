"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BalanceSheetChart, segmentsOf, type SegmentKey } from "./BalanceSheetChart";
import { fmtDate, fmtDateTime, pct, won } from "@/lib/format";
import type { BalanceSheet, PublicDonation, PublicExpense } from "@/lib/types";

interface Props {
  sheet: BalanceSheet;
  donations: PublicDonation[];
  expenses: PublicExpense[];
  /** 전체/카테고리 화면처럼 여러 모집건이 섞일 때 캠페인명 표시용 */
  campaignTitles?: Record<string, string>;
  campaignEnded?: boolean;
  initialSelected?: SegmentKey | null;
  height?: number;
  /** 그래프 최대 가로(px) — 지정하면 가운데 정렬, 아래 상세 카드는 전체 폭 유지 */
  chartMaxWidth?: number;
  /** donations를 일부만 넘길 때(메인 전체 화면) 유형별 전체 건수·최고액 */
  donorStats?: Partial<Record<PublicDonation["donorType"], { count: number; max: number }>>;
}

const DONOR_TYPE_OF: Partial<Record<SegmentKey, PublicDonation["donorType"]>> = { individual: "개인", corporate: "기업", group: "단체" };
const EXPENSE_TYPE_OF: Partial<Record<SegmentKey, PublicExpense["type"]>> = { program: "사업수행비용", admin: "일반관리비용", fundraising: "모금비용" };

export function BalanceExplorer({ sheet, donations, expenses, campaignTitles, campaignEnded, initialSelected = null, height, chartMaxWidth, donorStats }: Props) {
  const [selected, setSelected] = useState<SegmentKey | null>(initialSelected);
  const [openStat, setOpenStat] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const seg = useMemo(() => segmentsOf(sheet).find((s) => s.key === selected) ?? null, [sheet, selected]);

  const select = (k: SegmentKey | null) => {
    setSelected(k);
    setOpenStat(null);
    setShowAll(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto flex w-full flex-col gap-6" style={{ maxWidth: chartMaxWidth }}>
        <BalanceSheetChart sheet={sheet} selected={selected} onSelect={select} height={height} />

        {!seg && (
          <div className="rounded-xl border border-dashed border-line bg-card px-5 py-4 text-sm text-muted">
            그래프의 항목(막대 또는 범례)을 클릭하면 누가 얼마를 기부했는지, 어떤 통계목으로 얼마를 썼는지 카드로 펼쳐집니다.
          </div>
        )}
      </div>

      {seg && (
        <section className="rounded-xl border border-line bg-card" aria-live="polite">
          <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <span className="h-3.5 w-3.5 rounded-sm" style={{ background: seg.color }} aria-hidden="true" />
            <h3 className="text-base font-bold">{seg.label}</h3>
            <span className="text-sm text-muted">{seg.sub}</span>
            <span className="ml-auto text-base font-bold tnum">{won(seg.amount)}</span>
            <button type="button" onClick={() => select(null)} className="rounded-md border border-line px-2.5 py-1 text-xs text-muted hover:bg-[#F3F5F8]">
              닫기
            </button>
          </header>

          <div className="p-5">
            {seg.side === "in" && seg.key !== "other" && (
              <DonorCards donations={donations.filter((d) => d.donorType === DONOR_TYPE_OF[seg.key])} stats={donorStats?.[DONOR_TYPE_OF[seg.key]!]} total={seg.amount} campaignTitles={campaignTitles} showAll={showAll} onMore={() => setShowAll(true)} />
            )}
            {seg.key === "other" && (
              <p className="text-sm leading-relaxed text-muted">
                기부금 전용계좌에서 발생한 이자수익 등 기부 외 수입입니다. 기부금품법상 기부금품과 함께 모집 목적에 사용해야 하므로 좌변에 포함해 공개합니다. 금액 {won(seg.amount)}.
              </p>
            )}
            {seg.side === "out" && seg.key !== "balance" && (
              <ExpenseCards expenses={expenses.filter((e) => e.type === EXPENSE_TYPE_OF[seg.key])} total={seg.amount} campaignTitles={campaignTitles} openStat={openStat} onToggle={(c) => setOpenStat(openStat === c ? null : c)} />
            )}
            {seg.key === "balance" && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-[#F3F5F8] p-4">
                  <div className="text-xs text-muted">미집행 잔액</div>
                  <div className="mt-1 text-xl font-bold tnum">{won(sheet.outflow.balance)}</div>
                  <div className="mt-1 text-xs text-muted">기부받은 돈의 {pct(sheet.outflow.balance / (sheet.inflow.total || 1))}</div>
                </div>
                <div className="rounded-lg bg-[#F3F5F8] p-4">
                  <div className="text-xs text-muted">전용계좌 잔액 대조</div>
                  <div className="mt-1 text-xl font-bold text-ok">일치</div>
                  <div className="mt-1 text-xs text-muted">기부받은 돈 − 쓰인 돈 = 계좌 잔액</div>
                </div>
                <div className="rounded-lg bg-[#F3F5F8] p-4">
                  <div className="text-xs text-muted">판정</div>
                  <div className="mt-1 text-sm leading-relaxed">
                    {campaignEnded
                      ? "모집이 종료되어 잔액 사용계획과 집행 일정 공개 대상입니다. (세칙 제12조)"
                      : "모집 진행 중이므로 잔액은 다음 공개주기 집행분으로 이월됩니다. 모집 종료 후 30%를 넘으면 '주의'로 표시됩니다."}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function DonorCards({ donations, stats, total, campaignTitles, showAll, onMore }: { donations: PublicDonation[]; stats?: { count: number; max: number }; total: number; campaignTitles?: Record<string, string>; showAll: boolean; onMore: () => void }) {
  const sorted = [...donations].sort((a, b) => b.donatedAt.localeCompare(a.donatedAt));
  const visible = showAll ? sorted : sorted.slice(0, 12);
  const count = stats?.count ?? donations.length;
  const avg = count ? total / count : 0;
  const max = stats?.max ?? donations.reduce((m, d) => Math.max(m, d.amount), 0);
  const partial = count > sorted.length;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="건수" value={`${count.toLocaleString("ko-KR")}건`} />
        <Stat label="합계" value={won(total)} />
        <Stat label="평균" value={won(avg)} />
        <Stat label="최고 1건" value={won(max)} />
      </div>
      <p className="text-xs text-muted">기부자 이름은 서버에서 가명처리되어 표시됩니다(세칙 제29조). 기부코드는 본인 조회용입니다.</p>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((d) => (
          <li key={d.id} className="rounded-lg border border-line p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{d.donorAlias}</div>
                <div className="text-xs text-muted">
                  <span className="font-mono">{d.donorCode}</span> · {d.donorType} · {d.method}
                </div>
              </div>
              <div className="shrink-0 text-sm font-bold tnum">{won(d.amount)}</div>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted">
              <span>{fmtDateTime(d.donatedAt)}</span>
              {campaignTitles && (
                <Link href={`/campaigns/${d.campaignId}`} className="truncate text-primary hover:underline">
                  {campaignTitles[d.campaignId]}
                </Link>
              )}
            </div>
            {d.message && <div className="mt-2 rounded bg-[#F3F5F8] px-2 py-1 text-xs text-foreground">“{d.message}”</div>}
          </li>
        ))}
      </ul>
      {!showAll && sorted.length > visible.length && (
        <button type="button" onClick={onMore} className="self-center rounded-lg border border-line px-4 py-2 text-sm hover:bg-[#F3F5F8]">
          {partial ? `최근 ${sorted.length.toLocaleString("ko-KR")}건 보기 (전체 ${count.toLocaleString("ko-KR")}건)` : `전체 ${sorted.length.toLocaleString("ko-KR")}건 모두 보기`}
        </button>
      )}
    </div>
  );
}

function ExpenseCards({ expenses, total, campaignTitles, openStat, onToggle }: { expenses: PublicExpense[]; total: number; campaignTitles?: Record<string, string>; openStat: string | null; onToggle: (code: string) => void }) {
  const groups = useMemo(() => {
    const m = new Map<string, { code: string; name: string; amount: number; items: PublicExpense[] }>();
    for (const e of expenses) {
      const g = m.get(e.statCode) ?? { code: e.statCode, name: e.statName, amount: 0, items: [] };
      g.amount += e.amount;
      g.items.push(e);
      m.set(e.statCode, g);
    }
    return [...m.values()].sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  if (expenses.length === 0) return <p className="text-sm text-muted">아직 집행된 내역이 없습니다.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="지출 건수" value={`${expenses.length.toLocaleString("ko-KR")}건`} />
        <Stat label="합계" value={won(total)} />
        <Stat label="통계목 수" value={`${groups.length}개`} />
        <Stat label="증빙 공개" value="100%" />
      </div>
      <p className="text-xs text-muted">통계목(공익법인회계기준 비용 분류 기준) 카드를 클릭하면 건별 지출 내역과 증빙번호가 펼쳐집니다.</p>
      <ul className="grid gap-3 md:grid-cols-2">
        {groups.map((g) => {
          const open = openStat === g.code;
          return (
            <li key={g.code} className={`rounded-lg border ${open ? "border-foreground md:col-span-2" : "border-line"}`}>
              <button type="button" onClick={() => onToggle(g.code)} aria-expanded={open} className="flex w-full items-center gap-3 p-3.5 text-left">
                <span className="rounded bg-[#F3F5F8] px-1.5 py-0.5 font-mono text-xs text-muted">{g.code}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{g.name}</span>
                <span className="text-xs text-muted tnum">{g.items.length}건 · {pct(g.amount / (total || 1))}</span>
                <span className="w-28 text-right text-sm font-bold tnum">{won(g.amount)}</span>
              </button>
              <div className="h-1.5 bg-[#E9EDF3]">
                <div className="h-1.5 bg-foreground/70" style={{ width: `${(g.amount / (total || 1)) * 100}%` }} />
              </div>
              {open && (
                <ul className="divide-y divide-line">
                  {g.items.length > 20 && <li className="bg-[#F7F8FA] px-4 py-2 text-xs text-muted">최근 20건만 표시 · 전체 {g.items.length}건은 오픈API(/api/campaigns/[id])와 공개보고서에서 확인</li>}
                  {[...g.items]
                    .sort((a, b) => b.spentAt.localeCompare(a.spentAt))
                    .slice(0, 20)
                    .map((e) => (
                      <li key={e.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[110px_1fr_auto] sm:items-center">
                        <span className="text-xs text-muted">{fmtDate(e.spentAt)}</span>
                        <span className="min-w-0">
                          <span className="font-medium">{e.description}</span>
                          <span className="text-muted"> · {e.vendor}</span>
                          {e.recipientAlias && <span className="text-muted"> · 수혜자 {e.recipientAlias}</span>}
                          {campaignTitles && <span className="block truncate text-xs text-primary">{campaignTitles[e.campaignId]}</span>}
                        </span>
                        <span className="flex items-center gap-3 sm:justify-end">
                          <span className="font-mono text-xs text-muted">{e.receiptId}</span>
                          <span className="font-semibold tnum">{won(e.amount)}</span>
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#F3F5F8] px-3.5 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-base font-bold tnum">{value}</div>
    </div>
  );
}
