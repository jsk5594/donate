/**
 * 기능 1 — 주관기관 AI 감사
 * 1) 원장·공시 이력에서 지표를 계산(결정적, 검증 가능)
 * 2) AI가 지표·연도별 이력·처분 이력·현재 모집건 판정을 함께 읽고 "기부를 맡겨도 되는가" 감사의견을 작성
 *    - AI는 등급·근거·위험·권고를 쓰고, 근거마다 어떤 지표를 봤는지 적어야 함
 * 3) 키가 없으면 같은 지표로 데모 의견을 생성
 */

import { won, pct } from "../format";
import { getOrganization, ORGANIZATIONS, type Organization } from "../org-data";
import { getRepository } from "../repository";
import { legalFundraisingCap, POLICY, SCORE_BANDS } from "../rules";
import { stageOf, type CampaignSummary, type HealthLevel } from "../types";
import { generate, parseJsonObject } from "./client";
import { DEMO_ENGINE, type EngineInfo } from "./config";

export type TrustGrade = "신뢰 가능" | "주의 필요" | "신중 검토";

export interface OrgSignal {
  key: string;
  label: string;
  level: HealthLevel;
  value: string;
  basis: string;
}

export interface OrgMetrics {
  years: number;
  totalReceived: number;
  avgProgram: number;
  latestProgram: number; // 수입 대비
  latestProgramShare: number; // 총지출 대비 — 모집건 판정과 같은 기준
  programTrend: number; // 최근 − 최초 (비율 포인트)
  sustainedProgramDecline: boolean; // 최근 2개 연도 모두 최초 연도보다 낮음
  latestAdmin: number;
  adminTrend: number;
  maxFundraising: number;
  fundraisingOverCapYears: number;
  latestCarryover: number;
  avgDelay: number;
  maxDelay: number;
  qualifiedAudits: number; // 한정·부적정·의견거절
  missingAudits: number;
  majorIssues: number;
  minorIssues: number;
  currentCampaigns: { id: string; title: string; status: string; health: HealthLevel; score: number | null }[];
  indicatorScore: number; // 0~100 (지표 기반 참고 점수)
}

export interface OrgAuditOpinion {
  grade: TrustGrade;
  score: number;
  headline: string;
  summary: string;
  strengths: string[];
  risks: { title: string; evidence: string }[];
  advice: string;
}

export interface OrgAuditResult {
  organizationId: string;
  opinion: OrgAuditOpinion;
  engine: EngineInfo;
  generatedAt: string;
  /** AI 응답이 형식·근거 검증을 통과하지 못해 데모 의견으로 대체했는지 */
  fallbackReason?: string;
}

// ---------- 1) 지표 ----------
export async function computeOrgMetrics(org: Organization, campaigns?: CampaignSummary[]): Promise<OrgMetrics> {
  const ys = [...org.years].sort((a, b) => a.year - b.year);
  const r = (y: (typeof ys)[number], v: number) => v / (y.received || 1);
  const first = ys[0];
  const last = ys[ys.length - 1];
  const totalReceived = ys.reduce((s, y) => s + y.received, 0);
  const all = campaigns ?? (await getRepository().getOverview()).campaigns;
  // 현재 모집건: 완료되지 않은 것만(과거 완료건은 연도별 결산 이력에 반영)
  const current = all.filter((s) => s.campaign.organizer === org.name && s.campaign.status !== "완료");

  const m: OrgMetrics = {
    years: ys.length,
    totalReceived,
    avgProgram: ys.reduce((s, y) => s + y.program, 0) / (totalReceived || 1),
    latestProgram: r(last, last.program),
    latestProgramShare: last.program / (last.program + last.admin + last.fundraising || 1),
    programTrend: r(last, last.program) - r(first, first.program),
    sustainedProgramDecline: ys.length >= 3 && ys.slice(-2).every((y) => r(y, y.program) < r(first, first.program) - 0.03),
    latestAdmin: r(last, last.admin),
    adminTrend: r(last, last.admin) - r(first, first.admin),
    maxFundraising: Math.max(...ys.map((y) => r(y, y.fundraising))),
    fundraisingOverCapYears: ys.filter((y) => r(y, y.fundraising) > legalFundraisingCap(y.received)).length,
    latestCarryover: r(last, last.carryover),
    avgDelay: ys.reduce((s, y) => s + y.disclosureDelayDays, 0) / ys.length,
    maxDelay: Math.max(...ys.map((y) => y.disclosureDelayDays)),
    qualifiedAudits: ys.filter((y) => y.auditOpinion === "한정" || y.auditOpinion === "부적정" || y.auditOpinion === "의견거절").length,
    missingAudits: ys.filter((y) => y.auditOpinion === "미실시").length,
    majorIssues: org.issues.filter((i) => i.severity === "중대").length,
    minorIssues: org.issues.filter((i) => i.severity === "경미").length,
    currentCampaigns: current.map((s) => ({ id: s.campaign.id, title: s.campaign.title, status: stageOf(s.campaign.status), health: s.health.overall, score: s.health.score })),
    indicatorScore: 0,
  };
  m.indicatorScore = indicatorScore(m);
  return m;
}

