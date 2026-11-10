/**
 * 가상 데이터 생성기 (결정적 — 같은 시드면 항상 같은 데이터)
 * DB 연결 후에는 이 파일 대신 repository.ts의 DbRepository가 실데이터를 읽습니다.
 */

import { refineExpenses, type AuditTruth } from "./audit-plants.ts";
import type { Campaign, Category, DonationRecord, DonorType, ExpenseRecord, ExpenseType } from "./types";

// ---------- 시드 난수 ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const REFERENCE_NOW = new Date("2026-11-03T09:00:00+09:00");

// ---------- 카테고리 ----------
export const CATEGORIES: Category[] = [
  { id: "disaster", name: "재난·재해", description: "홍수·지진·산불 등 재난 피해 복구와 이재민 지원" },
  { id: "hometown", name: "고향사랑", description: "고향사랑기부제 지정기부 — 지역 현안 해결 사업" },
  { id: "welfare", name: "복지", description: "취약계층·어르신·아동 생활 지원" },
  { id: "education", name: "교육", description: "교육 격차 해소, 장학, 디지털 역량" },
  { id: "environment", name: "환경", description: "생태 복원, 해양·산림 보전" },
];

// ---------- 모집건(캠페인) ----------
// 지역 표기: 2026. 7. 1. 이후 모집건은 전남광주통합특별시('전남광주'), 그 전에 끝난 모집건은 당시 지명(전남·광주)을 그대로 둠.
// 지도·통계는 regions.ts에서 옛 지명도 '전남광주'로 묶어 셈.
interface CampaignSeed extends Campaign {
  /** 수입 목표(원) 및 사용 비율 설계 — 이상 사례를 일부러 심어둠 */
  plan: { received: number; program: number; admin: number; fundraising: number; donations: number };
}

