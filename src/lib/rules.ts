/**
 * 기부금 운영 판정 규칙
 *
 * 근거
 * - 「기부금품의 모집ㆍ사용 및 기부문화 활성화에 관한 법률」 제12조(목적 외 사용 금지·사용기간 2년),
 *   제13조(모집비용 충당비율: 15% 이내에서 대통령령으로 정하는 비율), 제14조(공개의무)
 * - 같은 법 시행령의 모집금액 구간별 모집비용 비율(10억 이하 15% … 200억 초과 10%)
 *   ※ 구간별 수치는 제출 전 국가법령정보센터에서 최신 시행령으로 재확인할 것
 * - 공익법인회계기준(기획재정부 고시) 운영성과표: 사업수행비용 / 일반관리비용 / 모금비용
 * - 해외: BBB Wise Giving Alliance — 총지출의 65% 이상 프로그램, 모금비용은 관련 기부금의 35% 이하
 */

import type { BalanceSheet, Campaign, CampaignHealth, HealthCheck, HealthLevel } from "./types";

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
 * 기부투명도지수(0~100) — 6개 항목 배점 합계
 * 정합성 20 · 모금비용 20 · 운영비 15 · 사업비 비중 20 · 미집행 잔액 10 · 공개 15
 */
export const SCORE_WEIGHTS = { integrity: 20, fundraising: 20, admin: 15, program: 20, balance: 10, disclosure: 15 } as const;

