/**
 * 기능 3 — 기부 완료 건 결산 보고서 AI 자동 생성·게시
 * - 트리거: 모집건 상태가 "완료"(집행·정산 완료)가 되면 자동 생성 대상. 게시일 = 집행 완료일 + 7일.
 * - 사람이 쓰지 않습니다. 원장 사실 블록(report.ts)만 AI에 주고, AI는 해석·요약·평가 문장을 씁니다.
 * - 게시 전 검증: 본문에 나온 금액(…원)·비율(…%)이 사실 블록에 있는 값인지 대조. 하나라도 없으면 게시하지 않고 데모 보고서로 대체.
 * - 생성 결과는 지금은 서버 메모리에 보관(재시작 시 재생성). DB 연결 시 reports 테이블에 저장하도록 ReportStore 만 바꾸면 됩니다.
 */

import { fmtDate, pct, won } from "../format";
import { buildSettlementFacts, type SettlementFacts } from "../report";
import { getRepository, type CampaignDetail } from "../repository";
import { generate } from "./client";
import { DEMO_ENGINE, type EngineInfo } from "./config";

export interface PublishedReport {
  campaignId: string;
  title: string;
  body: string;
  publishedAt: string; // 자동 게시일
  generatedAt: string;
  engine: EngineInfo;
  verification: { passed: boolean; checkedAmounts: number; checkedPercents: number; note: string };
}

export const PUBLISH_DELAY_DAYS = 7;

export function publishDateOf(completedAt: string): string {
  return new Date(new Date(completedAt).getTime() + PUBLISH_DELAY_DAYS * 86400000).toISOString().slice(0, 10);
}

// ---------- 저장소(임시: 메모리) ----------
interface ReportStore {
  get(id: string): PublishedReport | undefined;
  set(r: PublishedReport): void;
}
const memory = new Map<string, PublishedReport>();
const store: ReportStore = { get: (id) => memory.get(id), set: (r) => void memory.set(r.campaignId, r) };
const inflight = new Map<string, Promise<PublishedReport | null>>();

/** 완료 모집건의 결산 보고서(없으면 생성 후 게시). 완료가 아니면 null. */
export async function getPublishedReport(campaignId: string): Promise<PublishedReport | null> {
  const hit = store.get(campaignId);
  if (hit) return hit;
  const running = inflight.get(campaignId);
  if (running) return running;
  const p = (async () => {
    const detail = await getRepository().getCampaignDetail(campaignId);
    if (!detail || detail.campaign.status !== "완료" || !detail.campaign.completedAt) return null;
    const r = await writeReport(detail);
    store.set(r);
    return r;
  })().finally(() => inflight.delete(campaignId));
  inflight.set(campaignId, p);
  return p;
}

// ---------- 작성 ----------
const SYSTEM = `당신은 기부금 투명성 플랫폼 '기부 플로우'의 결산 보고서 작성 AI입니다. 집행이 끝난 모집건의 결산 공개보고서를 기부자에게 게시합니다.
규칙:
- [원장 사실]에 있는 금액·건수·비율만 인용하세요. 금액은 "1,234,000원"처럼 사실 블록과 똑같은 형식으로 쓰고, 억·만 단위로 바꾸거나 반올림하지 마세요.
- 사실 블록에 없는 수치를 계산해 새로 만들지 마세요(합계·차이·증감률 포함).
- 단순 나열이 아니라 해석을 쓰세요: 무엇이 잘 됐는지, 어디에 돈이 가장 많이 갔는지, 기부자 구성의 특징, 세칙 판정상 눈여겨볼 점.
- 개조식(□ ○ -) 형식. 섹션 순서: □ 한눈에 보기(3줄) / □ 모집 결과 / □ 집행 결과 / □ 운영 세칙 판정 / □ 종합 평가(기부자에게 드리는 말 포함).
- 보고서 본문만 출력하세요(제목·머리말 없이).`;

async function writeReport(detail: CampaignDetail): Promise<PublishedReport> {
  const facts = buildSettlementFacts(detail);
  const base = {
    campaignId: detail.campaign.id,
    title: facts.title,
    publishedAt: publishDateOf(detail.campaign.completedAt!),
    generatedAt: new Date().toISOString(),
  };

  const ai = await generate({
    system: SYSTEM,
    messages: [{ role: "user", content: `[원장 사실]\n${facts.text}` }],
    maxTokens: 2200,
    temperature: 0.3,
  });

  if (ai) {
    const v = verify(ai.text, facts);
    if (v.passed) return { ...base, body: ai.text, engine: ai.engine, verification: v };
    // 검증 실패 → AI 본문은 게시하지 않음
    const demo = demoReport(detail, facts);
    return { ...base, body: demo, engine: DEMO_ENGINE, verification: { ...verify(demo, facts), note: `AI 본문 검증 실패(${v.note}). 원장 기준 보고서로 대신 게시` } };
  }
  const demo = demoReport(detail, facts);
  return { ...base, body: demo, engine: DEMO_ENGINE, verification: verify(demo, facts) };
}