const CAMPAIGN_SEEDS: CampaignSeed[] = [
  {
    id: "geoje-flood",
    categoryId: "disaster",
    title: "거제도 홍수 피해 복구",
    region: "경남 거제시",
    organizer: "거제한마음재난구호회",
    legalBasis: "재해구호법",
    registrationNo: "경남-2026-0712",
    purpose: "2026년 8월 집중호우로 침수된 주택 복구비와 생필품을 피해 가구 320세대에 지원합니다.",
    goal: 5_0000_0000,
    startDate: "2026-08-20",
    endDate: "2026-12-31",
    status: "모집중",
    disclosureCycleDays: 14,
    lastDisclosedAt: "2026-10-26",
    plan: { received: 3_6400_0000, program: 0.52, admin: 0.03, fundraising: 0.02, donations: 420 },
  },
  {
    id: "busan-quake",
    categoryId: "disaster",
    title: "부산 지진 피해 가구 지원",
    region: "부산광역시",
    organizer: "부산지진피해나눔연대",
    legalBasis: "재해구호법",
    registrationNo: "행안-2026-0455",
    purpose: "지진으로 거주지가 파손된 가구의 임시주거비와 안전점검·보수 비용을 지원합니다.",
    goal: 8_0000_0000,
    startDate: "2026-06-10",
    endDate: "2026-09-30",
    status: "집행중",
    disclosureCycleDays: 14,
    lastDisclosedAt: "2026-10-30",
    plan: { received: 8_4200_0000, program: 0.71, admin: 0.05, fundraising: 0.04, donations: 860 },
  },
  {
    id: "gangwon-fire",
    categoryId: "disaster",
    title: "강원 산불 이재민 주거 지원",
    region: "강원 강릉·동해",
    organizer: "강원재해복구나눔재단",
    legalBasis: "재해구호법",
    registrationNo: "강원-2026-0203",
    purpose: "산불로 주택을 잃은 이재민에게 임시조립주택과 생활안정 자금을 지원합니다.",
    goal: 6_0000_0000,
    startDate: "2026-03-05",
    endDate: "2026-06-30",
    status: "종료",
    disclosureCycleDays: 14,
    lastDisclosedAt: "2026-09-28",
    // 모집 종료 후에도 잔액 46% — 주의 사례
    plan: { received: 6_3100_0000, program: 0.46, admin: 0.05, fundraising: 0.03, donations: 640 },
  },
  {
    id: "hadong-heating",
    categoryId: "hometown",
    title: "하동군 취약계층 겨울 난방 지원",
    region: "경남 하동군",
    organizer: "하동군(고향사랑기부제 지정기부)",
    legalBasis: "고향사랑기부금법",
    registrationNo: "고향-2026-HD-01",
    purpose: "에너지 취약가구 540세대에 난방유·전기장판·단열용품을 지원합니다.",
    goal: 2_0000_0000,
    startDate: "2026-09-01",
    endDate: "2027-02-28",
    status: "집행중",
    disclosureCycleDays: 14,
    lastDisclosedAt: "2026-10-28",
    plan: { received: 1_4800_0000, program: 0.38, admin: 0.04, fundraising: 0.02, donations: 310 },
  },
  {
    id: "yeongyang-youth",
    categoryId: "hometown",
    title: "영양군 청년 정착 지원",
    region: "경북 영양군",
    organizer: "영양군(고향사랑기부제 지정기부)",
    legalBasis: "고향사랑기부금법",
    registrationNo: "고향-2026-YY-02",
    purpose: "귀촌 청년 창업 공간 조성과 정착 장려금을 지원합니다.",
    goal: 1_5000_0000,
    startDate: "2026-10-01",
    endDate: "2027-03-31",
    status: "모집중",
    disclosureCycleDays: 14,
    lastDisclosedAt: "2026-10-31",
    plan: { received: 4200_0000, program: 0.12, admin: 0.02, fundraising: 0.03, donations: 150 },
  },
  {
    id: "senior-winter",
    categoryId: "welfare",
    title: "독거어르신 겨울나기",
    region: "전국",
    organizer: "따뜻한이웃복지회",
    legalBasis: "기부금품법",
    registrationNo: "서울-2026-0611",
    purpose: "독거어르신 1,200명에게 김장김치·방한용품·안부전화 서비스를 제공합니다.",
    goal: 3_0000_0000,
    startDate: "2026-09-15",
    endDate: "2027-01-31",
    status: "집행중",
    disclosureCycleDays: 14,
    lastDisclosedAt: "2026-10-08",
    // 운영비 12.4% — 세칙 한도(10%) 위반 사례, 공개도 지연
    plan: { received: 2_2600_0000, program: 0.41, admin: 0.124, fundraising: 0.05, donations: 380 },
  },
  {
    id: "child-device",
    categoryId: "welfare",
    title: "장애아동 보조기기 지원",
    region: "전국",
    organizer: "어린이재활나눔재단",
    legalBasis: "기부금품법",
    registrationNo: "서울-2026-0702",
    purpose: "저소득 장애아동 90명에게 맞춤형 휠체어·보청기·의사소통 보조기기를 지원합니다.",
    goal: 4_0000_0000,
    startDate: "2026-10-10",
    endDate: "2027-04-30",
    status: "모집중",
    disclosureCycleDays: 14,
    lastDisclosedAt: "2026-10-29",
    plan: { received: 9800_0000, program: 0.22, admin: 0.03, fundraising: 0.04, donations: 260 },
  },
  {
    id: "kca-digital",
    categoryId: "education",
    title: "도서지역 청소년 디지털 격차 해소",
    region: "전남광주·경남 도서지역",
    organizer: "섬마을디지털배움재단",
    legalBasis: "기부금품법",
    registrationNo: "전남광주-2026-0417",
    purpose: "도서·산간 청소년 100명에게 노트북과 디지털 교육을 지원합니다.",
    goal: 5000_0000,
    startDate: "2026-09-01",
    endDate: "2026-12-31",
    status: "집행중",
    disclosureCycleDays: 14,
    lastDisclosedAt: "2026-11-01",
    plan: { received: 3842_0000, program: 0.49, admin: 0.021, fundraising: 0.01, donations: 127 },
  },
  {
    id: "marine-trash",
    categoryId: "environment",
    title: "남해안 해양쓰레기 수거",
    region: "경남 통영·남해",
    organizer: "푸른바다시민연대",
    legalBasis: "기부금품법",
    registrationNo: "경남-2026-0822",
    purpose: "어촌계와 함께 연안 해양쓰레기를 수거하고 재활용 체계를 구축합니다.",
    goal: 1_2000_0000,
    startDate: "2026-07-01",
    endDate: "2026-12-31",
    status: "모집중",
    disclosureCycleDays: 14,
    lastDisclosedAt: "2026-10-27",
    // 모금비용 17.2% — 법정 한도(15%) 초과 사례
    plan: { received: 8600_0000, program: 0.45, admin: 0.06, fundraising: 0.172, donations: 330 },
  },

  // ---------- 기부 완료(집행·정산 완료) 모집건 ----------
  // status "완료": 지출은 completedAt까지만 발생하고, 사업수행비용이 잔여액(이자수익 포함)을 모두 소진해 잔액 0원.
  // ※ 기존 모집건의 난수 순서를 바꾸지 않도록 반드시 목록 끝에 추가합니다.
  {
    id: "yeongdeok-typhoon",
    categoryId: "disaster",
    title: "영덕 태풍 피해 어가 복구",
    region: "경북 영덕군",
    organizer: "경북재난이웃돕기회",
    legalBasis: "재해구호법",
    registrationNo: "경북-2025-0918",
    purpose: "2025년 9월 태풍으로 파손된 어선·양식시설 복구비와 피해 어가 생활안정 자금을 지원했습니다.",
    goal: 7_0000_0000,
    startDate: "2025-09-15",
    endDate: "2025-12-31",
    status: "완료",
    completedAt: "2026-05-29",
    disclosureCycleDays: 14,
    lastDisclosedAt: "2026-06-12",
    plan: { received: 7_3500_0000, program: 0.9, admin: 0.055, fundraising: 0.045, donations: 720 },
  },
  {
    id: "goseong-schoolbus",
    categoryId: "hometown",
    title: "고성군 농촌 어린이 통학버스 지원",
    region: "강원 고성군",
    organizer: "고성군(고향사랑기부제 지정기부)",
    legalBasis: "고향사랑기부금법",
    registrationNo: "고향-2025-GS-03",
    purpose: "대중교통이 닿지 않는 마을 초등학생을 위한 통학버스 2대 구입과 1년 운행비를 지원했습니다.",
    goal: 1_8000_0000,
    startDate: "2025-03-01",
    endDate: "2025-12-31",
    status: "완료",
    completedAt: "2026-03-20",
    disclosureCycleDays: 14,
    lastDisclosedAt: "2026-03-31",
    plan: { received: 1_9200_0000, program: 0.92, admin: 0.05, fundraising: 0.03, donations: 340 },
  },
  {
    id: "child-lunchbox",
    categoryId: "welfare",
    title: "결식우려아동 여름방학 도시락",
    region: "서울·경기",
    organizer: "한끼나눔아동재단",
    legalBasis: "기부금품법",
    registrationNo: "서울-2025-0533",
    purpose: "여름방학 중 급식이 끊기는 아동 1,500명에게 40일간 영양 도시락을 배달했습니다.",
    goal: 2_5000_0000,
    startDate: "2025-06-01",
    endDate: "2025-08-31",
    status: "완료",
    completedAt: "2025-09-30",
    disclosureCycleDays: 14,
    lastDisclosedAt: "2025-10-14",
    // 운영비 8.6% — 한도(10%) 이내지만 주의 구간
    plan: { received: 2_4100_0000, program: 0.874, admin: 0.086, fundraising: 0.04, donations: 410 },
  },
  {
    id: "rural-english",
    categoryId: "education",
    title: "농어촌 학교 원어민 화상수업",
    region: "전북·전남 농어촌",
    organizer: "배움다리교육재단",
    legalBasis: "기부금품법",
    registrationNo: "서울-2025-0208",
    purpose: "원어민 교사가 없는 농어촌 초·중학교 30곳에 1년간 원어민 화상 영어수업을 제공했습니다.",
    goal: 9000_0000,
    startDate: "2025-02-10",
    endDate: "2025-07-31",
    status: "완료",
    completedAt: "2026-02-27",
    disclosureCycleDays: 14,
    lastDisclosedAt: "2026-03-10",
    plan: { received: 9350_0000, program: 0.91, admin: 0.06, fundraising: 0.03, donations: 230 },
  },
  {
    id: "jeju-forest",
    categoryId: "environment",
    title: "제주 곶자왈 숲 복원",
    region: "제주 서귀포시",
    organizer: "곶자왈생명숲네트워크",
    legalBasis: "기부금품법",
    registrationNo: "제주-2025-0411",
    purpose: "훼손된 곶자왈 12ha에 자생수종 묘목 3만 그루를 심고 2년간 생육을 관리하는 1단계 사업을 마쳤습니다.",
    goal: 1_5000_0000,
    startDate: "2025-04-01",
    endDate: "2025-10-31",
    status: "완료",
    completedAt: "2026-06-30",
    disclosureCycleDays: 14,
    lastDisclosedAt: "2026-07-14",
    plan: { received: 1_6280_0000, program: 0.895, admin: 0.065, fundraising: 0.04, donations: 380 },
  },

  // ---------- 진행 예정(모집 시작 전) 모집건 ----------
  // 모집등록만 마친 상태 — 입금·지출 0건. lastDisclosedAt은 모집계획 공고일.
  {
    id: "sumjin-otter",
    categoryId: "environment",
    title: "섬진강 수달 서식지 보전",
    region: "전남광주 구례·광양",
    organizer: "섬진강생태지킴이",
    legalBasis: "기부금품법",
    registrationNo: "전남광주-2026-1104",
    purpose: "섬진강 하류 수달 서식지 5km 구간에 생태 하천 정비와 무인 관찰 카메라를 설치합니다.",
    goal: 1_0000_0000,
    startDate: "2026-11-20",
    endDate: "2027-05-31",
    status: "예정",
    disclosureCycleDays: 14,
    lastDisclosedAt: "2026-11-02",
    plan: { received: 0, program: 0, admin: 0, fundraising: 0, donations: 0 },
  },
  {
    id: "careleaver-youth",
    categoryId: "welfare",
    title: "보육원 퇴소 청년 자립 지원",
    region: "전국",
    organizer: "홀로서기청년재단",
    legalBasis: "기부금품법",
    registrationNo: "서울-2026-0915",
    purpose: "보호 종료 청년 200명에게 주거 보증금과 1:1 자립 멘토링을 지원합니다.",
    goal: 3_5000_0000,
    startDate: "2026-12-01",
    endDate: "2027-06-30",
    status: "예정",
    disclosureCycleDays: 14,
    lastDisclosedAt: "2026-10-30",
    plan: { received: 0, program: 0, admin: 0, fundraising: 0, donations: 0 },
  },
  {
    id: "ulleung-heliport",
    categoryId: "hometown",
    title: "울릉군 응급 헬기 이착륙장 정비",
    region: "경북 울릉군",
    organizer: "울릉군(고향사랑기부제 지정기부)",
    legalBasis: "고향사랑기부금법",
    registrationNo: "고향-2026-UL-04",
    purpose: "기상 악화 시 응급환자 이송을 위해 야간 조명·제설 설비를 갖춘 헬기 이착륙장 2곳을 정비합니다.",
    goal: 2_4000_0000,
    startDate: "2027-01-02",
    endDate: "2027-12-31",
    status: "예정",
    disclosureCycleDays: 14,
    lastDisclosedAt: "2026-10-28",
    plan: { received: 0, program: 0, admin: 0, fundraising: 0, donations: 0 },
  },
];

