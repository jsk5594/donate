/**
 * 기부금 운영 판정 규칙
 *
 * 근거
 * - 「기부금품의 모집ㆍ사용 및 기부문화 활성화에 관한 법률」 제3조(다른 법률에 따른 모집은 적용 제외),
 *   제4조(1천만원 이상 모집등록·등록청·모집기간 1년), 제12조(목적 외 사용 금지·사용기간 2년),
 *   제13조(모집비용 충당비율: 15% 이내에서 대통령령으로 정하는 비율), 제14조(공개의무)
 * - 같은 법 시행령 제19조(모집 완료 후 30일 이내 완료보고)·제20조(사용 완료 후 60일 이내 사용명세 보고·회계감사)
 * - 행정안전부 1365기부포털 '기부활동 가이드'(기부금품법·모집등록 안내)
 * - 같은 법 시행령의 모집금액 구간별 모집비용 비율(10억 이하 15% … 200억 초과 10%)
 *   ※ 구간별 수치는 제출 전 국가법령정보센터에서 최신 시행령으로 재확인할 것
 * - 공익법인회계기준(기획재정부 고시) 운영성과표: 사업수행비용 / 일반관리비용 / 모금비용
 * - 해외: BBB Wise Giving Alliance — 총지출의 65% 이상 프로그램, 모금비용은 관련 기부금의 35% 이하
 */

import type { BalanceSheet, Campaign, CampaignHealth, CampaignSummary, HealthCheck, HealthLevel, LegalBasis } from "./types";

/**
 * 근거 법률별 적용 기준(세칙 제2조의2)
 * - statutory: 기부금품법의 모집등록·모금비용 한도를 '법정 기준'으로 적용하는지
 * - 그 외 모집건은 같은 비율을 '세칙 준용 기준'으로 판정하고, 법정 위반으로 표현하지 않음
 */
export const LEGAL_BASIS_INFO: Record<LegalBasis, { statute: string; statutory: boolean; note: string }> = {
  기부금품법: {
    statute: "「기부금품의 모집ㆍ사용 및 기부문화 활성화에 관한 법률」",
    statutory: true,
    note: "모집등록(제4조)·모집비용 충당비율(제13조)·공개의무(제14조)를 법정 기준으로 적용합니다.",
  },
  재해구호법: {
    statute: "「재해구호법」",
    statutory: false,
    note: "기부금품법 제3조에 따라 기부금품법이 적용되지 않는 재해 의연금품 모집입니다. 비율 기준은 세칙으로 준용합니다.",
  },
  고향사랑기부금법: {
    statute: "「고향사랑 기부금에 관한 법률」",
    statutory: false,
    note: "지방자치단체가 고향사랑기부금법에 따라 받는 기부금입니다(기부금품법 적용 제외). 비율 기준은 세칙으로 준용합니다.",
  },
  사회복지공동모금회법: {
    statute: "「사회복지공동모금회법」",
    statutory: false,
    note: "기부금품법 제3조에 따라 기부금품법이 적용되지 않는 공동모금입니다. 비율 기준은 세칙으로 준용합니다.",
  },
};

/** 기부금품법 모집건인지 — 법정 기준(모집등록·제13조 한도)을 그대로 적용 */
export function isStatutory(c: Pick<Campaign, "legalBasis">): boolean {
  return LEGAL_BASIS_INFO[c.legalBasis].statutory;
}

/** 모금비용 한도의 성격 — 기부금품법 모집건은 법정 한도, 그 외는 세칙 준용 한도 */
export function fundraisingCapLabel(c: Pick<Campaign, "legalBasis">): string {
  return isStatutory(c) ? "법정 한도" : "세칙 준용 한도";
}

