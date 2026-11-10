/**
 * 가상 지출 데이터 후처리 — AI 지출 점검(목적 부합 확인 필요·이상 거래) 시연용
 *
 * 1) 적요·거래처를 모집건 항목(재난·고향사랑·복지·교육·환경)에 맞게 다시 고름
 *    생성기는 통계목별 공통 문구에서 무작위로 골라, 해양쓰레기 모집건에 '노트북 구매'가 나오는 식이었음.
 * 2) 탐지 시연용 사례를 심음(정답 데이터 AUDIT_TRUTH)
 *    - 목적 외 사용·비용 분류 확인 필요 10건(그중 2건은 점검 키워드가 없어 AI만 찾을 수 있음) + 헷갈리지만 정상인 대조군 4건(오탐 측정용)
 *    - 이상 거래 5유형: 분할 결제, 증빙번호 중복, 동일 금액 반복 지급, 정액 반복, 심야 지출
 *
 * 원칙
 * - 난수(rng)를 쓰지 않음 → 기존 생성 순서·기부 데이터가 바뀌지 않음(해시로 결정)
 * - 모집건별 비용 유형 합계(사업수행·일반관리·모금)를 바꾸지 않음 → 대차대조표·판정·지수가 그대로
 * - 날짜는 같은 날 안에서만 옮김 → 시점별 집계가 그대로
 */
import type { Campaign, ExpenseRecord } from "./types";

// ---------- 정답 데이터 ----------
export type PurposeTruth = "목적 외 사용" | "비용 분류 오류" | "정상(대조군)";
export type AnomalyKind = "split" | "dupReceipt" | "dupPayment" | "roundRepeat" | "offHours" | "outOfPeriod" | "vendorConcentration" | "amountOutlier";

export interface AuditTruth {
  /** aiOnly: 점검 키워드가 없어 규칙으로는 못 잡고, 모집 목적과의 의미 대조(AI)로만 찾을 수 있는 사례 */
  purpose: { campaignId: string; expenseId: string; truth: PurposeTruth; note: string; aiOnly?: boolean }[];
  anomaly: { campaignId: string; kind: AnomalyKind; expenseIds: string[]; note: string }[];
}

// ---------- 결정적 해시 ----------
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
const choose = <T,>(key: string, arr: T[]) => arr[hash(key) % arr.length];