// ---------- 과거 5개년(2022~2025) 완료 모집건 ----------
// 기존 모집건의 난수 순서를 바꾸지 않도록 별도 시드로 만들고 목록 끝에 붙입니다.
// 기관별 성향은 주관기관 감사 데이터(org-data.ts)와 맞춤: 푸른바다=모금비용 높음, 따뜻한이웃=운영비 높음.
const HISTORY_ORGS: Record<string, { name: string; admin: [number, number]; fundraising: [number, number] }[]> = {
  disaster: [
    { name: "강원재해복구나눔재단", admin: [0.05, 0.075], fundraising: [0.03, 0.05] },
    { name: "경북재난이웃돕기회", admin: [0.04, 0.06], fundraising: [0.03, 0.045] },
  ],
  welfare: [
    { name: "따뜻한이웃복지회", admin: [0.075, 0.115], fundraising: [0.04, 0.06] },
    { name: "한끼나눔아동재단", admin: [0.05, 0.08], fundraising: [0.03, 0.05] },
    { name: "어린이재활나눔재단", admin: [0.04, 0.06], fundraising: [0.03, 0.045] },
  ],
  education: [{ name: "배움다리교육재단", admin: [0.045, 0.065], fundraising: [0.025, 0.04] }],
  environment: [
    { name: "푸른바다시민연대", admin: [0.05, 0.07], fundraising: [0.11, 0.175] },
    { name: "곶자왈생명숲네트워크", admin: [0.05, 0.07], fundraising: [0.03, 0.045] },
  ],
};
const COUNTIES = [
  ["하동군", "경남 하동군", "HD"],
  ["영양군", "경북 영양군", "YY"],
  ["고성군", "강원 고성군", "GS"],
  ["울릉군", "경북 울릉군", "UL"],
  ["남해군", "경남 남해군", "NH"],
  ["단양군", "충북 단양군", "DY"],
  ["신안군", "전남 신안군", "SA"],
  ["봉화군", "경북 봉화군", "BH"],
] as const;
const HISTORY_TITLES: Record<string, { title: string; purpose: string }[]> = {
  disaster: [
    { title: "{r} 집중호우 피해 복구", purpose: "집중호우로 침수된 주택의 도배·장판과 생필품을 피해 가구에 지원했습니다." },
    { title: "{r} 태풍 피해 주택 보수", purpose: "태풍으로 파손된 지붕·창호 보수비를 피해 가구에 지원했습니다." },
    { title: "{r} 산불 이재민 생활 지원", purpose: "산불 이재민에게 임시 거처 임차료와 생활안정 자금을 지원했습니다." },
    { title: "{r} 폭설 피해 농가 지원", purpose: "폭설로 무너진 비닐하우스 철거·재설치 비용을 피해 농가에 지원했습니다." },
  ],
  hometown: [
    { title: "{c} 어르신 공공 목욕탕 운영", purpose: "목욕시설이 없는 마을 어르신을 위한 공공 목욕탕 1년 운영비를 지원했습니다." },
    { title: "{c} 작은도서관 조성", purpose: "면 소재지 빈 건물을 고쳐 아동·청소년 작은도서관을 만들었습니다." },
    { title: "{c} 농촌 왕진버스 운영", purpose: "병원이 먼 마을을 순회하는 의료 왕진버스를 1년간 운영했습니다." },
    { title: "{c} 마을 공동부엌 조성", purpose: "홀로 사는 어르신의 끼니를 위한 마을 공동부엌을 만들고 운영했습니다." },
  ],
  welfare: [
    { title: "독거어르신 여름나기 냉방 지원", purpose: "폭염 취약 독거어르신에게 선풍기·냉방비와 안부 확인 서비스를 제공했습니다." },
    { title: "결식우려아동 주말 도시락", purpose: "주말 급식이 끊기는 아동에게 1년간 주말 도시락을 배달했습니다." },
    { title: "장애아동 재활치료비 지원", purpose: "저소득 장애아동의 언어·물리 재활치료비를 1년간 지원했습니다." },
    { title: "한부모가정 생계비 지원", purpose: "위기 한부모가정에 6개월 생계비와 양육용품을 지원했습니다." },
  ],
  education: [
    { title: "농어촌 학생 코딩교실", purpose: "농어촌 초·중학생에게 방과후 코딩 수업과 교육용 노트북을 제공했습니다." },
    { title: "저소득 대학생 장학금", purpose: "기초·차상위 가정 대학생에게 1년 학업장려 장학금을 지급했습니다." },
    { title: "다문화가정 아동 한국어 교실", purpose: "다문화가정 아동의 학습을 돕는 한국어·기초학력 교실을 운영했습니다." },
    { title: "청소년 진로 멘토링", purpose: "지역 청소년과 현직자를 1:1로 연결하는 진로 멘토링을 운영했습니다." },
  ],
  environment: [
    { title: "{r} 연안 해양쓰레기 수거", purpose: "어촌계와 함께 연안 해양쓰레기를 수거하고 재활용 선별장을 운영했습니다." },
    { title: "{r} 하천 생태 복원", purpose: "훼손된 하천 구간에 수생식물을 심고 생태 모니터링을 했습니다." },
    { title: "{r} 도시숲 조성", purpose: "미세먼지 저감을 위한 도시숲에 나무를 심고 1년간 관리했습니다." },
    { title: "{r} 갯벌 보전 활동", purpose: "갯벌 쓰레기 수거와 철새 서식지 보호 활동을 했습니다." },
  ],
};
const REGIONS: Record<string, string[]> = {
  disaster: ["경북 포항", "충남 공주", "강원 삼척", "전남 순천", "경남 밀양", "충북 괴산"],
  welfare: ["전국", "서울·경기", "부산·경남", "대구·경북"],
  education: ["전국", "전북·전남", "강원 산간", "경북 북부"],
  environment: ["전남 여수", "경남 거제", "충남 태안", "인천 강화", "강원 춘천"],
};