/** 기부금품법 절차 기준(제4조·제9조·제12조·제14조, 시행령 제19조·제20조) */
export const STATUTE = {
  registrationMinGoal: 1000_0000, // 모집목표 1천만원 이상 → 사전 모집등록
  ministryOverGoal: 10_0000_0000, // 10억 초과 → 행정안전부, 이하 → 시·도
  maxCollectYears: 1, // 모집기간 1년 이내
  usageYears: 2, // 사용기간: 모집기간 기산일부터 2년 이내
  completionReportDays: 30, // 모집 종료 후 30일 이내 모집완료 보고·공개
  usageReportDays: 60, // 사용 완료 후 60일 이내 사용명세 보고(감사보고서 첨부)
  auditOver: 1_0000_0000, // 1억 초과 모집 → 회계감사보고서 첨부(이하 → 지출증빙)
  inspectionFrom: 50_0000_0000, // 목표 50억 이상 → 모집기간 중 등록청 의무 검사
};

/** 모집목표액 기준 등록청(기부금품법 제4조, 시행령 제2조) */
export function registrationAuthority(goal: number): string {
  if (goal < STATUTE.registrationMinGoal) return "등록 대상 아님 (1천만원 미만)";
  return goal > STATUTE.ministryOverGoal ? "행정안전부장관" : "주된 사무소 소재지 시·도지사";
}

const addYears = (iso: string, years: number) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d;
};

/** 법정 사용기간 만료일 — 모집기간 기산일부터 2년(연장·불가항력 기간 제외) */
export function usagePeriodEnd(startDate: string): string {
  return new Date(addYears(startDate, STATUTE.usageYears).getTime() - 86400000).toISOString().slice(0, 10);
}

/** 모집기간이 1년 이내인지(종료일 포함) */
export function collectWithinLimit(startDate: string, endDate: string): boolean {
  return new Date(`${endDate.slice(0, 10)}T00:00:00Z`) < addYears(startDate, STATUTE.maxCollectYears);
}

/** 법정 모집비용(모금비용) 한도 — 모집금액 구간별 */
export function legalFundraisingCap(received: number): number {
  const 억 = 1_0000_0000;
  if (received <= 10 * 억) return 0.15;
  if (received <= 100 * 억) return 0.13;
  if (received <= 200 * 억) return 0.12;
  return 0.1;
}

/** 본 서비스 운영 세칙(내부 기준) */
export const POLICY = {
  adminRatioWarn: 0.08, // 일반관리비용(운영비) / 수입 — 주의
  adminRatioBad: 0.1, // — 위반(세칙 한도 10%)
  programShareMin: 0.65, // 사업수행비용 / 총지출 — BBB 65%
  programShareGood: 0.75, // 권장 75%
  balanceAfterEndWarn: 0.3, // 모집 종료 후 미집행 잔액 비율 주의
  balanceAfterEndBad: 0.5,
  disclosureGraceDays: 3, // 공개주기 초과 허용일
};

/**
 * 기부투명도지수(0~100) — 7개 항목 배점 합계
 * 정합성 15 · 모금비용 20 · 운영비 15 · 사업비 비중 20 · 미집행 잔액 10 · 공개·보고 10 · 모집등록·기간 10
 */
export const SCORE_WEIGHTS = { integrity: 15, fundraising: 20, admin: 15, program: 20, balance: 10, disclosure: 10, registration: 10 } as const;

/** 판정 항목 수(화면 문구용) */
export const CHECK_COUNT = Object.keys(SCORE_WEIGHTS).length;

/** 지수 구간: 80점 이상 양호 · 60~79점 주의 · 60점 미만 위반 */
export const SCORE_BANDS = { good: 80, warn: 60 } as const;

export function levelOfScore(score: number): HealthLevel {
  return score >= SCORE_BANDS.good ? "양호" : score >= SCORE_BANDS.warn ? "주의" : "위반";
}

/**
 * 여러 모집건을 묶은 지수(종합·지역·연도 평균 공통) — 기부받은 돈으로 가중 평균, 소수점 버림.
 * 묶음 전체의 가중치가 0이면 단순 평균, 대상이 없으면 null.
 */
