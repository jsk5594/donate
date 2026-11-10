/**
 * 화면 표기 — 처음 온 사람도 읽을 수 있는 쉬운 말을 먼저 쓰고, 회계·법률 용어(orig)는 마우스를 올리면 보이게 합니다.
 * 운영 세칙 본문과 결산 보고서 본문(공식 문서)은 원래 용어를 그대로 씁니다.
 */
import type { ExpenseType, HealthLevel } from "./types";

export const TERMS = {
  program: { label: "수혜자에게 간 돈", orig: "사업수행비용" },
  admin: { label: "운영비", orig: "일반관리비용(기관 운영에 든 돈)" },
  fundraising: { label: "모금에 쓴 돈", orig: "모금비용(홍보·결제 수수료 등)" },
  balance: { label: "남은 돈", orig: "미집행 잔액(다음 공개 때 이월)" },
  inflow: { label: "들어온 돈", orig: "대차대조표 차변: 기부받은 돈" },
  outflow: { label: "나간 돈 + 남은 돈", orig: "대차대조표 대변: 쓰인 돈 + 잔액" },
  integrity: { label: "장부 일치", orig: "정합성: 기부받은 돈 − 쓰인 돈 − 잔액 = 0" },
  programShare: { label: "쓴 돈 중 수혜자에게 간 비율", orig: "사업수행비용 비중(총지출 대비)" },
  score: { label: "투명도 점수", orig: "기부투명도지수: 7개 기준 점수의 합(0~100)" },
  stat: { label: "지출 항목", orig: "통계목(공익법인회계기준 비용 분류)" },
  disclosure: { label: "사용 내역 공개", orig: "공개주기·결과 보고(기부금품법 제14조)" },
} as const;

export type TermKey = keyof typeof TERMS;

/** 지출 유형(원장 값) → 화면 표기 */
export const EXPENSE_TYPE_LABEL: Record<ExpenseType, string> = {
  사업수행비용: TERMS.program.label,
  일반관리비용: TERMS.admin.label,
  모금비용: TERMS.fundraising.label,
};

/** 판정 등급(내부 값) → 화면 표기. '위반'은 법 위반 확정처럼 읽혀 '기준 초과'로 씀 */
export const LEVEL_TEXT: Record<HealthLevel, string> = { 양호: "통과", 주의: "주의", 위반: "기준 초과" };