// ---------- 1) 항목별 적요·거래처 ----------
type Pool = { desc: string[]; vendors?: string[] };
const PROGRAM_TEXT: Record<string, Record<string, Pool>> = {
  disaster: {
    "P-101": { desc: ["주거복구비 지급", "생활안정자금 지급", "임시주거비 지급"] },
    "P-102": { desc: ["생필품 키트 구매", "구호물품(담요·식료품) 구매", "방역·청소용품 구매"], vendors: ["농협하나로마트", "㈜다온푸드", "㈜해맑은제약"] },
    "P-201": { desc: ["복구 작업반 수당", "현장 지원인력 인건비"] },
    "P-301": { desc: ["구호물품 운송", "임시조립주택 설치", "복구 장비 임차"], vendors: ["㈜바른물류", "강릉렌탈", "통영화물"] },
    "P-401": { desc: ["피해 주택 안전점검 용역", "이재민 설명회", "이재민 심리상담 프로그램"], vendors: ["한국재난안전기술원", "마음돌봄상담소", "지역 주민센터"] },
  },
  hometown: {
    "P-101": { desc: ["정착 장려금 지급", "생활지원금 지급"] },
    "P-102": { desc: ["난방유 공급", "방한용품 구매", "생활용품 구매"], vendors: ["농협하나로마트", "지역 주유소", "㈜다온푸드"] },
    "P-201": { desc: ["사업 코디네이터 인건비", "방문 돌봄 인력 수당"] },
    "P-301": { desc: ["시설 개보수 공사", "순회 차량 운행비", "지원 물품 배송"], vendors: ["군내 시공업체", "㈜바른물류", "지역 운수회사"] },
    "P-401": { desc: ["주민 설명회", "마을 프로그램 운영", "교육장 대관"], vendors: ["군민회관", "읍면 복지회관", "지역 문화원"] },
  },
  welfare: {
    "P-101": { desc: ["생계비 지급", "긴급 생활비 지급"] },
    "P-102": { desc: ["김장김치 제작·배송", "방한용품 구매", "보조기기 구매", "영양 도시락 제작"], vendors: ["㈜다온푸드", "농협하나로마트", "㈜해맑은제약", "㈜동백테크"] },
    "P-201": { desc: ["돌봄 인력 인건비", "안부전화 상담원 수당"] },
    "P-301": { desc: ["지원 물품 배송", "보조기기 맞춤 제작·설치"], vendors: ["㈜바른물류", "재활보조기기센터"] },
    "P-401": { desc: ["수혜자 설명회", "어르신 건강 교실", "자립 멘토링 모임"], vendors: ["구립 복지관", "주민센터 강당", "청년 공유공간"] },
  },
  education: {
    "P-101": { desc: ["장학금 지급", "학업장려금 지급"] },
    "P-102": { desc: ["노트북 구매", "교재·교구 구매", "학습용 태블릿 구매"], vendors: ["㈜한빛전자", "㈜동백테크", "교육서적 총판"] },
    "P-201": { desc: ["교육 강사료", "멘토 활동비"] },
    "P-301": { desc: ["교육 기자재 운송", "화상수업 장비 설치"], vendors: ["㈜바른물류", "㈜세림정보"] },
    "P-401": { desc: ["교육장 대관", "진로 캠프 운영"], vendors: ["청소년수련관", "지역 교육지원청 강당"] },
  },
  environment: {
    "P-101": { desc: ["수거 참여 어업인 활동비 지급", "참여 주민 활동비 지급"] },
    "P-102": { desc: ["수거 장비·마대 구매", "자생수종 묘목 구매", "재활용 선별 장비 구매"], vendors: ["㈜푸른환경산업", "산림조합 양묘장", "㈜동백테크"] },
    "P-201": { desc: ["현장 활동가 인건비", "생태 모니터링 조사원 수당"] },
    "P-301": { desc: ["수거 선박 임차", "수거 폐기물 운반·처리", "묘목 운송"], vendors: ["통영화물", "지역 어촌계 선단", "㈜바른물류"] },
    "P-401": { desc: ["시민 정화활동 행사", "생태 교육 프로그램", "교육장 대관"], vendors: ["지역 문화원", "생태교육센터", "청소년수련관"] },
  },
};

function realignText(e: ExpenseRecord, categoryId: string): ExpenseRecord {
  const pool = PROGRAM_TEXT[categoryId]?.[e.statCode];
  if (!pool || e.type !== "사업수행비용") return e;
  return {
    ...e,
    description: choose(`${e.id}:d`, pool.desc),
    vendor: pool.vendors ? choose(`${e.id}:v`, pool.vendors) : e.vendor,
  };
}

// ---------- 2) 심을 사례 ----------
interface TextPlant {
  campaignId: string;
  stats: string[]; // 이 통계목 중에서 고름(현금지원 P-101은 수혜자가 있어 제외)
  description: string;
  vendor: string;
  truth: PurposeTruth;
  note: string;
  aiOnly?: boolean;
}

