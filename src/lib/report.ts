import { fmtDate, won, pct } from "./format";
import type { CampaignDetail } from "./repository";

/**
 * 기부 보고서 초안 생성(템플릿 기반)
 * - 원장 수치만으로 개조식 보고서를 만들고, 모든 수치 문장에 근거(건수·증빙 범위)를 붙입니다.
 * - LLM이 설정되어 있으면 /api/reports/draft 에서 이 초안을 다듬습니다(ai.ts).
 */
export function buildReportDraft(detail: CampaignDetail, periodFrom: string, periodTo: string): { title: string; body: string } {
  const { campaign, sheet, health } = detail;
  const from = new Date(periodFrom);
  const to = new Date(periodTo + "T23:59:59");
  const within = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= from.getTime() && t <= to.getTime();
  };
  const pd = detail.donations.filter((d) => within(d.donatedAt));
  const pe = detail.expenses.filter((e) => within(e.spentAt));
  const pdSum = pd.reduce((s, d) => s + d.amount, 0);
  const peSum = pe.reduce((s, e) => s + e.amount, 0);

  const byStat = new Map<string, { name: string; type: string; amount: number; count: number }>();
  for (const e of pe) {
    const cur = byStat.get(e.statCode) ?? { name: e.statName, type: e.type, amount: 0, count: 0 };
    cur.amount += e.amount;
    cur.count += 1;
    byStat.set(e.statCode, cur);
  }
  const statLines = [...byStat.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([code, v]) => `   - [${v.type}] ${v.name}(${code}) ${won(v.amount)} · ${v.count}건`);

  const received = sheet.inflow.total || 1;
  const per10k = Math.round((sheet.outflow.program / received) * 10000);
  const flagged = health.checks.filter((c) => c.level !== "양호");

  const title = `${campaign.title} 기부금 사용내역 공개보고 (${fmtDate(periodFrom)}~${fmtDate(periodTo)})`;
  const body = [
    `□ 모집건 개요`,
    ` ○ 모집기관: ${campaign.organizer} / 모집등록번호: ${campaign.registrationNo}`,
    ` ○ 모집목적: ${campaign.purpose}`,
    ` ○ 모집기간: ${fmtDate(campaign.startDate)} ~ ${fmtDate(campaign.endDate)} (${campaign.status})`,
    ``,
    `□ 당기 모집 현황 (${fmtDate(periodFrom)}~${fmtDate(periodTo)})`,
    ` ○ 당기 입금 ${pd.length}건 ${won(pdSum)}`,
    ` ○ 누계 입금 ${detail.donationCount}건 ${won(sheet.inflow.total - sheet.inflow.other)} (목표 대비 ${pct((sheet.inflow.total - sheet.inflow.other) / campaign.goal)})`,
    `   - 개인 ${won(sheet.inflow.individual)} / 기업 ${won(sheet.inflow.corporate)} / 단체 ${won(sheet.inflow.group)} / 이자 등 기타 ${won(sheet.inflow.other)}`,
    ``,
    `□ 당기 집행 현황`,
    ` ○ 당기 지출 ${pe.length}건 ${won(peSum)} (증빙 ${pe.length}건 전부 공개)`,
    ...(statLines.length ? statLines : [`   - 당기 지출 없음`]),
    ` ○ 누계 지출: 사업수행비용 ${won(sheet.outflow.program)} / 일반관리비용 ${won(sheet.outflow.admin)} / 모금비용 ${won(sheet.outflow.fundraising)}`,
    ` ○ 기부금 1만원 중 수혜자에게 간 금액: ${per10k.toLocaleString("ko-KR")}원`,
    ``,
    `□ 잔액 및 정합성`,
    ` ○ 미집행 잔액 ${won(sheet.outflow.balance)} — 기부받은 돈 − 쓰인 돈 − 잔액 = ${won(sheet.difference)} (${Math.abs(sheet.difference) < 1 ? "일치" : "불일치"})`,
    ``,
    `□ 운영 세칙 판정 결과`,
    ...health.checks.map((c) => ` ○ [${c.level}] ${c.label}: ${c.value} (기준 ${c.threshold}) — ${c.basis}`),
    ...(flagged.length ? [``, `□ 소명 및 조치계획`, ...flagged.map((c) => ` ○ ${c.label}: ${c.detail} → (담당자 작성)`)] : [``, `□ 소명 및 조치계획`, ` ○ 해당 없음(전 항목 양호)`]),
    ``,
    `□ 향후 계획`,
    ` ○ (담당자 작성) 다음 공개주기까지의 집행 계획과 잔액 사용 일정`,
  ].join("\n");

  return { title, body };
}