/** 본문의 금액·비율이 원장 사실 블록에 있는 값인지 대조 */
function verify(body: string, facts: SettlementFacts): PublishedReport["verification"] {
  const amounts = [...body.matchAll(/\d[\d,]*원/g)].map((m) => m[0]);
  const percents = [...body.matchAll(/\d+(?:\.\d+)?%/g)].map((m) => m[0]);
  const badAmounts = amounts.filter((a) => !facts.allowedAmounts.has(a));
  const badPercents = percents.filter((p) => !facts.text.includes(p));
  const passed = badAmounts.length === 0 && badPercents.length === 0;
  return {
    passed,
    checkedAmounts: amounts.length,
    checkedPercents: percents.length,
    note: passed ? `금액 ${amounts.length}개·비율 ${percents.length}개 모두 원장과 일치` : `원장에 없는 값: ${[...badAmounts, ...badPercents].slice(0, 5).join(", ")}`,
  };
}

// ---------- 데모 보고서(키 없을 때) ----------
function demoReport(detail: CampaignDetail, f: SettlementFacts): string {
  const { campaign, sheet, health } = detail;
  const t = sheet.inflow.total || 1;
  const donated = sheet.inflow.total - sheet.inflow.other;
  const top = f.topStats[0];
  const programStats = f.topStats.filter((s) => s.type === "사업수행비용");
  const mainDonor = f.donorShare.individual >= f.donorShare.corporate ? "개인" : "기업";
  const goalRate = donated / campaign.goal;
  const flagged = health.checks.filter((c) => c.level !== "양호");

  return [
    `□ 한눈에 보기`,
    ` ○ ${detail.donationCount}건의 기부로 모인 ${won(donated)}을 ${f.durationDays}일 동안 전액 집행했습니다.`,
    ` ○ 기부금 1만원 중 ${f.per10k.toLocaleString("ko-KR")}원이 수혜 현장에 쓰였습니다(사업수행비용 ${pct(sheet.outflow.program / t)}).`,
    ` ○ 운영 세칙 판정 ${health.checks.length}개 항목 중 ${health.checks.length - flagged.length}개 양호${flagged.length ? `, ${flagged.length}개 확인 필요` : ""}.`,
    ``,
    `□ 모집 결과`,
    ` ○ 기부금 ${won(donated)}, 목표 ${won(campaign.goal)} 대비 ${pct(goalRate)}${goalRate >= 1 ? "로 목표를 넘겼습니다" : ""}.`,
    ` ○ ${mainDonor} 기부가 가장 큰 비중을 차지했습니다: 개인 ${pct(f.donorShare.individual)} · 기업 ${pct(f.donorShare.corporate)} · 단체 ${pct(f.donorShare.group)}.`,
    ` ○ 전용계좌 이자 ${won(sheet.inflow.other)}도 사업비로 함께 집행했습니다.`,
    ``,
    `□ 집행 결과`,
    ` ○ 지출 ${detail.expenseCount}건, 증빙 ${detail.expenseCount}건을 모두 공개했습니다.`,
    ...(top ? [` ○ 가장 많은 돈이 들어간 곳은 '${top.name}'(${top.code})로 ${won(top.amount)}, ${top.count}건입니다.`] : []),
    ...(programStats.length > 1 ? [`   - 사업비는 ${programStats.slice(0, 3).map((s) => s.name).join(", ")} 순으로 쓰였습니다.`] : []),
    ` ○ 운영비 ${won(sheet.outflow.admin)}(${pct(sheet.outflow.admin / t)}), 모금비용 ${won(sheet.outflow.fundraising)}(${pct(sheet.outflow.fundraising / t)}).`,
    ` ○ 미집행 잔액 ${won(sheet.outflow.balance)}. 남은 돈 없이 정산을 마쳤습니다.`,
    ``,
    `□ 운영 세칙 판정`,
    ...health.checks.map((c) => ` ○ [${c.level}] ${c.label}: ${c.value} (기준 ${c.threshold})`),
    ``,
    `□ 종합 평가`,
    flagged.length === 0
      ? ` ○ 모든 판정 항목이 양호합니다. 모금부터 정산까지 기준 안에서 운영된 모집건입니다.`
      : ` ○ ${flagged.map((c) => c.label).join(", ")} 항목은 다음 모집 때 개선이 필요합니다.`,
    ` ○ 기부해 주신 분들께: 내 기부금이 어디에 쓰였는지는 '기부내역' 페이지에서 기부코드로 확인하실 수 있습니다.`,
    ``,
    `※ 본 보고서는 집행 완료(${fmtDate(campaign.completedAt!)}) 후 원장 수치로 자동 생성되어 ${fmtDate(publishDateOf(campaign.completedAt!))}에 게시되었습니다.`,
  ].join("\n");
}
