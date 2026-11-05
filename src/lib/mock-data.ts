/**
 * 가상 데이터 생성기 (결정적 — 같은 시드면 항상 같은 데이터)
 * DB 연결 후에는 이 파일 대신 repository.ts의 DbRepository가 실데이터를 읽습니다.
 */

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
    organizer: "거제시 재난구호협의회",
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
    organizer: "부산사회복지공동모금회(가상)",
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
    organizer: "강원도 재해구호기금(가상)",
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
    organizer: "따뜻한이웃복지회(가상)",
    registrationNo: "행안-2026-0611",
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
    organizer: "어린이재활나눔재단(가상)",
    registrationNo: "행안-2026-0702",
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
    region: "전남·경남 도서지역",
    organizer: "한국방송통신전파진흥원 사회공헌기금",
    registrationNo: "행안-2026-0417",
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
    organizer: "푸른바다시민연대(가상)",
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
    organizer: "경북재해구호협회(가상)",
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
    organizer: "한끼나눔아동재단(가상)",
    registrationNo: "행안-2025-0533",
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
    organizer: "배움다리교육재단(가상)",
    registrationNo: "행안-2025-0208",
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
    organizer: "곶자왈생명숲네트워크(가상)",
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
    region: "전남 구례·광양",
    organizer: "섬진강생태지킴이(가상)",
    registrationNo: "전남-2026-1104",
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
    organizer: "홀로서기청년재단(가상)",
    registrationNo: "행안-2026-0915",
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
    { name: "강원도 재해구호기금(가상)", admin: [0.05, 0.075], fundraising: [0.03, 0.05] },
    { name: "경북재해구호협회(가상)", admin: [0.04, 0.06], fundraising: [0.03, 0.045] },
  ],
  welfare: [
    { name: "따뜻한이웃복지회(가상)", admin: [0.075, 0.115], fundraising: [0.04, 0.06] },
    { name: "한끼나눔아동재단(가상)", admin: [0.05, 0.08], fundraising: [0.03, 0.05] },
    { name: "어린이재활나눔재단(가상)", admin: [0.04, 0.06], fundraising: [0.03, 0.045] },
  ],
  education: [{ name: "배움다리교육재단(가상)", admin: [0.045, 0.065], fundraising: [0.025, 0.04] }],
  environment: [
    { name: "푸른바다시민연대(가상)", admin: [0.05, 0.07], fundraising: [0.11, 0.175] },
    { name: "곶자왈생명숲네트워크(가상)", admin: [0.05, 0.07], fundraising: [0.03, 0.045] },
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
        out.push({
          id: `h${year}-${cat.id}-${k + 1}`,
          categoryId: cat.id,
          title: t.title.replace("{r}", regionShort).replace("{c}", county[0]),
          region,
          organizer: org.name,
          registrationNo: cat.id === "hometown" ? `고향-${year}-${county[2]}-${String(seq).padStart(2, "0")}` : `행안-${year}-${String(100 + seq * 7).padStart(4, "0")}`,
          purpose: t.purpose,
          goal: Math.round((received / between(0.9, 1.1)) / 1000_0000) * 1000_0000,
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

/** 이자수익 등 기타수입(가상): 수입의 0.1%를 천원 단위로 */
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
    { code: "A-301", name: "회계감사·법무", vendors: ["한결회계법인", "법무법인 바른길"], desc: ["외부 회계감사 수수료", "자문 수수료"] },
    { code: "A-401", name: "통신·소모품", vendors: ["KT", "오피스디포"], desc: ["통신요금", "사무용품 구매"] },
  ],
  모금비용: [
    { code: "F-101", name: "홍보물 제작·광고", vendors: ["㈜세림정보", "한솔인쇄", "네이버 광고"], desc: ["모금 캠페인 배너 광고", "리플릿 인쇄", "SNS 홍보 영상 제작"] },
    { code: "F-201", name: "결제·플랫폼 수수료", vendors: ["토스페이먼츠", "KG이니시스", "네이버해피빈"], desc: ["카드 결제 수수료", "모금 플랫폼 수수료"] },
    { code: "F-301", name: "문자·우편 발송", vendors: ["NHN클라우드", "우체국"], desc: ["기부자 안내 문자 발송", "기부금영수증 우편 발송"] },
    { code: "F-401", name: "모금행사", vendors: ["부산벡스코", "거제문화예술회관"], desc: ["모금 음악회 대관", "거리 모금 부스 운영"] },
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
  const to = new Date(Math.min(REFERENCE_NOW.getTime(), new Date(c.endDate).getTime() + 86400000 * 3));
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
      message: rng() < 0.25 ? pick(rng, ["힘내세요!", "작지만 보탭니다.", "빠른 복구를 기원합니다.", "투명하게 써주세요.", "응원합니다."]) : undefined,
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
  cached = { categories: CATEGORIES, campaigns, donations, expenses };
  return cached;
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