function buildHistorySeeds(): CampaignSeed[] {
  const rng = mulberry32(20220101);
  const between = (a: number, b: number) => a + rng() * (b - a);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
  const out: CampaignSeed[] = [];
  // 2022~2024년은 항목마다 2건, 2025년은 1건 추가(기존 2025년 완료 5건과 합쳐 해마다 10건 안팎)
  const perYear: [number, number][] = [
    [2022, 2],
    [2023, 2],
    [2024, 2],
    [2025, 1],
  ];
  for (const [year, n] of perYear) {
    for (const cat of CATEGORIES) {
      for (let k = 0; k < n; k++) {
        const t = HISTORY_TITLES[cat.id][Math.floor(rng() * HISTORY_TITLES[cat.id].length)];
        const county = COUNTIES[Math.floor(rng() * COUNTIES.length)];
        const region = cat.id === "hometown" ? county[1] : pick(rng, REGIONS[cat.id]);
        const regionShort = region.replace(/^(경북|경남|충남|충북|전남|전북|강원|인천)\s/, "");
        const org = cat.id === "hometown" ? { name: `${county[0]}(고향사랑기부제 지정기부)`, admin: [0.04, 0.06] as [number, number], fundraising: [0.02, 0.035] as [number, number] } : pick(rng, HISTORY_ORGS[cat.id]);
        // 2025년분은 상반기에 끝나도록(REFERENCE_NOW 이전 완료)
        const start = new Date(Date.UTC(year, Math.floor(between(0, year === 2025 ? 3 : 9)), 1 + Math.floor(between(0, 25))));
        const end = addDays(start, Math.round(between(75, 210)));
        const completed = addDays(end, Math.round(between(30, 150)));
        // 공개: 대개 완료 후 5~16일, 10%는 늦게(22~40일 → 주의)
        const lag = rng() < 0.1 ? Math.round(between(22, 40)) : Math.round(between(5, 16));
        const received = Math.round(between(6000, 25000)) * 1_0000;
        const admin = between(org.admin[0], org.admin[1]);
        const fundraising = between(org.fundraising[0], org.fundraising[1]);
        const seq = out.length + 1;
        const goal = Math.round((received / between(0.9, 1.1)) / 1000_0000) * 1000_0000;
        out.push({
          id: `h${year}-${cat.id}-${k + 1}`,
          categoryId: cat.id,
          title: t.title.replace("{r}", regionShort).replace("{c}", county[0]),
          region,
          organizer: org.name,
          // 근거법: 고향사랑 → 고향사랑기부금법, 재난(재해구호기금·협회) → 재해구호법, 그 외 → 기부금품법
          legalBasis: cat.id === "hometown" ? "고향사랑기부금법" : cat.id === "disaster" ? "재해구호법" : "기부금품법",
          // 기부금품법 모집건의 접두어는 등록청(목표 10억 이하 시·도 — 주된 사무소 서울 가정, 10억 초과 행정안전부)
          registrationNo:
            cat.id === "hometown"
              ? `고향-${year}-${county[2]}-${String(seq).padStart(2, "0")}`
              : `${cat.id !== "disaster" && goal <= 10_0000_0000 ? "서울" : "행안"}-${year}-${String(100 + seq * 7).padStart(4, "0")}`,
          purpose: t.purpose,
          goal,
          startDate: iso(start),
          endDate: iso(end),
          status: "완료",
          completedAt: iso(completed),
          disclosureCycleDays: 14,
          lastDisclosedAt: iso(addDays(completed, lag)),
          plan: { received, program: 0, admin, fundraising, donations: Math.round(between(100, 260)) },
        });
      }
    }
  }
  return out;
}