const PURPOSE_PLANTS: TextPlant[] = [
  { campaignId: "marine-trash", stats: ["P-401", "P-301"], description: "임원진 제주 워크숍 숙박비", vendor: "바다뷰리조트", truth: "목적 외 사용", note: "해양쓰레기 수거와 무관한 임원 워크숍" },
  { campaignId: "senior-winter", stats: ["P-301", "P-401"], description: "사무국 업무용 차량 리스료", vendor: "한빛캐피탈", truth: "비용 분류 오류", note: "일반관리비용을 사업수행비용으로 계상" },
  { campaignId: "senior-winter", stats: ["P-401", "P-102"], description: "이사회 송년 만찬", vendor: "한정식 다온", truth: "목적 외 사용", note: "임원 행사비를 사업비로 집행" },
  { campaignId: "gangwon-fire", stats: ["P-401", "P-201"], description: "기관장 업무추진비(간담회 식대)", vendor: "경포 횟집", truth: "목적 외 사용", note: "이재민 지원과 무관한 업무추진비" },
  { campaignId: "busan-quake", stats: ["P-102", "P-401"], description: "직원 체육대회 기념품 구매", vendor: "㈜굿즈팩토리", truth: "목적 외 사용", note: "직원 복리후생비를 사업비로 집행" },
  { campaignId: "hadong-heating", stats: ["P-301", "P-401"], description: "군청 본관 외벽 도색 공사", vendor: "하동종합건설", truth: "목적 외 사용", note: "지정기부 사업이 아닌 청사 관리비" },
  { campaignId: "child-device", stats: ["P-401", "P-201"], description: "후원의 밤 행사 가수 출연료", vendor: "스타라인엔터테인먼트", truth: "비용 분류 오류", note: "모금비용을 사업수행비용으로 계상" },
  { campaignId: "h2024-welfare-2", stats: ["P-401", "P-102"], description: "협력기관 골프 모임 이용료", vendor: "푸른언덕CC", truth: "목적 외 사용", note: "접대성 지출" },
  // 점검 키워드가 없어 규칙으로는 못 잡는 사례 — 모집 목적과의 '의미' 대조가 필요(AI 전용)
  { campaignId: "jeju-forest", stats: ["P-401", "P-102"], description: "어린이 영어캠프 교재 구매", vendor: "교육서적 총판", truth: "목적 외 사용", note: "숲 복원 사업과 무관한 교육 물품", aiOnly: true },
  { campaignId: "child-device", stats: ["P-401", "P-301"], description: "지역 축제 불꽃놀이 연출", vendor: "한빛이벤트", truth: "목적 외 사용", note: "장애아동 보조기기 지원과 무관한 행사비", aiOnly: true },
];

/** 대조군 — 단어만 보면 확인이 필요해 보이지만 모집 목적에 맞는 지출(오탐 측정용) */
const PURPOSE_CONTROLS: TextPlant[] = [
  { campaignId: "geoje-flood", stats: ["P-201", "P-401"], description: "복구 자원봉사자 식비·간식", vendor: "거제 한마음식당", truth: "정상(대조군)", note: "복구 현장 자원봉사자 지원 — 사업 관련" },
  { campaignId: "marine-trash", stats: ["P-401", "P-201"], description: "수거 참여 어업인 안전교육 강사료", vendor: "해양안전교육원", truth: "정상(대조군)", note: "사업 수행을 위한 안전교육" },
  { campaignId: "senior-winter", stats: ["P-102"], description: "어르신 방한 내복 대량 구매", vendor: "따뜻한의류", truth: "정상(대조군)", note: "대량 구매지만 목적에 맞음" },
  { campaignId: "hadong-heating", stats: ["P-301", "P-102"], description: "취약가구 창호 단열 공사", vendor: "하동단열시공", truth: "정상(대조군)", note: "공사지만 난방 지원 목적에 맞음" },
];

const KST = 9 * 3600000;
const kstDate = (iso: string) => new Date(new Date(iso).getTime() + KST).toISOString().slice(0, 10);
const atKst = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+09:00`).toISOString();
const addDays = (date: string, n: number) => new Date(new Date(`${date}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

/** 분할 결제 확인 기준(내부통제 가정): 건당 500만원 이상은 2인 결재 */
export const SPLIT_THRESHOLD = 500_0000;

