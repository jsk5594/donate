/** 모집건의 지역 문구(예: "경남 거제시", "전남광주·경남 도서지역")를 시·도 약칭으로 나눕니다 */

/**
 * 시·도 약칭. 광주광역시와 전라남도는 2026. 7. 1. 전남광주통합특별시로 통합되어 '전남광주' 하나로 셉니다
 * (「전남광주통합특별시 설치를 위한 특별법」. 법률상 약칭 '광주특별시'는 옛 광주광역시와 헷갈려 화면에서는 '전남광주'를 씀).
 */
export const SIDO = ["서울", "부산", "대구", "인천", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남광주", "경북", "경남", "제주"] as const;
export type Sido = (typeof SIDO)[number];

/** 통합 전 지명도 통합 시·도로 셈 — 예: 2025년 모집건의 "전남 여수", "광주" */
const ALIASES: Partial<Record<Sido, string[]>> = {
  전남광주: ["전남광주", "전남", "광주"],
};

/** 비어 있으면 특정 시·도에 속하지 않는 전국 단위 모집건 */
export function sidosOf(region: string): Sido[] {
  return SIDO.filter((s) => (ALIASES[s] ?? [s]).some((name) => region.includes(name)));
}