export function aggregateIndex(items: { score: number; weight: number }[]): number | null {
  if (items.length === 0) return null;
  const weight = items.reduce((a, x) => a + x.weight, 0);
  return Math.floor(weight > 0 ? items.reduce((a, x) => a + x.score * x.weight, 0) / weight : items.reduce((a, x) => a + x.score, 0) / items.length);
}

/** 목표 달성률 — 모집한 기부금만 목표와 비교(이자 등 기타수입 제외) */
export function goalRate(sheet: BalanceSheet, goal: number): number {
  return goal ? (sheet.inflow.total - sheet.inflow.other) / goal : 0;
}

/** 투명도 확인이 필요한 모집건 — 돈이 아직 움직이는(집행이 끝나지 않은) 모집건 중 양호가 아닌 건 */
export function needsAttention(s: CampaignSummary): boolean {
  return s.campaign.status !== "예정" && s.campaign.status !== "완료" && s.health.overall !== "양호";
}

/**
 * 항목 점수(낮을수록 좋은 지표용). 비율 v에 따라 배점의
 * ideal 이하 100% → warn(양호|주의 경계)에서 80% → bad(주의|위반 경계)에서 60% → zero에서 0%로 선형 감소.
 * 경계를 등급 구간(80·60)과 맞춰, 항목 달성률만 봐도 양호·주의·위반을 알 수 있게 함.
 */
function pts(max: number, v: number, ideal: number, warn: number, bad: number, zero: number): number {
  const lerp = (x: number, x0: number, x1: number, y0: number, y1: number) => y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  let f: number;
  if (v <= ideal) f = 1;
  else if (v <= warn) f = lerp(v, ideal, warn, 1, 0.8);
  else if (v <= bad) f = lerp(v, warn, bad, 0.8, 0.6);
  else if (v < zero) f = lerp(v, bad, zero, 0.59, 0);
  else f = 0;
  return Math.round(max * f * 10) / 10;
}

/**
 * 지수 = min(항목 점수 합계, 가장 낮은 항목의 달성률×100)
 * - 모두 양호하면 합계로 세밀하게 구분
 * - 한 항목이 나쁘면 그 항목의 달성률이 지수를 끌어내림(주의 60~79, 위반 60 미만이 자연히 맞춰짐)
 */
function indexOf(checks: HealthCheck[], overall: HealthLevel): number {
  const total = checks.reduce((a, c) => a + c.points, 0);
  const weakest = Math.min(...checks.map((c) => (c.maxPoints ? (c.points / c.maxPoints) * 100 : 100)));
  const score = Math.floor(Math.min(total, weakest));
  // 반올림 오차로 경계에 걸칠 때만 등급 구간 안으로 보정
  if (overall === "위반") return Math.min(score, SCORE_BANDS.warn - 1);
  if (overall === "주의") return Math.min(Math.max(score, SCORE_BANDS.warn), SCORE_BANDS.good - 1);
  return Math.max(score, SCORE_BANDS.good);
}

function worst(levels: HealthLevel[]): HealthLevel {
  if (levels.includes("위반")) return "위반";
  if (levels.includes("주의")) return "주의";
  return "양호";
}