export function refineExpenses(campaigns: Campaign[], expenses: ExpenseRecord[]): { expenses: ExpenseRecord[]; truth: AuditTruth } {
  const catOf = new Map(campaigns.map((c) => [c.id, c.categoryId]));
  const byCampaign = new Map<string, ExpenseRecord[]>();
  for (const e of expenses) {
    const list = byCampaign.get(e.campaignId) ?? [];
    list.push(realignText(e, catOf.get(e.campaignId) ?? ""));
    byCampaign.set(e.campaignId, list);
  }
  const truth: AuditTruth = { purpose: [], anomaly: [] };
  const used = new Set<string>();
  const byId = (list: ExpenseRecord[]) => [...list].sort((a, b) => a.id.localeCompare(b.id));
  const program = (cid: string, stats?: string[]) =>
    byId(byCampaign.get(cid) ?? []).filter((e) => e.type === "사업수행비용" && e.statCode !== "P-101" && !used.has(e.id) && (!stats || stats.includes(e.statCode)));

  // 목적 외 사용·대조군: 적요·거래처만 바꿈(금액·유형 그대로)
  for (const p of [...PURPOSE_PLANTS, ...PURPOSE_CONTROLS]) {
    const cands = program(p.campaignId, p.stats).length ? program(p.campaignId, p.stats) : program(p.campaignId);
    const target = cands[hash(p.description) % Math.max(1, cands.length)];
    if (!target) continue;
    used.add(target.id);
    replace(byCampaign, { ...target, description: p.description, vendor: p.vendor });
    truth.purpose.push({ campaignId: p.campaignId, expenseId: target.id, truth: p.truth, note: p.note, ...(p.aiOnly ? { aiOnly: true } : {}) });
  }

  // 분할 결제: 같은 날 같은 거래처에 기준 바로 아래 금액으로 쪼갬(합계 동일)
  {
    const cid = "senior-winter";
    const cands = program(cid, ["P-102"]).sort((a, b) => b.amount - a.amount);
    const pickN = cands[0] && cands[0].amount + (cands[1]?.amount ?? 0) >= SPLIT_THRESHOLD * 1.2 ? 2 : 3;
    const src = cands.slice(0, pickN);
    const total = src.reduce((s, e) => s + e.amount, 0);
    if (src.length >= 2 && total > SPLIT_THRESHOLD) {
      const piece = SPLIT_THRESHOLD - 5_0000; // 495만원
      const n = Math.ceil(total / piece);
      const base = src[0];
      const date = kstDate(base.spentAt);
      const parts: ExpenseRecord[] = Array.from({ length: n }, (_, i) => ({
        ...base,
        id: `${base.id}-${i + 1}`,
        description: `${base.description} (${i + 1}/${n}차)`,
        amount: i < n - 1 ? piece : total - piece * (n - 1),
        spentAt: atKst(date, `${String(10 + Math.floor(i / 4)).padStart(2, "0")}:${String(5 + (i % 4) * 13).padStart(2, "0")}`),
        receiptId: `${base.receiptId}-${i + 1}`,
      }));
      const list = (byCampaign.get(cid) ?? []).filter((e) => !src.some((s) => s.id === e.id));
      byCampaign.set(cid, [...list, ...parts]);
      src.forEach((e) => used.add(e.id));
      truth.anomaly.push({ campaignId: cid, kind: "split", expenseIds: parts.map((p) => p.id), note: `${base.vendor}에 같은 날 ${n}건으로 나눠 결제(건당 495만원 이하, 합계 ${total.toLocaleString("ko-KR")}원)` });
    }
  }

  // 증빙번호 중복: 서로 다른 지출이 같은 증빙번호를 씀
  {
    const cid = "busan-quake";
    const [a, b] = program(cid);
    if (a && b) {
      used.add(a.id);
      used.add(b.id);
      replace(byCampaign, { ...b, receiptId: a.receiptId });
      truth.anomaly.push({ campaignId: cid, kind: "dupReceipt", expenseIds: [a.id, b.id], note: `증빙번호 ${a.receiptId}를 두 지출이 함께 사용` });
    }
  }

  // 동일 금액 반복 지급(중복 지급 여부 확인): 같은 거래처·같은 금액 2건을 하루 간격으로(합계는 제3의 지출로 보정)
  {
    const cid = "child-lunchbox";
    // 두 번째 지급(하루 뒤)이 집행 완료일을 넘지 않도록 앞선 지출을 기준으로 삼음
    const last = campaigns.find((x) => x.id === cid)?.completedAt ?? "9999-12-31";
    const cands = program(cid, ["P-102", "P-301"]);
    const a = cands.find((e) => kstDate(e.spentAt) < addDays(last, -1));
    const [b, c] = cands.filter((e) => e !== a);
    if (a && b && c) {
      const same = Math.round((a.amount + b.amount) / 2 / 1000) * 1000;
      const diff = a.amount + b.amount - same * 2;
      const date = addDays(kstDate(a.spentAt), 1);
      [a, b, c].forEach((e) => used.add(e.id));
      replace(byCampaign, { ...a, amount: same });
      replace(byCampaign, { ...b, vendor: a.vendor, description: a.description, statCode: a.statCode, statName: a.statName, amount: same, spentAt: atKst(date, "14:20") });
      replace(byCampaign, { ...c, amount: c.amount + diff });
      truth.anomaly.push({ campaignId: cid, kind: "dupPayment", expenseIds: [a.id, b.id], note: `${a.vendor}에 같은 금액 ${same.toLocaleString("ko-KR")}원을 하루 간격으로 두 번 지급` });
    }
  }

  // 정액 반복: 같은 거래처에 백만원 단위 정액을 3번(합계는 같은 유형 다른 지출로 보정)
  {
    const cid = "h2024-environment-2";
    const fr = byId(byCampaign.get(cid) ?? []).filter((e) => e.type === "모금비용" && !used.has(e.id));
    const three = fr.slice(0, 3);
    const rest = fr[3];
    if (three.length === 3 && rest) {
      const sum = three.reduce((s, e) => s + e.amount, 0);
      const R = Math.max(100_0000, Math.round(sum / 3 / 100_0000) * 100_0000);
      const diff = sum - R * 3;
      if (rest.amount + diff > 0) {
        [...three, rest].forEach((e) => used.add(e.id));
        // 실존 기관(우체국 등)이 의심 거래에 걸리지 않도록 가상의 홍보대행사로 고정
        three.forEach((e) => replace(byCampaign, { ...e, amount: R, vendor: "새빛광고기획", statCode: "F-101", statName: "홍보물 제작·광고", description: "모금 캠페인 홍보 대행료" }));
        replace(byCampaign, { ...rest, amount: rest.amount + diff });
        truth.anomaly.push({ campaignId: cid, kind: "roundRepeat", expenseIds: three.map((e) => e.id), note: `새빛광고기획에 정확히 ${R.toLocaleString("ko-KR")}원씩 3번 지급` });
      }
    }
  }

  // 심야 지출: 같은 날 안에서 시각만 옮김
  for (const [cid, hhmm] of [
    ["rural-english", "23:47"],
    ["gangwon-fire", "02:13"],
  ] as const) {
    const t = byId(byCampaign.get(cid) ?? []).filter((e) => !used.has(e.id) && e.type !== "사업수행비용")[1];
    if (!t) continue;
    used.add(t.id);
    replace(byCampaign, { ...t, spentAt: atKst(kstDate(t.spentAt), hhmm) });
    truth.anomaly.push({ campaignId: cid, kind: "offHours", expenseIds: [t.id], note: `${hhmm}(한국시간)에 처리된 ${t.type} 지출` });
  }

  const out: ExpenseRecord[] = [];
  for (const c of campaigns) {
    const list = byCampaign.get(c.id) ?? [];
    out.push(...list.sort((a, b) => a.spentAt.localeCompare(b.spentAt)));
  }
  return { expenses: out, truth };
}

function replace(map: Map<string, ExpenseRecord[]>, next: ExpenseRecord) {
  const list = map.get(next.campaignId) ?? [];
  map.set(
    next.campaignId,
    list.map((e) => (e.id === next.id ? next : e)),
  );
}