function indicatorScore(m: OrgMetrics): number {
  let s = 100;
  if (m.latestProgramShare < POLICY.programShareMin) s -= 10;
  else if (m.latestProgramShare < POLICY.programShareGood) s -= 5;
  // 한 해만 떨어진 경우(대형 재난 직후 등)는 제외하고, 2년 이상 이어진 하락만 감점
  if (m.programTrend < -0.1 && m.sustainedProgramDecline) s -= 4;
  if (m.latestAdmin > POLICY.adminRatioBad) s -= 8;
  else if (m.latestAdmin > POLICY.adminRatioWarn) s -= 4;
  if (m.adminTrend > 0.03) s -= 2;
  s -= m.fundraisingOverCapYears * 9;
  if (m.latestCarryover > POLICY.balanceAfterEndWarn) s -= 8;
  if (m.maxDelay > 30) s -= 5;
  else if (m.maxDelay > 14) s -= 3;
  s -= m.qualifiedAudits * 3;
  s -= m.missingAudits * 2;
  s -= m.majorIssues * 10 + m.minorIssues * 2;
  s -= m.currentCampaigns.filter((c) => c.health === "위반").length * 4;
  // 위반 판정을 받은 모집건이 돌아가는 동안에는 '신뢰 가능'이 될 수 없음
  if (m.currentCampaigns.some((c) => c.health === "위반")) s = Math.min(s, SCORE_BANDS.good - 1);
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function gradeOf(score: number): TrustGrade {
  return score >= SCORE_BANDS.good ? "신뢰 가능" : score >= SCORE_BANDS.warn ? "주의 필요" : "신중 검토";
}

export function signalsOf(m: OrgMetrics): OrgSignal[] {
  const lv = (bad: boolean, warn: boolean): HealthLevel => (bad ? "위반" : warn ? "주의" : "양호");
  return [
    { key: "program", label: "최근 사업수행비용 비중 (총지출 대비)", level: lv(m.latestProgramShare < POLICY.programShareMin, m.latestProgramShare < POLICY.programShareGood), value: `${pct(m.latestProgramShare)} (수입 대비 ${pct(m.latestProgram)})`, basis: "BBB 65% 이상 · 권장 75%" },
    { key: "admin", label: "최근 운영비 비율", level: lv(m.latestAdmin > POLICY.adminRatioBad, m.latestAdmin > POLICY.adminRatioWarn), value: `${pct(m.latestAdmin)} (5년 ${m.adminTrend >= 0 ? "+" : ""}${(m.adminTrend * 100).toFixed(1)}%p)`, basis: "운영 세칙 10% 이하" },
    { key: "fundraising", label: "모금비용 법정 한도 초과", level: lv(m.fundraisingOverCapYears >= 2, m.fundraisingOverCapYears === 1), value: `${m.fundraisingOverCapYears}개 연도 (최고 ${pct(m.maxFundraising)})`, basis: "기부금품법 제13조·시행령" },
    { key: "disclosure", label: "결산 공시 지연", level: lv(m.maxDelay > 30, m.maxDelay > 14), value: `평균 ${m.avgDelay.toFixed(0)}일 · 최장 ${m.maxDelay}일`, basis: "기부금품법 제14조 공개의무" },
    { key: "audit", label: "외부감사 의견", level: lv(m.qualifiedAudits >= 2, m.qualifiedAudits === 1 || m.missingAudits >= 2), value: `한정 이하 ${m.qualifiedAudits}회 · 미실시 ${m.missingAudits}회`, basis: "공익법인 외부회계감사" },
    { key: "issues", label: "행정처분·지적", level: lv(m.majorIssues > 0, m.minorIssues > 0), value: `중대 ${m.majorIssues}건 · 경미 ${m.minorIssues}건`, basis: "관할청 처분·공시 정정 이력" },
    { key: "carryover", label: "최근 연도 이월 잔액", level: lv(m.latestCarryover > POLICY.balanceAfterEndBad, m.latestCarryover > POLICY.balanceAfterEndWarn), value: pct(m.latestCarryover), basis: "모집 종료 후 잔액 30% 이하 권장" },
  ];
}

// ---------- 2) AI 감사의견 ----------
const SYSTEM = `당신은 기부금 투명성 플랫폼 '기부CCTV'의 감사 AI입니다. 기부자가 이 주관기관에 기부를 맡겨도 되는지 판단하도록 돕습니다.
규칙:
- 제공된 [기관 데이터]만 근거로 판단합니다. 데이터에 없는 사실·소문·외부 평판을 지어내지 마세요.
- 숫자는 데이터에 있는 값만 그대로 인용합니다.
- 단순 비율 비교를 넘어 추세(악화·개선), 사건의 재발 여부, 지표 간 연관(예: 운영비 증가와 공시 지연이 동시에 진행)을 해석하세요.
- 일시적·설명 가능한 요인(예: 대형 재난 직후 이월)과 구조적 문제를 구분하세요.
- 등급과 점수는 [기관 데이터]의 확정등급·확정점수로 이미 정해져 있습니다. grade와 score에 그 값을 그대로 쓰고, 그 등급에 맞게 근거를 해석하세요.
- 기부자에게 하는 말투(존댓말, 쉬운 표현). 단정적 비난 대신 근거 중심.
출력 JSON 형식:
{"grade": string, "score": number, "headline": string(한 문장), "summary": string(3~4문장),
 "strengths": string[](최대 3), "risks": [{"title": string, "evidence": string(인용한 수치·연도 포함)}](최대 4),
 "advice": string(기부자가 지금 할 수 있는 행동 1~2문장)}`;

function dataForPrompt(org: Organization, m: OrgMetrics) {
  return {
    기관: { 이름: org.name, 법인형태: org.legalType, 설립: org.founded, 사업분야: org.field, 지정기부금단체: org.designated },
    연도별결산: org.years.map((y) => ({
      연도: y.year,
      기부금수입: won(y.received),
      사업수행비용비율_수입대비: pct(y.program / y.received),
      사업수행비용비중_총지출대비: pct(y.program / (y.program + y.admin + y.fundraising || 1)),
      운영비비율: pct(y.admin / y.received),
      모금비용비율: pct(y.fundraising / y.received),
      법정모금비용한도: pct(legalFundraisingCap(y.received), 0),
      이월잔액비율: pct(y.carryover / y.received),
      수혜: y.beneficiaries,
      공시지연일: y.disclosureDelayDays,
      외부감사의견: y.auditOpinion,
    })),
    처분지적이력: org.issues,
    현재모집건판정: m.currentCampaigns,
    확정등급: gradeOf(m.indicatorScore),
    확정점수: m.indicatorScore,
    판정기준: { 사업비비중: "총지출의 65% 이상(권장 75%)", 운영비: "10% 이하", 모금비용: "법정 한도 이하", 공시: "기한 내", 이월잔액: "30% 이하" },
  };
}

function isOpinion(x: unknown): x is OrgAuditOpinion {
  const o = x as OrgAuditOpinion;
  return (
    !!o &&
    ["신뢰 가능", "주의 필요", "신중 검토"].includes(o.grade) &&
    typeof o.score === "number" &&
    typeof o.headline === "string" &&
    typeof o.summary === "string" &&
    Array.isArray(o.strengths) &&
    Array.isArray(o.risks) &&
    typeof o.advice === "string"
  );
}

const cache = new Map<string, OrgAuditResult>();

export async function auditOrganization(orgId: string): Promise<OrgAuditResult | null> {
  const hit = cache.get(orgId);
  if (hit) return hit;
  const org = getOrganization(orgId);
  if (!org) return null;
  const m = await computeOrgMetrics(org);

  const ai = await generate({
    system: SYSTEM,
    messages: [{ role: "user", content: `[기관 데이터]\n${JSON.stringify(dataForPrompt(org, m), null, 1)}` }],
    json: true,
    maxTokens: 1400,
  });

  let result: OrgAuditResult;
  const parsed = ai ? parseJsonObject<OrgAuditOpinion>(ai.text) : null;
  if (ai && isOpinion(parsed)) {
    // 목록 배지와 감사의견이 어긋나지 않도록 등급·점수는 지표 값으로 고정
    parsed.grade = gradeOf(m.indicatorScore);
    parsed.score = m.indicatorScore;
    result = { organizationId: orgId, opinion: parsed, engine: ai.engine, generatedAt: new Date().toISOString() };
  } else {
    result = {
      organizationId: orgId,
      opinion: demoOpinion(org, m),
      engine: DEMO_ENGINE,
      generatedAt: new Date().toISOString(),
      ...(ai ? { fallbackReason: "AI 응답이 형식 검증을 통과하지 못해 데모 의견으로 대체했습니다." } : {}),
    };
  }
  cache.set(orgId, result);
  return result;
}

// ---------- 3) 데모 의견(키 없을 때) ----------
function demoOpinion(org: Organization, m: OrgMetrics): OrgAuditOpinion {
  const ys = [...org.years].sort((a, b) => a.year - b.year);
  const first = ys[0];
  const last = ys[ys.length - 1];
  const grade = gradeOf(m.indicatorScore);
  const strengths: string[] = [];
  const risks: { title: string; evidence: string }[] = [];

  if (m.avgProgram >= POLICY.programShareGood) strengths.push(`최근 ${m.years}년간 기부금의 평균 ${pct(m.avgProgram)}를 실제 사업에 썼습니다.`);
  if (m.qualifiedAudits === 0 && m.missingAudits === 0) strengths.push(`${m.years}년 연속 외부감사 '적정' 의견을 받았습니다.`);
  if (m.maxDelay <= 7) strengths.push(`결산 공시를 매년 기한 안에 했습니다(최장 지연 ${m.maxDelay}일).`);
  if (m.majorIssues + m.minorIssues === 0) strengths.push("행정처분·지적 이력이 없습니다.");

  if (m.programTrend < -0.05)
    risks.push({
      title: m.sustainedProgramDecline ? "사업비 비율이 해마다 낮아지고 있습니다" : "최근 연도에 사업비 비율이 크게 낮아졌습니다",
      evidence: m.sustainedProgramDecline
        ? ys.map((y) => `${y.year}년 ${pct(y.program / y.received)}`).join(" → ")
        : `${ys[ys.length - 2].year}년 ${pct(ys[ys.length - 2].program / ys[ys.length - 2].received)} → ${last.year}년 ${pct(last.program / last.received)}`,
    });
  if (m.latestAdmin > POLICY.adminRatioWarn)
    risks.push({ title: "운영비 비중이 높습니다", evidence: `${last.year}년 운영비 ${pct(m.latestAdmin)} (세칙 한도 10%), ${m.years}년간 ${(m.adminTrend * 100).toFixed(1)}%p 증가` });
  if (m.fundraisingOverCapYears > 0) {
    const over = ys.filter((y) => y.fundraising / y.received > legalFundraisingCap(y.received)).map((y) => `${y.year}년 ${pct(y.fundraising / y.received)}`);
    risks.push({ title: `모금비용이 법정 한도를 ${m.fundraisingOverCapYears}번 넘었습니다`, evidence: `${over.join(", ")} — 처분 후에도 재발` });
  }
  if (m.maxDelay > 14) risks.push({ title: "결산 공시가 늦어지고 있습니다", evidence: `공시 지연 ${ys.map((y) => `${y.year}년 ${y.disclosureDelayDays}일`).join(" → ")}` });
  if (m.qualifiedAudits > 0) risks.push({ title: "외부감사에서 '한정' 의견을 받았습니다", evidence: ys.filter((y) => y.auditOpinion === "한정" || y.auditOpinion === "부적정").map((y) => `${y.year}년 ${y.auditOpinion}`).join(", ") });
  if (m.latestCarryover > POLICY.balanceAfterEndWarn)
    risks.push({ title: "최근 연도에 쓰지 않은 돈이 많이 남았습니다", evidence: `${last.year}년 이월 잔액 ${pct(m.latestCarryover)} (수입 ${won(last.received)})` });

  // 지표 간 연관 해석
  let pattern = "";
  if (m.adminTrend > 0.03 && m.maxDelay > 14) pattern = " 운영비가 늘어나는 시기와 공시가 늦어지는 시기가 겹쳐, 내부 관리 여력이 줄고 있는 신호로 보입니다.";
  else if (m.fundraisingOverCapYears >= 2) pattern = " 처분을 받은 뒤에도 같은 문제가 반복돼 일회성 실수보다는 모금 구조의 문제로 판단됩니다.";
  else if (m.latestCarryover > POLICY.balanceAfterEndWarn && m.avgProgram >= POLICY.programShareGood) pattern = ` 다만 이전 ${m.years - 1}년은 사업비 비율이 안정적이어서, 대형 재난 직후 집행이 밀린 일시적 요인일 가능성이 큽니다.`;

  const headline =
    grade === "신뢰 가능"
      ? `${org.name}은(는) 기부금을 꾸준히 사업에 쓰고 공시도 성실해 믿고 맡길 만합니다.`
      : grade === "주의 필요"
        ? `${org.name}은(는) 큰 문제는 없지만 최근 지표가 나빠지고 있어 확인이 필요합니다.`
        : `${org.name}은(는) 같은 문제가 반복되고 있어 기부 전 신중한 검토를 권합니다.`;

  const summary =
    `${first.year}~${last.year}년 ${m.years}년간 총 ${won(m.totalReceived)}을 모금했고, 평균 ${pct(m.avgProgram)}를 사업에 썼습니다. ` +
    `최근 연도 기준 사업비 ${pct(m.latestProgram)}, 운영비 ${pct(m.latestAdmin)}입니다.` +
    pattern +
    (m.currentCampaigns.length ? ` 현재 진행 중인 모집건 판정은 ${m.currentCampaigns.map((c) => `${c.title}(${c.score === null ? "진행 예정" : `${c.score}점 ${c.health}`})`).join(", ")}입니다.` : "");

  const advice =
    grade === "신뢰 가능"
      ? "정기 기부도 무리가 없어 보입니다. 기부 후 '기부내역' 페이지에서 사용처를 확인해 보세요."
      : grade === "주의 필요"
        ? "기부 전 최근 공개보고서와 다음 공시에서 지적 사항이 개선되는지 확인하고, 정기 기부보다 일시 기부를 권합니다."
        : "같은 분야의 다른 기관과 비교해 보시고, 기부하신다면 사용처를 지정할 수 있는 모집건을 선택하세요.";

  return { grade, score: m.indicatorScore, headline, summary, strengths: strengths.slice(0, 3), risks: risks.slice(0, 4), advice };
}

export function listOrganizations() {
  return ORGANIZATIONS;
}
