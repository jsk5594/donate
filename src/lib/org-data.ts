/**
 * 기부 주관기관(모집기관) 가상 이력 데이터
 * - 연도별 결산 공시(수입·사업수행비용·일반관리비용·모금비용·이월잔액), 공시 지연일, 외부감사 의견, 행정처분·지적사항.
 * - 모든 기관명·수치는 가상입니다. 실존 기관명(예: 대한적십자사)에 가상 수치를 붙이면 명예훼손 소지가 있으므로,
 *   실제 기관을 다룰 때는 국세청 공익법인 결산서류 공시·행정안전부 기부통합관리시스템 등 실데이터로만 연결하세요.
 * - 공시는 기관 전체 결산이므로, 그해 수입·비용 유형별 금액이 기부 돋보기 원장의 해당 기관 합계보다 작을 수 없습니다.
 * - DB 연결 시 organizations / organization_annual_reports / organization_issues 테이블로 옮깁니다.
 */

import type { LegalBasis } from "./types";

export type AuditOpinion = "적정" | "한정" | "부적정" | "의견거절" | "미실시";

export interface OrgYear {
  year: number;
  received: number; // 연간 기부금 수입(원)
  program: number; // 사업수행비용
  admin: number; // 일반관리비용
  fundraising: number; // 모금비용
  carryover: number; // 차기 이월 미집행 잔액
  beneficiaries: number; // 수혜 인원·가구
  disclosureDelayDays: number; // 결산 공시 기한 대비 지연일(0 = 기한 내)
  auditOpinion: AuditOpinion;
}

export interface OrgIssue {
  year: number;
  severity: "경미" | "중대";
  title: string;
  source: string; // 출처
}

export interface Organization {
  id: string;
  name: string; // 캠페인 organizer 문자열과 같아야 현재 모집건이 연결됨
  legalType: string;
  founded: number;
  field: string;
  designated: boolean; // 지정기부금단체(공익법인) 지정 여부
  legalBasis?: LegalBasis; // 주된 모금의 근거 법률(세칙 제2조의2) — 없으면 기부금품법
  years: OrgYear[];
  issues: OrgIssue[];
}

const 억 = 1_0000_0000;

/** [연도, 수입(억), 사업비율, 관리비율, 모금비율, 수혜, 공시지연일, 감사의견] → OrgYear (이월 = 수입 − 지출) */
type Row = [number, number, number, number, number, number, number, AuditOpinion];
function years(rows: Row[]): OrgYear[] {
  return rows.map(([year, rec, p, a, f, beneficiaries, delay, audit]) => {
    const received = Math.round(rec * 억);
    const program = Math.round(received * p);
    const admin = Math.round(received * a);
    const fundraising = Math.round(received * f);
    return { year, received, program, admin, fundraising, carryover: received - program - admin - fundraising, beneficiaries, disclosureDelayDays: delay, auditOpinion: audit };
  });
}