CAMPAIGN_SEEDS.push(...buildHistorySeeds());

/** 이자수익 등 기타수입: 수입의 0.1%를 천원 단위로 */
export function interestIncomeFor(received: number) {
  return Math.round((received * 0.001) / 1000) * 1000;
}

// ---------- 이름 풀 ----------
const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"];
const GIVEN = ["지성", "서연", "민준", "하은", "도윤", "지우", "시우", "수아", "예준", "지민", "현우", "서준", "유진", "채원", "준서", "지호", "하린", "태양", "은우", "다은", "민서", "건우", "소율", "우진"];
const CORPS = ["㈜한빛전자", "㈜남해물산", "㈜푸른건설", "㈜다온푸드", "㈜세림정보", "(주)미래에너지", "㈜바른물류", "㈜해맑은제약", "(주)온누리유통", "㈜동백테크"];
const GROUPS = ["(사)거제시민연대", "서울시의사회 봉사단", "하동농협 임직원 일동", "부산교사모임", "청년창업가협회", "(사)나눔과미래", "○○교회 청년부", "강릉로타리클럽", "영양군 향우회", "통영어촌계 연합"];

const STAT: Record<ExpenseType, { code: string; name: string; vendors: string[]; desc: string[]; recipient?: boolean }[]> = {
  사업수행비용: [
    { code: "P-101", name: "분배비용-현금지원", vendors: ["직접 지급"], desc: ["주거복구비 지급", "생활안정자금 지급", "정착 장려금 지급", "임시주거비 지급"], recipient: true },
    { code: "P-102", name: "분배비용-물품지원", vendors: ["㈜한빛전자", "㈜다온푸드", "㈜해맑은제약", "농협하나로마트", "㈜동백테크"], desc: ["노트북 구매", "생필품 키트 구매", "난방유 공급", "방한용품 구매", "보조기기 구매", "김장김치 제작·배송"] },
    { code: "P-201", name: "사업인력비용", vendors: ["사업담당 인건비", "현장 코디네이터"], desc: ["현장 지원인력 인건비", "교육 강사료", "복구 작업반 수당"] },
    { code: "P-301", name: "사업시설·운반비", vendors: ["㈜바른물류", "통영화물", "강릉렌탈"], desc: ["구호물품 운송", "임시조립주택 설치", "수거 선박 임차"] },
    { code: "P-401", name: "기타사업비(교육·행사)", vendors: ["거제시청소년수련관", "하동문화원", "부산시민회관"], desc: ["교육장 대관", "안전점검 용역", "수혜자 설명회"] },
  ],
  일반관리비용: [
    { code: "A-101", name: "관리인력 인건비", vendors: ["관리직 급여"], desc: ["회계·행정 담당 급여", "사무국 인건비"] },
    { code: "A-201", name: "사무실 임차·관리", vendors: ["○○빌딩 관리사무소"], desc: ["사무실 임차료", "관리비·공과금"] },
    { code: "A-301", name: "회계감사·법무", vendors: ["외부 회계법인", "자문 법무법인"], desc: ["외부 회계감사 수수료", "자문 수수료"] },
    { code: "A-401", name: "통신·소모품", vendors: ["KT", "오피스디포"], desc: ["통신요금", "사무용품 구매"] },
  ],
  모금비용: [
    { code: "F-101", name: "홍보물 제작·광고", vendors: ["㈜세림정보", "한솔인쇄", "네이버 광고"], desc: ["모금 캠페인 배너 광고", "리플릿 인쇄", "SNS 홍보 영상 제작"] },
    { code: "F-201", name: "결제·플랫폼 수수료", vendors: ["토스페이먼츠", "KG이니시스", "네이버해피빈"], desc: ["카드 결제 수수료", "모금 플랫폼 수수료"] },
    { code: "F-301", name: "문자·우편 발송", vendors: ["NHN클라우드", "우체국"], desc: ["기부자 안내 문자 발송", "기부금영수증 우편 발송"] },
    { code: "F-401", name: "모금행사", vendors: ["부산벡스코", "거제문화예술회관"], desc: ["모금 음악회 대관", "거리 모금 부스 운영"] },
  ],
};