export function evaluateHealth(campaign: Campaign, sheet: BalanceSheet, now = new Date()): CampaignHealth {
  // 진행 예정: 모집 시작 전이라 비율 판정 대상이 아님 — 입금이 없는지만 확인
  if (campaign.status === "예정") {
    const clean = sheet.inflow.total === 0 && sheet.outflow.total === 0;
    return {
      campaignId: campaign.id,
      overall: clean ? "양호" : "위반",
      checks: [
        {
          key: "upcoming",
          label: "모집 시작 전 입출금",
          level: clean ? "양호" : "위반",
          value: clean ? "0원" : `${sheet.inflow.total.toLocaleString("ko-KR")}원`,
          threshold: "= 0원",
          basis: "기부금품법 제4조 (등록 후 모집기간 내 모집)",
          detail: clean
            ? `모집 시작일(${campaign.startDate}) 이후부터 비율·잔액·공개주기를 판정합니다.`
            : "모집 시작 전에 입금 또는 지출이 발생했습니다. 즉시 설명이 필요합니다.",
          points: 0,
          maxPoints: 0,
        },
      ],
      score: null,
    };
  }
  const received = sheet.inflow.total || 1;
  const spent = sheet.outflow.program + sheet.outflow.admin + sheet.outflow.fundraising;
  const checks: HealthCheck[] = [];

  // 1. 정합성: 좌 − 우 = 0
  checks.push({
    key: "integrity",
    label: "장부 일치 (들어온 돈 = 나간 돈 + 남은 돈)",
    level: Math.abs(sheet.difference) < 1 ? "양호" : "위반",
    value: `${sheet.difference.toLocaleString("ko-KR")}원`,
    threshold: "= 0원",
    basis: "세칙 제3조 (복식 원장 정합성)",
    detail:
      Math.abs(sheet.difference) < 1
        ? "들어온 돈이 모두 수혜자에게 간 돈·운영비·모금에 쓴 돈·남은 돈 중 하나로 설명됩니다."
        : "원장 합계와 계좌 잔액이 일치하지 않습니다. 즉시 설명이 필요합니다.",
    points: Math.abs(sheet.difference) < 1 ? SCORE_WEIGHTS.integrity : 0,
    maxPoints: SCORE_WEIGHTS.integrity,
  });

  // 2. 모금비용 한도 — 기부금품법 모집건은 법정 한도, 다른 법률 모집건은 같은 비율을 세칙으로 준용(세칙 제2조의2)
  const statutory = isStatutory(campaign);
  const cap = legalFundraisingCap(sheet.inflow.total);
  const frRatio = sheet.outflow.fundraising / received;
  checks.push({
    key: "fundraising",
    label: `모금에 쓴 돈 비율 (${fundraisingCapLabel(campaign)})`,
    level: frRatio > cap ? "위반" : frRatio > cap * 0.8 ? "주의" : "양호",
    value: `${(frRatio * 100).toFixed(1)}%`,
    threshold: `≤ ${(cap * 100).toFixed(0)}%`,
    basis: statutory ? "기부금품법 제13조 및 시행령 제18조(모집금액 구간별 비율)" : `세칙 제2조의2 (기부금품법 제13조 비율 준용 · 근거법 ${campaign.legalBasis})`,
    detail: statutory
      ? `모집금액 ${Math.round(sheet.inflow.total / 1_0000).toLocaleString("ko-KR")}만원 구간의 법정 한도는 ${(cap * 100).toFixed(0)}%입니다. 한도는 목표액이 아니라 실제 모집금액을 기준으로 합니다.`
      : `${LEGAL_BASIS_INFO[campaign.legalBasis].statute}에 따른 모집건이라 기부금품법 한도가 법적으로 적용되지는 않지만, 같은 구간 비율(${(cap * 100).toFixed(0)}%)을 세칙 기준으로 씁니다.`,
    points: pts(SCORE_WEIGHTS.fundraising, frRatio, cap * 0.4, cap * 0.8, cap, cap * 2),
    maxPoints: SCORE_WEIGHTS.fundraising,
  });

  // 3. 운영비(일반관리비용) 세칙 한도
  const adminRatio = sheet.outflow.admin / received;
  checks.push({
    key: "admin",
    label: "운영비 비율",
    level: adminRatio > POLICY.adminRatioBad ? "위반" : adminRatio > POLICY.adminRatioWarn ? "주의" : "양호",
    value: `${(adminRatio * 100).toFixed(1)}%`,
    threshold: `≤ ${(POLICY.adminRatioBad * 100).toFixed(0)}% (주의 ${(POLICY.adminRatioWarn * 100).toFixed(0)}%)`,
    basis: "세칙 제22조 (운영비 상한)",
    detail: "인건비·임차료·회계감사비 등 모집 목적 사업과 직접 관련 없는 관리비용입니다.",
    points: pts(SCORE_WEIGHTS.admin, adminRatio, 0.04, POLICY.adminRatioWarn, POLICY.adminRatioBad, 0.2),
    maxPoints: SCORE_WEIGHTS.admin,
  });

  // 4. 사업수행비용 비중 (총지출 대비)
  const programShare = spent > 0 ? sheet.outflow.program / spent : 1;
  checks.push({
    key: "program",
    label: "쓴 돈 중 수혜자에게 간 비율",
    level: spent === 0 ? "양호" : programShare < POLICY.programShareMin ? "위반" : programShare < POLICY.programShareGood ? "주의" : "양호",
    value: spent === 0 ? "집행 전" : `${(programShare * 100).toFixed(1)}%`,
    threshold: `≥ ${(POLICY.programShareMin * 100).toFixed(0)}% (권장 ${(POLICY.programShareGood * 100).toFixed(0)}%)`,
    basis: "세칙 제18조 · BBB Wise Giving Alliance 기준 1",
    detail: "쓰인 돈 중 실제 수혜자에게 전달된(기부된) 몫입니다.",
    // 높을수록 좋은 지표 → 부호를 뒤집어 같은 함수 사용
    points: spent === 0 ? SCORE_WEIGHTS.program : pts(SCORE_WEIGHTS.program, -programShare, -0.9, -POLICY.programShareGood, -POLICY.programShareMin, -0.35),
    maxPoints: SCORE_WEIGHTS.program,
  });

  // 5. 사용기간·미집행 잔액 (모집 종료 후)
  const ended = new Date(campaign.endDate) < now;
  const balanceRatio = sheet.outflow.balance / received;
  checks.push({
    key: "balance",
    label: "남은 돈 (모집 종료 후)",
    level: !ended ? "양호" : balanceRatio > POLICY.balanceAfterEndBad ? "위반" : balanceRatio > POLICY.balanceAfterEndWarn ? "주의" : "양호",
    value: `${(balanceRatio * 100).toFixed(1)}%`,
    threshold: ended ? `≤ ${(POLICY.balanceAfterEndWarn * 100).toFixed(0)}%` : "모집 중(해당 없음)",
    basis: "기부금품법 제12조 (사용기간 2년, 목적 외 사용 금지)",
    detail: ended
      ? "모집이 종료되었으므로 잔액의 사용 계획과 집행 일정이 공개되어야 합니다."
      : "모집 진행 중에는 잔액이 남아 있는 것이 정상입니다.",
    points: !ended ? SCORE_WEIGHTS.balance : pts(SCORE_WEIGHTS.balance, balanceRatio, 0.1, POLICY.balanceAfterEndWarn, POLICY.balanceAfterEndBad, 1),
    maxPoints: SCORE_WEIGHTS.balance,
  });

  // 6. 공개주기 준수 (완료건은 집행 완료 후 최종 결산 공개 여부로 판정)
  const daysSince = Math.floor((now.getTime() - new Date(campaign.lastDisclosedAt).getTime()) / 86400000);
  if (campaign.status === "완료" && campaign.completedAt) {
    const finalLag = Math.floor((new Date(campaign.lastDisclosedAt).getTime() - new Date(campaign.completedAt).getTime()) / 86400000);
    const ok = finalLag >= 0 && finalLag <= campaign.disclosureCycleDays + POLICY.disclosureGraceDays;
    // 법정 사용완료 보고 기한(시행령 제20조: 사용 완료 후 60일)을 넘기면 위반 — 기부금품법 모집건만
    const pastStatute = statutory && finalLag > STATUTE.usageReportDays;
    const grace = campaign.disclosureCycleDays + POLICY.disclosureGraceDays;
    const latePts = pts(SCORE_WEIGHTS.disclosure, finalLag, campaign.disclosureCycleDays, grace, grace + 30, grace + 60);
    const auditNote = !statutory
      ? ""
      : sheet.inflow.total > STATUTE.auditOver
        ? " 모집금액이 1억원을 넘어 사용명세 보고서에 회계감사보고서를 붙여야 합니다."
        : " 모집금액이 1억원 이하라 회계감사보고서 대신 지출증빙서류를 붙일 수 있습니다.";
    checks.push({
      key: "disclosure",
      label: "최종 결산 공개·사용완료 보고",
      level: finalLag < 0 || pastStatute ? "위반" : ok ? "양호" : "주의",
      value: finalLag < 0 ? "미공개" : `집행 완료 후 ${finalLag}일`,
      threshold: statutory ? `완료 후 ${campaign.disclosureCycleDays}일 이내 (법정 ${STATUTE.usageReportDays}일)` : `완료 후 ${campaign.disclosureCycleDays}일 이내`,
      basis: statutory ? "기부금품법 제14조 · 시행령 제20조 · 세칙 제15조·제46조" : "세칙 제15조",
      detail:
        (finalLag < 0
          ? "집행 완료 후 최종 결산이 공개되지 않았습니다."
          : pastStatute
            ? `집행 완료(${campaign.completedAt}) 후 ${finalLag}일 만에 공개되어 법정 보고 기한(${STATUTE.usageReportDays}일)을 넘겼습니다.`
            : `집행 완료(${campaign.completedAt}) 후 최종 사용내역이 공개되었습니다.`) + auditNote,
      // 세칙 기한만 넘긴 늦은 공개는 최대 '주의'(60%까지), 법정 기한 초과는 '위반' 구간, 미공개는 0점
      points: finalLag < 0 ? 0 : pastStatute ? Math.max(SCORE_WEIGHTS.disclosure * 0.3, Math.min(SCORE_WEIGHTS.disclosure * 0.55, latePts)) : Math.max(SCORE_WEIGHTS.disclosure * 0.6, latePts),
      maxPoints: SCORE_WEIGHTS.disclosure,
    });
    checks.push(registrationCheck(campaign, sheet));
    const overall = worst(checks.map((c) => c.level));
    return { campaignId: campaign.id, overall, checks, score: indexOf(checks, overall) };
  }
  const overdue = daysSince - campaign.disclosureCycleDays;
  const cycleLevel: HealthLevel = overdue > POLICY.disclosureGraceDays + 14 ? "위반" : overdue > POLICY.disclosureGraceDays ? "주의" : "양호";
  const cyclePts = pts(SCORE_WEIGHTS.disclosure, overdue, 0, POLICY.disclosureGraceDays, POLICY.disclosureGraceDays + 14, POLICY.disclosureGraceDays + 74);
  // 모집완료 보고(시행령 제19조): 모집 종료 후 30일이 지나도록 종료일 이후 공개가 없으면 위반 — 기부금품법 모집건만
  const daysSinceEnd = Math.floor((now.getTime() - new Date(campaign.endDate).getTime()) / 86400000);
  const missedCompletion = statutory && ended && daysSinceEnd > STATUTE.completionReportDays && campaign.lastDisclosedAt < campaign.endDate;
  checks.push({
    key: "disclosure",
    label: statutory ? "사용 내역 공개·모집완료 보고" : "사용 내역 공개",
    level: missedCompletion ? "위반" : cycleLevel,
    value: `마지막 공개 ${daysSince}일 전`,
    threshold: statutory && ended ? `${campaign.disclosureCycleDays}일마다 · 종료 후 ${STATUTE.completionReportDays}일 내 완료보고` : `${campaign.disclosureCycleDays}일마다`,
    basis: statutory ? "기부금품법 제14조 · 시행령 제19조 · 세칙 제15조·제45조" : "세칙 제15조",
    detail: missedCompletion
      ? `모집 종료(${campaign.endDate}) 후 ${daysSinceEnd}일이 지났지만 모집 결과가 공개되지 않아 법정 모집완료 보고 기한(${STATUTE.completionReportDays}일)을 넘겼습니다.`
      : overdue > POLICY.disclosureGraceDays
        ? `공개 기한을 ${overdue}일 초과했습니다.`
        : "정해진 주기 안에 사용내역이 공개되고 있습니다.",
    points: missedCompletion ? Math.min(SCORE_WEIGHTS.disclosure * 0.3, cyclePts) : cyclePts,
    maxPoints: SCORE_WEIGHTS.disclosure,
  });

  // 7. 모집등록·모집기간
  checks.push(registrationCheck(campaign, sheet));

  const overall = worst(checks.map((c) => c.level));
  return { campaignId: campaign.id, overall, checks, score: indexOf(checks, overall) };
}