export const ORGANIZATIONS: Organization[] = [
  {
    id: "warm-neighbor",
    name: "따뜻한이웃복지회",
    legalType: "사단법인",
    founded: 2012,
    field: "독거노인·저소득층 생활 지원",
    designated: true,
    years: years([
      [2021, 1.6, 0.78, 0.08, 0.04, 410, 3, "적정"],
      [2022, 1.8, 0.75, 0.09, 0.045, 430, 10, "적정"],
      [2023, 2.0, 0.7, 0.1, 0.05, 440, 21, "적정"],
      [2024, 5.7, 0.66, 0.115, 0.05, 420, 35, "한정"],
      [2025, 2.3, 0.62, 0.13, 0.05, 400, 48, "한정"],
    ]),
    issues: [
      { year: 2024, severity: "경미", title: "관할청 개선권고 — 일반관리비 비중 과다(11.5%)", source: "관할청 지도점검 결과" },
      { year: 2025, severity: "경미", title: "결산서류 공시 기한 48일 경과", source: "공익법인 공시 이력" },
    ],
  },
  {
    id: "blue-sea",
    name: "푸른바다시민연대",
    legalType: "비영리민간단체",
    founded: 2016,
    field: "해양쓰레기 수거·연안 정화",
    designated: false,
    years: years([
      [2021, 0.5, 0.7, 0.06, 0.12, 1200, 0, "미실시"],
      [2022, 1.85, 0.66, 0.06, 0.14, 1500, 5, "미실시"],
      [2023, 2.1, 0.62, 0.06, 0.16, 1700, 12, "적정"],
      [2024, 4.0, 0.6, 0.06, 0.18, 1400, 30, "한정"],
      [2025, 1.3, 0.58, 0.06, 0.17, 1600, 20, "한정"],
    ]),
    issues: [
      { year: 2023, severity: "중대", title: "모집비용 법정 한도(15%) 초과 — 시정명령", source: "기부금품 모집 관할청 처분" },
      { year: 2024, severity: "중대", title: "모집비용 한도 초과 재발(18%) — 과태료 부과", source: "기부금품 모집 관할청 처분" },
    ],
  },
  {
    id: "gangwon-relief",
    name: "강원재해복구나눔재단",
    legalType: "재단법인",
    legalBasis: "재해구호법",
    founded: 2005,
    field: "재난 이재민 구호·주거 지원",
    designated: true,
    years: years([
      [2021, 4.0, 0.8, 0.04, 0.02, 520, 0, "적정"],
      [2022, 3.5, 0.82, 0.04, 0.02, 480, 0, "적정"],
      [2023, 6.0, 0.78, 0.04, 0.02, 900, 2, "적정"],
      [2024, 5.2, 0.8, 0.04, 0.02, 760, 0, "적정"],
      [2025, 7.0, 0.52, 0.04, 0.02, 610, 5, "적정"],
    ]),
    issues: [{ year: 2025, severity: "경미", title: "산불 모금 종료 후 미집행 잔액 42% 이월 — 집행계획 제출 요구", source: "관할청 사후관리" }],
  },
  {
    id: "hankki",
    name: "한끼나눔아동재단",
    legalType: "재단법인",
    founded: 2010,
    field: "결식우려아동 급식 지원",
    designated: true,
    years: years([
      [2021, 2.0, 0.86, 0.07, 0.04, 1800, 0, "적정"],
      [2022, 2.2, 0.87, 0.07, 0.04, 1950, 0, "적정"],
      [2023, 2.3, 0.87, 0.08, 0.04, 2050, 0, "적정"],
      [2024, 2.5, 0.88, 0.08, 0.04, 2200, 0, "적정"],
      [2025, 4.4, 0.874, 0.086, 0.04, 2150, 0, "적정"],
    ]),
    issues: [],
  },
  {
    id: "baeum",
    name: "배움다리교육재단",
    legalType: "재단법인",
    founded: 2014,
    field: "농어촌 교육 격차 해소",
    designated: true,
    years: years([
      [2021, 0.8, 0.89, 0.06, 0.03, 310, 0, "적정"],
      [2022, 2.65, 0.9, 0.06, 0.03, 330, 0, "적정"],
      [2023, 3.65, 0.9, 0.06, 0.03, 350, 1, "적정"],
      [2024, 3.3, 0.91, 0.06, 0.03, 360, 0, "적정"],
      [2025, 3.0, 0.91, 0.06, 0.03, 370, 0, "적정"],
    ]),
    issues: [],
  },
  {
    id: "gotjawal",
    name: "곶자왈생명숲네트워크",
    legalType: "사단법인",
    founded: 2018,
    field: "제주 곶자왈 숲 복원",
    designated: true,
    years: years([
      [2021, 0.6, 0.85, 0.07, 0.04, 0, 4, "미실시"],
      [2022, 2.3, 0.87, 0.07, 0.04, 0, 2, "적정"],
      [2023, 1.2, 0.88, 0.065, 0.04, 0, 2, "적정"],
      [2024, 1.4, 0.89, 0.065, 0.04, 0, 0, "적정"],
      [2025, 3.8, 0.895, 0.065, 0.04, 0, 0, "적정"],
    ]),
    issues: [],
  },
  {
    id: "child-rehab",
    name: "어린이재활나눔재단",
    legalType: "재단법인",
    founded: 2015,
    field: "장애아동 재활·보조기기 지원",
    designated: true,
    years: years([
      [2021, 1.1, 0.8, 0.05, 0.05, 240, 0, "적정"],
      [2022, 2.75, 0.79, 0.05, 0.05, 250, 7, "적정"],
      [2023, 2.3, 0.8, 0.05, 0.05, 230, 0, "적정"],
      [2024, 1.3, 0.81, 0.05, 0.05, 270, 0, "적정"],
      [2025, 1.2, 0.8, 0.05, 0.05, 260, 3, "적정"],
    ]),
    issues: [{ year: 2022, severity: "경미", title: "기부금영수증 발급 오류(12건) — 자진 정정", source: "국세청 공시 정정 이력" }],
  },
  {
    id: "gb-relief",
    name: "경북재난이웃돕기회",
    legalType: "사단법인",
    legalBasis: "재해구호법",
    founded: 2008,
    field: "태풍·지진 피해 복구 지원",
    designated: true,
    years: years([
      [2021, 3.0, 0.88, 0.055, 0.045, 640, 0, "적정"],
      [2022, 5.5, 0.89, 0.055, 0.045, 1100, 0, "적정"],
      [2023, 3.75, 0.88, 0.055, 0.045, 600, 0, "적정"],
      [2024, 4.1, 0.9, 0.055, 0.045, 820, 0, "적정"],
      [2025, 7.35, 0.9, 0.055, 0.045, 1350, 0, "적정"],
    ]),
    issues: [],
  },
];

export function getOrganization(id: string): Organization | undefined {
  return ORGANIZATIONS.find((o) => o.id === id);
}

export function organizationByName(name: string): Organization | undefined {
  return ORGANIZATIONS.find((o) => o.name === name);
}