// ---------- 기부 메시지 ----------
const SHORT_MESSAGES = ["힘내세요!", "작지만 보탭니다.", "빠른 복구를 기원합니다.", "투명하게 써주세요.", "응원합니다."];

/** 개인 기부자가 남긴 긴 메시지 . 항목별로 모집 목적에 맞는 내용 */
const STORY_MESSAGES: Record<string, string[]> = {
  disaster: [
    "몇 해 전 저희 집도 큰 재난을 겪었습니다. 그때 낯선 분들이 건네준 따뜻한 밥 한 끼를 아직 잊지 못해서, 이제는 제가 갚을 차례라고 생각합니다.",
    "뉴스를 보다가 아이들과 함께 저금통을 열었습니다. 큰돈은 아니지만 하루라도 빨리 집으로 돌아가시는 데 보탬이 되면 좋겠습니다.",
    "하루아침에 모든 것을 잃으신 마음을 감히 헤아릴 수 없습니다. 혼자가 아니라는 것만은 꼭 전해지면 좋겠습니다.",
    "복구 현장에서 밤낮없이 애쓰시는 분들께도 감사드립니다. 제가 할 수 있는 건 이것뿐이라 죄송한 마음입니다.",
    "첫 월급의 일부를 보냅니다. 사회에 나와 처음으로 누군가에게 도움이 될 수 있어서 저도 기쁩니다.",
    "돌아가신 어머니가 늘 어려울 때일수록 나누라고 하셨습니다. 어머니 이름으로 대신 전합니다.",
    "쓰인 곳을 이렇게 하나하나 볼 수 있어서 믿고 보냅니다. 부디 필요한 분들께 빠짐없이 닿기를 바랍니다.",
    "저도 고향이 그 근처라 소식을 듣고 한참을 울었습니다. 다시 웃을 날이 꼭 올 거라고 믿습니다.",
  ],
  hometown: [
    "떠나온 지 삼십 년이 되었지만 눈을 감으면 아직도 고향 앞산이 보입니다. 어르신들 계신 마을이 오래오래 따뜻했으면 합니다.",
    "아버지가 나고 자라신 곳입니다. 지금은 안 계시지만 아버지 대신 고향에 작은 인사를 드립니다.",
    "어릴 때 방학마다 내려가던 할머니 댁 마을이 자꾸 비어 간다는 말에 마음이 아팠습니다. 조금이나마 힘이 되고 싶습니다.",
    "제 기부로 마을 어르신 한 분이라도 더 웃으실 수 있다면 그것으로 충분합니다.",
    "도시에서 일하느라 자주 찾아뵙지 못하는 죄송한 마음을 이렇게라도 전합니다. 고향이 늘 그 자리에 있어 주어 고맙습니다.",
    "여행 갔다가 만난 주민분들의 친절이 잊히지 않아 제2의 고향으로 삼았습니다. 매년 조금씩 함께하고 싶습니다.",
    "내 고향 아이들이 고향을 떠나지 않아도 되는 날이 오기를 바라며 보냅니다.",
    "돈이 어디에 쓰이는지 직접 확인할 수 있어서 처음으로 고향에 기부해 봅니다. 좋은 변화 기대하겠습니다.",
  ],
  welfare: [
    "홀로 계신 어머니를 생각하며 보냅니다. 어느 이웃도 힘든 시간을 혼자 견디지 않으셨으면 좋겠습니다.",
    "어릴 적 저도 지원을 받으며 자랐습니다. 그때 받은 도움을 이제 다른 이웃에게 돌려줄 수 있어서 감사합니다.",
    "아이 돌잔치 대신 그 비용의 일부를 나눕니다. 우리 아이가 나누며 사는 사람으로 자라길 바라는 마음입니다.",
    "매달 커피 몇 잔 값을 아껴 모았습니다. 작은 돈이지만 누군가의 하루에는 크게 쓰이길 바랍니다.",
    "퇴직하고 나니 더 늦기 전에 해야 할 일이 보였습니다. 오래 일할 수 있었던 건 모두 이웃 덕분이었습니다.",
    "힘든 시기를 지나고 계신 분들께 세상이 아직 따뜻하다는 걸 조금이나마 보여드리고 싶습니다.",
    "저희 가족도 힘든 시기에 이웃의 도움을 받았습니다. 그 어려움을 아는 만큼 진심으로 응원합니다.",
    "누구나 기본적인 걱정 없이 하루를 보낼 수 있으면 좋겠습니다. 가족을 생각하는 마음으로 보탭니다.",
  ],
  education: [
    "가정 형편으로 공부를 그만둘 뻔했을 때 이름 모를 분의 장학금이 저를 살렸습니다. 이제 제 차례입니다.",
    "선생님으로 일하며 재능 있는 아이들이 기회가 없어 멈추는 걸 많이 봤습니다. 한 명이라도 더 꿈을 이어 가길 바랍니다.",
    "시골 분교를 나와 지금의 제가 되었습니다. 어디서 태어나든 배울 기회는 같아야 한다고 믿습니다.",
    "우리 아이 졸업을 기념해 기부합니다. 다른 아이들도 같은 기쁨을 누렸으면 좋겠습니다.",
    "책 한 권이 인생을 바꿀 수 있다는 걸 압니다. 이 돈이 어떤 아이에게는 그 한 권이 되길 바랍니다.",
    "대학생이라 넉넉하진 않지만 아르바이트비를 조금 떼어 보냅니다. 후배들에게 언젠가 도움이 될 거라 믿어요.",
    "배움에는 때가 없다는 걸 늦게 공부하며 알았습니다. 배우고 싶은 모두를 응원합니다.",
    "오늘 저를 가르쳐 주신 은사님을 떠올리며 보냅니다. 받은 가르침을 이렇게라도 이어 가고 싶습니다.",
  ],
  environment: [
    "아이에게 제가 어릴 때 보던 맑은 자연을 그대로 보여 주고 싶습니다. 미안한 마음과 고마운 마음을 함께 보냅니다.",
    "주말마다 쓰레기를 주우러 다니다가 혼자로는 부족하다는 걸 느꼈습니다. 함께하는 분들이 계셔서 든든합니다.",
    "힘들 때마다 자연이 주는 위로를 받았습니다. 이제 제가 자연에 조금 돌려줄 때가 된 것 같습니다.",
    "손주가 태어난 해에 나무 한 그루 심는 마음으로 기부합니다. 손주가 살아갈 세상이 더 푸르기를 바랍니다.",
    "어릴 때 뛰놀던 풍경이 그립습니다. 그 풍경을 다음 세대도 볼 수 있으면 좋겠습니다.",
    "매일 쓰는 일회용품이 늘 마음에 걸렸습니다. 생활도 바꾸고 기부로도 힘을 보태겠습니다.",
    "활동 내역을 사진과 숫자로 확인할 수 있어서 좋습니다. 앞으로도 꾸준히 지켜보며 함께하겠습니다.",
    "자연은 말이 없어서 누군가 대신 지켜야 한다고 생각합니다. 그 일을 해 주시는 분들께 감사합니다.",
  ],
};