/**
 * 7. 모집등록·모집기간(기부금품법 제4조, 시행령 제2조·제19조, 세칙 제36조~제40조) — 기부금품법 모집건만 판정
 * - 위반: 목표 1천만원 이상인데 등록번호 없음, 모집기간 1년 초과
 * - 주의: 등록청이 목표액 구간과 맞지 않음(10억 초과 → 행정안전부), 목표액에 도달했는데 모집 계속
 * - 다른 법률 모집건: '해당 없음'(만점)
 */
export function registrationCheck(campaign: Campaign, sheet: BalanceSheet): HealthCheck {
  const max = SCORE_WEIGHTS.registration;
  if (!isStatutory(campaign)) {
    const info = LEGAL_BASIS_INFO[campaign.legalBasis];
    return {
      key: "registration",
      label: "모집등록·모집기간",
      level: "양호",
      value: "해당 없음",
      threshold: "기부금품법 모집건만 적용",
      basis: `세칙 제2조의2 · ${info.statute}`,
      detail: info.note,
      points: max,
      maxPoints: max,
    };
  }
  const bad: string[] = [];
  const warn: string[] = [];
  const authority = registrationAuthority(campaign.goal);
  const regNo = campaign.registrationNo.trim();
  const needsRegistration = campaign.goal >= STATUTE.registrationMinGoal;
  if (needsRegistration && !regNo) bad.push("모집등록번호 없음");
  if (!collectWithinLimit(campaign.startDate, campaign.endDate)) bad.push("모집기간 1년 초과");
  if (needsRegistration && regNo && regNo.startsWith("행안") !== campaign.goal > STATUTE.ministryOverGoal) warn.push(`등록청 불일치(${authority} 등록 대상)`);
  const raised = sheet.inflow.total - sheet.inflow.other;
  if (campaign.status === "모집중" && campaign.goal > 0 && raised >= campaign.goal) warn.push("목표액 도달 후에도 모집 계속");
  const level: HealthLevel = bad.length ? "위반" : warn.length ? "주의" : "양호";
  const issues = [...bad, ...warn];
  return {
    key: "registration",
    label: "모집등록·모집기간",
    level,
    value: issues[0] ?? (needsRegistration ? "등록·기간 준수" : "등록 대상 아님"),
    threshold: "목표 1천만원 이상 사전등록 · 모집 1년 이내",
    basis: "기부금품법 제4조 · 시행령 제2조·제19조 · 세칙 제36조~제40조",
    detail:
      (issues.length ? `${issues.join(", ")}. ` : "") +
      `등록청 ${authority} · 모집기간 ${campaign.startDate} ~ ${campaign.endDate} · 법정 사용기간 ${usagePeriodEnd(campaign.startDate)}까지` +
      (campaign.goal >= STATUTE.inspectionFrom ? " · 목표 50억원 이상이라 모집기간 중 등록청 의무 검사 대상입니다." : "."),
    // 위반 40%·주의 70% — 등급 구간(60·80)과 맞춤
    points: level === "위반" ? max * 0.4 : level === "주의" ? max * 0.7 : max,
    maxPoints: max,
  };
}
