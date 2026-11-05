import { fmtDate, won, pct } from "./format";
import type { CampaignDetail } from "./repository";
import { goalRate } from "./rules";

/**
 * 결산 보고서의 "사실 블록" — 원장에서 계산한 수치만 담습니다.
 * AI 보고서 작성기(ai/report-writer.ts)는 이 블록의 수치만 인용해야 하고, 게시 전에 수치 대조 검증을 받습니다.
 */
export interface SettlementFacts {
  title: string;
  /** AI 프롬프트·검증용 텍스트(개조식) */
  text: string;
  /** 보고서 본문에 등장해도 되는 금액 문자열 집합(검증용) */
  allowedAmounts: Set<string>;
  durationDays: number;
  topStats: { code: string; name: string; type: string; amount: number; count: number }[];
  donorShare: { individual: number; corporate: number; group: number };
  per10k: number;
}

export function buildSettlementFacts(detail: CampaignDetail): SettlementFacts {
  const { campaign, sheet, health } = detail;
  const received = sheet.inflow.total || 1;
  const donated = sheet.inflow.total - sheet.inflow.other;
  const per10k = Math.round((sheet.outflow.program / received) * 10000);
  const end = campaign.completedAt ?? campaign.endDate;
  const durationDays = Math.round((new Date(end).getTime() - new Date(campaign.startDate).getTime()) / 86400000);

  const byStat = new Map<string, { code: string; name: string; type: string; amount: number; count: number }>();
  for (const e of detail.expenses) {
    const cur = byStat.get(e.statCode) ?? { code: e.statCode, name: e.statName, type: e.type, amount: 0, count: 0 };
    cur.amount += e.amount;
    cur.count += 1;
    byStat.set(e.statCode, cur);
  }
  const topStats = [...byStat.values()].sort((a, b) => b.amount - a.amount);
  const spent = sheet.outflow.program + sheet.outflow.admin + sheet.outflow.fundraising;

  const lines = [
    `□ 모집건 개요`,
    ` ○ 모집기관: ${campaign.organizer} / 모집등록번호: ${campaign.registrationNo}`,
    ` ○ 모집목적: ${campaign.purpose}`,
    ` ○ 모집기간: ${fmtDate(campaign.startDate)} ~ ${fmtDate(campaign.endDate)} / 집행 완료: ${fmtDate(end)} (총 ${durationDays}일)`,
    `□ 모집 결과`,
    ` ○ 기부금 ${detail.donationCount}건 ${won(donated)} (목표 ${won(campaign.goal)} 대비 ${pct(goalRate(sheet, campaign.goal))})`,
    `   - 개인 ${won(sheet.inflow.individual)} (${pct(sheet.inflow.individual / received)}) / 기업 ${won(sheet.inflow.corporate)} (${pct(sheet.inflow.corporate / received)}) / 단체 ${won(sheet.inflow.group)} (${pct(sheet.inflow.group / received)})`,
    ` ○ 이자 등 기타수입 ${won(sheet.inflow.other)} / 총수입 ${won(sheet.inflow.total)}`,
    `□ 집행 결과`,
    ` ○ 총 지출 ${detail.expenseCount}건 ${won(spent)} (증빙 ${detail.expenseCount}건 전부 공개)`,
    ` ○ 사업수행비용 ${won(sheet.outflow.program)} (${pct(sheet.outflow.program / received)}) / 일반관리비용 ${won(sheet.outflow.admin)} (${pct(sheet.outflow.admin / received)}) / 모금비용 ${won(sheet.outflow.fundraising)} (${pct(sheet.outflow.fundraising / received)})`,
    ` ○ 통계목별 지출 상위`,
    ...topStats.slice(0, 6).map((s) => `   - [${s.type}] ${s.name}(${s.code}) ${won(s.amount)} · ${s.count}건`),
    ` ○ 기부금 1만원 중 수혜자에게 간 금액: ${per10k.toLocaleString("ko-KR")}원`,
    `□ 잔액`,
    ` ○ 미집행 잔액 ${won(sheet.outflow.balance)} (${Math.abs(sheet.outflow.balance) < 1 ? "전액 집행" : "잔액 있음"})`,
    `□ 운영 세칙 판정`,
    ...health.checks.map((c) => ` ○ [${c.level}] ${c.label}: ${c.value} (기준 ${c.threshold}) — ${c.detail}`),
  ];

  const allowed = new Set<string>();
  const text = lines.join("\n");
  for (const m of text.matchAll(/[\d,]+원/g)) allowed.add(m[0]);
  allowed.add(won(per10k).replace(/원$/, "") + "원");
  allowed.add("10,000원");
  allowed.add("1만원");

  return {
    title: `${campaign.title} 기부금 결산 공개보고서`,
    text,
    allowedAmounts: allowed,
    durationDays,
    topStats,
    donorShare: { individual: sheet.inflow.individual / received, corporate: sheet.inflow.corporate / received, group: sheet.inflow.group / received },
    per10k,
  };
}
