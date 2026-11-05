/** 모집건의 지역 문구(예: "경남 거제시", "전남·경남 도서지역")를 시·도 약칭으로 나눕니다 */

export const SIDO = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"] as const;
export type Sido = (typeof SIDO)[number];

/** 비어 있으면 특정 시·도에 속하지 않는 전국 단위 모집건 */
export function sidosOf(region: string): Sido[] {
  return SIDO.filter((s) => region.includes(s));
}