// ---------- 생성 ----------
function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randDate(rng: () => number, from: Date, to: Date): Date {
  const t = from.getTime() + rng() * Math.max(1, to.getTime() - from.getTime());
  const d = new Date(t);
  // 영업시간대로 치우치게
  d.setHours(8 + Math.floor(rng() * 13), Math.floor(rng() * 60), 0, 0);
  return d;
}

function roundTo(n: number, unit: number) {
  return Math.max(unit, Math.round(n / unit) * unit);
}

function generateDonations(c: CampaignSeed, rng: () => number): DonationRecord[] {
  if (c.plan.donations <= 0) return []; // 진행 예정 — 입금 없음
  const from = new Date(c.startDate);
  // 입금은 모집기간 안에서만 발생 (종료일 밤까지, 한국시간)
  const to = new Date(Math.min(REFERENCE_NOW.getTime(), new Date(`${c.endDate.slice(0, 10)}T23:59:59+09:00`).getTime()));
  const out: DonationRecord[] = [];
  // 유형 비율: 개인 90%, 기업 4%, 단체 6% (건수 기준) — 금액은 개인 ≈ 55%, 기업 ≈ 30%, 단체 ≈ 15% 수준이 되도록 설계
  const avgTarget = c.plan.received / c.plan.donations;
  for (let i = 0; i < c.plan.donations; i++) {
    const r = rng();
    const donorType: DonorType = r < 0.9 ? "개인" : r < 0.94 ? "기업" : "단체";
    let name = "";
    let amount = 0;
    if (donorType === "개인") {
      name = pick(rng, SURNAMES) + pick(rng, GIVEN);
      // 평균 기부액의 0.1~3배 범위에서 로그정규 분포 (1천원 단위)
      amount = roundTo(avgTarget * 0.6 * Math.exp((rng() - 0.5) * 2.4), 1000);
      if (rng() < 0.05) name = "익명";
    } else if (donorType === "기업") {
      name = pick(rng, CORPS);
      amount = roundTo(avgTarget * 7 * Math.exp((rng() - 0.5) * 1.6), 10_0000);
    } else {
      name = pick(rng, GROUPS);
      amount = roundTo(avgTarget * 2.5 * Math.exp((rng() - 0.5) * 1.6), 1_0000);
    }
    out.push({
      id: `${c.id}-d${String(i + 1).padStart(4, "0")}`,
      campaignId: c.id,
      donorName: name,
      donorType,
      donorPhoneLast4: donorType === "개인" ? String(1000 + Math.floor(rng() * 9000)) : undefined,
      amount,
      donatedAt: randDate(rng, from, to).toISOString(),
      method: pick(rng, ["계좌이체", "카드", "간편결제", "간편결제", "현장모금"]),
      message: rng() < 0.25 ? pick(rng, donorType === "개인" ? [...SHORT_MESSAGES, ...STORY_MESSAGES[c.categoryId]] : SHORT_MESSAGES) : undefined,
    });
  }
  out.sort((a, b) => a.donatedAt.localeCompare(b.donatedAt));
  // 합계를 계획 수입에 맞추기 위해 마지막 기업기부 1건으로 보정
  const sum = out.reduce((s, d) => s + d.amount, 0);
  const diff = c.plan.received - sum;
  if (diff > 0) {
    out.push({
      id: `${c.id}-d${String(out.length + 1).padStart(4, "0")}`,
      campaignId: c.id,
      donorName: pick(rng, CORPS),
      donorType: "기업",
      amount: diff,
      donatedAt: randDate(rng, from, to).toISOString(),
      method: "계좌이체",
      message: "지정기부",
    });
  } else if (diff < 0) {
    // 초과분은 큰 건부터 깎음
    let remain = -diff;
    for (const d of out.sort((a, b) => b.amount - a.amount)) {
      if (remain <= 0) break;
      const cut = Math.min(remain, Math.max(0, d.amount - 1000));
      d.amount -= cut;
      remain -= cut;
    }
  }
  out.sort((a, b) => a.donatedAt.localeCompare(b.donatedAt));
  return out;
}

