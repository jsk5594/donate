/**
 * 도메인 타입 정의
 * - DB(예: Prisma/PostgreSQL) 연결 시 이 타입을 기준으로 매핑합니다.
 * - UI에는 "Public*" 타입(가명처리된 형태)만 전달합니다.
 */

export type DonorType = "개인" | "기업" | "단체";

/** 우측(사용) 구분 — 공익법인회계기준 운영성과표의 3대 비용 + 미집행 잔액 */
export type ExpenseType = "사업수행비용" | "일반관리비용" | "모금비용";

/** 예정(모집 시작 전) → 모집중 → 집행중 → 종료(모집 종료, 집행 미완) → 완료(집행·정산 완료, 잔액 0) */
export type CampaignStatus = "예정" | "모집중" | "집행중" | "종료" | "완료";

/** 화면 분류용 3단계: 진행중(모집중·집행중·종료) / 진행 예정 / 완료 */
export type CampaignPhase = "진행중" | "진행 예정" | "완료";

export function phaseOf(status: CampaignStatus | string): CampaignPhase {
  if (status === "예정") return "진행 예정";
  if (status === "완료") return "완료";
  return "진행중";
}

export const PHASES: CampaignPhase[] = ["진행중", "진행 예정", "완료"];

/** 화면 표시용 진행상황 3구분: 모집중·집행중 → 진행중 / 예정 → 진행 예정 / 종료·완료 → 종료 */
export const STAGES = ["진행중", "진행 예정", "종료"] as const;
export type Stage = (typeof STAGES)[number];
export function stageOf(status: CampaignStatus): Stage {
  if (status === "예정") return "진행 예정";
  if (status === "종료" || status === "완료") return "종료";
  return "진행중";
}

export interface Category {
  id: string;
  name: string; // 재난, 고향사랑, 복지, 교육, 환경 ...
  description: string;
}

export interface Campaign {
  id: string;
  categoryId: string;
  title: string; // 거제도 홍수 피해 복구 ...
  region: string;
  organizer: string; // 모집기관
  registrationNo: string; // 기부금품 모집등록번호(가상)
  purpose: string;
  goal: number; // 목표 모집액(원)
  startDate: string; // ISO
  endDate: string; // ISO
  status: CampaignStatus;
  disclosureCycleDays: number; // 공개주기(일)
  lastDisclosedAt: string; // 마지막 공개일
  completedAt?: string; // 집행 완료일(status "완료"일 때)
}

/** DB 원본 형태(개인정보 포함) — 서버 내부에서만 사용 */
export interface DonationRecord {
  id: string;
  campaignId: string;
  donorName: string; // 원본 이름/상호
  donorType: DonorType;
  donorPhoneLast4?: string;
  amount: number;
  donatedAt: string;
  method: "계좌이체" | "카드" | "간편결제" | "현장모금";
  message?: string;
}

/** UI 전달용(가명처리) */
export interface PublicDonation {
  id: string;
  campaignId: string;
  donorCode: string; // D-XXXX (해시 기반)
  donorAlias: string; // 김*성, ㈜한*전자
  donorType: DonorType;
  amount: number;
  donatedAt: string;
  method: DonationRecord["method"];
  message?: string;
}

export interface ExpenseRecord {
  id: string;
  campaignId: string;
  type: ExpenseType;
  statCode: string; // 통계목 코드 (예: P-101)
  statName: string; // 통계목 명 (예: 분배비용-현금지원)
  vendor: string; // 거래처(공개 대상)
  recipient?: string; // 수혜자(개인정보 → 가명처리)
  description: string;
  amount: number;
  spentAt: string;
  receiptId: string;
}

export interface PublicExpense extends Omit<ExpenseRecord, "recipient"> {
  recipientAlias?: string;
}

/** 대차대조표형 집계 */
export interface BalanceSheet {
  /** 좌측: 기부받은 돈(수입) */
  inflow: {
    individual: number;
    corporate: number;
    group: number;
    other: number; // 이자수익 등
    total: number;
  };
  /** 우측: 쓰인 돈 + 미집행 잔액 */
  outflow: {
    program: number; // 사업수행비용(기부됨)
    admin: number; // 일반관리비용(운영비)
    fundraising: number; // 모금비용
    balance: number; // 미집행 잔액(이월)
    total: number;
  };
  /** 좌−우 (항상 0이어야 함) */
  difference: number;
}

export type HealthLevel = "양호" | "주의" | "위반";

export interface HealthCheck {
  key: string;
  label: string;
  level: HealthLevel;
  value: string; // 표시값 (예: 12.3%)
  threshold: string; // 기준 (예: ≤ 10%)
  basis: string; // 근거 (법령/세칙)
  detail: string;
  /** 기부투명도지수에 기여한 점수 / 배점 */
  points: number;
  maxPoints: number;
}

export interface CampaignHealth {
  campaignId: string;
  overall: HealthLevel;
  checks: HealthCheck[];
  /** 기부투명도지수(0~100). 진행 예정은 판정하지 않으므로 null */
  score: number | null;
}

export interface CampaignSummary {
  campaign: Campaign;
  category: Category;
  sheet: BalanceSheet;
  health: CampaignHealth;
  donationCount: number;
  expenseCount: number;
}

export interface RulePost {
  slug: string;
  title: string;
  category: "총칙" | "법령기준" | "회계기준" | "해외기준" | "판정기준" | "개인정보";
  publishedAt: string;
  summary: string;
  body: string[]; // 문단 배열(개조식 허용)
  sources: { title: string; url: string }[];
}