/** 지수 구간: 80점 이상 양호 · 60~79점 주의 · 60점 미만 위반 */
export const SCORE_BANDS = { good: 80, warn: 60 } as const;

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
            : "모집 시작 전에 입금 또는 지출이 발생했습니다. 즉시 소명이 필요합니다.",
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
    label: "정합성 (기부받은 돈 − 쓰인 돈 − 잔액)",
    level: Math.abs(sheet.difference) < 1 ? "양호" : "위반",
    value: `${sheet.difference.toLocaleString("ko-KR")}원`,
    threshold: "= 0원",
    basis: "세칙 제3조 (복식 원장 정합성)",
    detail:
      Math.abs(sheet.difference) < 1
        ? "모든 입금이 사업비·운영비·모금비용·잔액 중 하나로 빠짐없이 설명됩니다."
        : "원장 합계와 계좌 잔액이 일치하지 않습니다. 즉시 소명이 필요합니다.",
    points: Math.abs(sheet.difference) < 1 ? SCORE_WEIGHTS.integrity : 0,
    maxPoints: SCORE_WEIGHTS.integrity,
  });

  // 2. 모금비용 법정 한도
  const cap = legalFundraisingCap(sheet.inflow.total);
  const frRatio = sheet.outflow.fundraising / received;
  checks.push({
    key: "fundraising",
    label: "모금비용 비율 (법정 한도)",
    level: frRatio > cap ? "위반" : frRatio > cap * 0.8 ? "주의" : "양호",
    value: `${(frRatio * 100).toFixed(1)}%`,
    threshold: `≤ ${(cap * 100).toFixed(0)}%`,
    basis: "기부금품법 제13조 및 시행령(모집금액 구간별 비율)",
    detail: `모집금액 ${Math.round(sheet.inflow.total / 1_0000).toLocaleString("ko-KR")}만원 구간의 법정 한도는 ${(cap * 100).toFixed(0)}%입니다.`,
    points: pts(SCORE_WEIGHTS.fundraising, frRatio, cap * 0.4, cap * 0.8, cap, cap * 2),
    maxPoints: SCORE_WEIGHTS.fundraising,
  });

  // 3. 운영비(일반관리비용) 세칙 한도
  const adminRatio = sheet.outflow.admin / received;
  checks.push({
    key: "admin",
    label: "운영비(일반관리비용) 비율",
    level: adminRatio > POLICY.adminRatioBad ? "위반" : adminRatio > POLICY.adminRatioWarn ? "주의" : "양호",
    value: `${(adminRatio * 100).toFixed(1)}%`,
    threshold: `≤ ${(POLICY.adminRatioBad * 100).toFixed(0)}% (주의 ${(POLICY.adminRatioWarn * 100).toFixed(0)}%)`,
    basis: "세칙 제6조 (운영비 상한)",
    detail: "인건비·임차료·회계감사비 등 모집 목적 사업과 직접 관련 없는 관리비용입니다.",
    points: pts(SCORE_WEIGHTS.admin, adminRatio, 0.04, POLICY.adminRatioWarn, POLICY.adminRatioBad, 0.2),
    maxPoints: SCORE_WEIGHTS.admin,
  });

  // 4. 사업수행비용 비중 (총지출 대비)
  const programShare = spent > 0 ? sheet.outflow.program / spent : 1;
  checks.push({
    key: "program",
    label: "사업수행비용 비중 (총지출 대비)",
    level: spent === 0 ? "양호" : programShare < POLICY.programShareMin ? "위반" : programShare < POLICY.programShareGood ? "주의" : "양호",
    value: spent === 0 ? "집행 전" : `${(programShare * 100).toFixed(1)}%`,
    threshold: `≥ ${(POLICY.programShareMin * 100).toFixed(0)}% (권장 ${(POLICY.programShareGood * 100).toFixed(0)}%)`,
    basis: "세칙 제7조 · BBB Wise Giving Alliance 기준 1",
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
    label: "미집행 잔액 (모집 종료 후)",
    level: !ended ? "양호" : balanceRatio > POLICY.balanceAfterEndBad ? "위반" : balanceRatio > POLICY.balanceAfterEndWarn ? "주의" : "양호",
    value: `${(balanceRatio * 100).toFixed(1)}%`,
    threshold: ended ? `≤ ${(POLICY.balanceAfterEndWarn * 100).toFixed(0)}%` : "모집 중 — 해당 없음",
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
    checks.push({
      key: "disclosure",
      label: "최종 결산 공개",
      level: finalLag < 0 ? "위반" : ok ? "양호" : "주의",
      value: finalLag < 0 ? "미공개" : `집행 완료 후 ${finalLag}일`,
      threshold: `완료 후 ${campaign.disclosureCycleDays}일 이내`,
      basis: "기부금품법 제14조 · 세칙 제9조",
      detail: finalLag < 0 ? "집행 완료 후 최종 결산이 공개되지 않았습니다." : `집행 완료(${campaign.completedAt}) 후 최종 사용내역이 공개되었습니다.`,
      // 완료 후 늦은 공개는 최대 '주의'(60%까지), 미공개만 0점
      points: finalLag < 0 ? 0 : Math.max(SCORE_WEIGHTS.disclosure * 0.6, pts(SCORE_WEIGHTS.disclosure, finalLag, campaign.disclosureCycleDays, campaign.disclosureCycleDays + POLICY.disclosureGraceDays, campaign.disclosureCycleDays + POLICY.disclosureGraceDays + 30, campaign.disclosureCycleDays + POLICY.disclosureGraceDays + 60)),
      maxPoints: SCORE_WEIGHTS.disclosure,
    });
    const overall = worst(checks.map((c) => c.level));
    return { campaignId: campaign.id, overall, checks, score: indexOf(checks, overall) };
  }
  const overdue = daysSince - campaign.disclosureCycleDays;
  checks.push({
    key: "disclosure",
    label: "공개주기 준수",
    level: overdue > POLICY.disclosureGraceDays + 14 ? "위반" : overdue > POLICY.disclosureGraceDays ? "주의" : "양호",
    value: `마지막 공개 ${daysSince}일 전`,
    threshold: `${campaign.disclosureCycleDays}일마다`,
    basis: "기부금품법 제14조 · 세칙 제9조",
    detail: overdue > POLICY.disclosureGraceDays ? `공개 기한을 ${overdue}일 초과했습니다.` : "정해진 주기 안에 사용내역이 공개되고 있습니다.",
    points: pts(SCORE_WEIGHTS.disclosure, overdue, 0, POLICY.disclosureGraceDays, POLICY.disclosureGraceDays + 14, POLICY.disclosureGraceDays + 74),
    maxPoints: SCORE_WEIGHTS.disclosure,
  });

  const overall = worst(checks.map((c) => c.level));
  return { campaignId: campaign.id, overall, checks, score: indexOf(checks, overall) };
}