function generateExpenses(c: CampaignSeed, rng: () => number): ExpenseRecord[] {
  const from = new Date(new Date(c.startDate).getTime() + 86400000 * 7);
  const completed = c.status === "완료" && c.completedAt;
  const to = completed ? new Date(`${c.completedAt}T18:00:00+09:00`) : REFERENCE_NOW;
  const out: ExpenseRecord[] = [];
  const admin = Math.round(c.plan.received * c.plan.admin);
  const fundraising = Math.round(c.plan.received * c.plan.fundraising);
  // 완료건은 수입(기부금 + 이자수익) 전액을 집행해 잔액 0원이 되도록 사업수행비용을 맞춤
  const program = completed ? c.plan.received + interestIncomeFor(c.plan.received) - admin - fundraising : Math.round(c.plan.received * c.plan.program);
  const types: { type: ExpenseType; total: number; count: number }[] = [
    { type: "사업수행비용", total: program, count: completed ? 30 : 22 },
    { type: "일반관리비용", total: admin, count: 9 },
    { type: "모금비용", total: fundraising, count: 7 },
  ];
  let seq = 1;
  for (const t of types) {
    if (t.total <= 0) continue;
    // 무작위 가중치로 total 분배
    const weights = Array.from({ length: t.count }, () => 0.3 + rng());
    const wsum = weights.reduce((a, b) => a + b, 0);
    let acc = 0;
    weights.forEach((w, i) => {
      const isLast = i === weights.length - 1;
      const amount = isLast ? t.total - acc : roundTo((t.total * w) / wsum, 1000);
      acc += amount;
      const stat = pick(rng, STAT[t.type]);
      out.push({
        id: `${c.id}-e${String(seq).padStart(3, "0")}`,
        campaignId: c.id,
        type: t.type,
        statCode: stat.code,
        statName: stat.name,
        vendor: pick(rng, stat.vendors),
        recipient: stat.recipient ? pick(rng, SURNAMES) + pick(rng, GIVEN) : undefined,
        description: pick(rng, stat.desc),
        amount,
        spentAt: randDate(rng, from, to).toISOString(),
        receiptId: `R-${c.id.slice(0, 2).toUpperCase()}${String(seq).padStart(4, "0")}`,
      });
      seq++;
    });
  }
  out.sort((a, b) => a.spentAt.localeCompare(b.spentAt));
  return out;
}

export interface Dataset {
  categories: Category[];
  campaigns: Campaign[];
  donations: DonationRecord[];
  expenses: ExpenseRecord[];
}

let cached: Dataset | null = null;

export function getDataset(): Dataset {
  if (cached) return cached;
  const rng = mulberry32(20261103);
  const donations: DonationRecord[] = [];
  const expenses: ExpenseRecord[] = [];
  const campaigns: Campaign[] = [];
  for (const seed of CAMPAIGN_SEEDS) {
    const { plan, ...campaign } = seed;
    void plan;
    campaigns.push(campaign);
    donations.push(...generateDonations(seed, rng));
    expenses.push(...generateExpenses(seed, rng));
  }
  // 적요를 항목에 맞추고 AI 지출 점검 시연 사례를 심음(난수 미사용, 유형별 합계 불변)
  const refined = refineExpenses(campaigns, expenses);
  auditTruth = refined.truth;
  cached = { categories: CATEGORIES, campaigns, donations, expenses: refined.expenses };
  return cached;
}

let auditTruth: AuditTruth | null = null;

/** AI 지출 점검 시연용 정답 데이터(심어 둔 사례) — 탐지율·오탐 측정에 사용 */
export function getAuditTruth(): AuditTruth {
  if (!auditTruth) getDataset();
  return auditTruth!;
}

/**
 * 실시간 티커용 합성 기부 — 7초마다 1건씩 "도착"하는 것처럼 시간 슬롯에서 결정적으로 생성.
 * DB 연결 후에는 최근 N건을 createdAt DESC로 조회하는 쿼리로 대체합니다.
 */
export function syntheticLiveDonations(now: number, count = 12): DonationRecord[] {
  const slot = Math.floor(now / 7000);
  const list: DonationRecord[] = [];
  const liveCampaigns = CAMPAIGN_SEEDS.filter((c) => c.status !== "종료" && c.status !== "완료" && c.status !== "예정");
  for (let i = 0; i < count; i++) {
    const s = slot - i;
    const rng = mulberry32(s);
    const c = pick(rng, liveCampaigns);
    const r = rng();
    const donorType: DonorType = r < 0.85 ? "개인" : r < 0.92 ? "기업" : "단체";
    const name = donorType === "개인" ? pick(rng, SURNAMES) + pick(rng, GIVEN) : donorType === "기업" ? pick(rng, CORPS) : pick(rng, GROUPS);
    const amount =
      donorType === "개인" ? roundTo(Math.exp(Math.log(5000) + rng() * Math.log(60)), 1000) : donorType === "기업" ? roundTo(Math.exp(Math.log(50_0000) + rng() * Math.log(20)), 10_0000) : roundTo(Math.exp(Math.log(10_0000) + rng() * Math.log(20)), 1_0000);
    list.push({
      id: `live-${s}`,
      campaignId: c.id,
      donorName: name,
      donorType,
      donorPhoneLast4: donorType === "개인" ? String(1000 + Math.floor(rng() * 9000)) : undefined,
      amount,
      donatedAt: new Date(s * 7000 + Math.floor(rng() * 6000)).toISOString(),
      method: pick(rng, ["계좌이체", "카드", "간편결제", "간편결제"]),
      message: rng() < 0.3 ? pick(rng, ["힘내세요!", "작지만 보탭니다.", "응원합니다.", "투명하게 써주세요."]) : undefined,
    });
  }
  return list;
}
