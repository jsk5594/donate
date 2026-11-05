/**
 * 기부내역 페이지 집계 — 우수기부자·나눔 단계·내 순위
 * - 같은 기부자는 원본 키(이름+연락처 뒤 4자리)로 묶되, 밖으로는 가명만 내보냅니다.
 * - 기부코드는 본인 조회 열쇠이므로 순위에 넣지 않습니다.
 * - 익명 기부는 합계에는 포함하고 순위에서는 제외합니다(세칙 제32·33조).
 */

import type { Dataset } from "./mock-data";
import { maskName } from "./pseudonymize";
import type { DonationRecord, DonorType } from "./types";

export const DONOR_TYPES: DonorType[] = ["개인", "기업", "단체"];

/** 기간: 전체 / 최근 12개월 / 특정 연도 */
export type BoardPeriod = "all" | "12m" | number;

export interface BoardFilter {
  type: DonorType;
  categoryId: string | null;
  period: BoardPeriod;
}

export interface HonorRow {
  rank: number;
  alias: string;
  type: DonorType;
  amount: number;
  count: number;
  campaigns: number;
  mainCategory: string;
}

export interface DonorBoard {
  scope: { total: number; count: number; donors: number; anonymousCount: number };
  top: HonorRow[];
  byCategory: { id: string; name: string; top: HonorRow | null }[];
  byYear: { year: number; top: HonorRow | null }[];
}

export interface LoyalDonor {
  alias: string;
  type: DonorType;
  campaigns: number;
  years: number;
  count: number;
}

export interface StoryMessage {
  id: string;
  text: string;
  alias: string;
  campaignId: string;
  campaignTitle: string;
  categoryName: string;
  donatedAt: string;
}

export interface DonorCommunity {
  donors: number;
  loyal: LoyalDonor[];
  /** 대표 메시지: 항목마다 가장 최근 글 하나씩 */
  stories: StoryMessage[];
}

export interface MessageWall {
  total: number;
  stories: StoryMessage[];
  short: { text: string; count: number }[];
}

export interface DonorStanding {
  type: DonorType;
  rank: number;
  of: number;
  topPercent: number;
  tier: string;
  nextTier: { name: string; remaining: number } | null;
  firstDonatedAt: string;
  campaigns: number;
  completedCampaigns: number;
  categories: { name: string; amount: number }[];
}

/** 나눔 단계 — 누적 기부액 기준(개인·기업·단체 공통) */
export const TIERS = [
  { name: "나눔 씨앗", min: 0 },
  { name: "나눔 새싹", min: 10_0000 },
  { name: "나눔 나무", min: 100_0000 },
  { name: "나눔 숲", min: 1000_0000 },
];

const TOP_COUNT = 10;
const LOYAL_COUNT = 5;
const FEATURED_COUNT = 3;
/** 이 길이 이상이면 정성껏 쓴 메시지로 보고 대표·모아보기에 싣습니다 */
const STORY_MIN_LENGTH = 30;
const YEAR_MS = 365 * 86_400_000;
/** 시스템이 남긴 문구라 기부자의 말로 보지 않음 */
const SYSTEM_MESSAGES = new Set(["지정기부"]);

const keyOf = (d: DonationRecord) => `${d.donorName}|${d.donorPhoneLast4 ?? ""}`;
const isAnonymous = (d: DonationRecord) => d.donorName === "익명";
const yearOf = (iso: string) => new Date(iso).getFullYear();

function categoryLookup(ds: Dataset) {
  const names = new Map(ds.categories.map((c) => [c.id, c.name]));
  const idOf = new Map(ds.campaigns.map((c) => [c.id, c.categoryId]));
  return { idOf: (d: DonationRecord) => idOf.get(d.campaignId) ?? "", nameOf: (id: string) => names.get(id) ?? "" };
}

/** 기부자별 합계를 금액 순으로 정렬 (같으면 건수가 많은 순) */
function rank(list: DonationRecord[], categoryOf: (d: DonationRecord) => string, nameOf: (id: string) => string): HonorRow[] {
  const groups = new Map<string, DonationRecord[]>();
  for (const d of list) {
    if (isAnonymous(d)) continue;
    const k = keyOf(d);
    groups.set(k, [...(groups.get(k) ?? []), d]);
  }
  const rows = [...groups.values()].map((ds) => {
    const byCategory = new Map<string, number>();
    for (const d of ds) byCategory.set(categoryOf(d), (byCategory.get(categoryOf(d)) ?? 0) + d.amount);
    const main = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return {
      rank: 0,
      alias: maskName(ds[0].donorName),
      type: ds[0].donorType,
      amount: ds.reduce((a, d) => a + d.amount, 0),
      count: ds.length,
      campaigns: new Set(ds.map((d) => d.campaignId)).size,
      mainCategory: nameOf(main),
    };
  });
  rows.sort((a, b) => b.amount - a.amount || b.count - a.count || a.alias.localeCompare(b.alias, "ko"));
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function buildDonorBoard(ds: Dataset, filter: BoardFilter, now = new Date()): DonorBoard {
  const { idOf, nameOf } = categoryLookup(ds);
  const inPeriod = (d: DonationRecord, period: BoardPeriod) => {
    if (period === "all") return true;
    if (period === "12m") return now.getTime() - new Date(d.donatedAt).getTime() < YEAR_MS;
    return yearOf(d.donatedAt) === period;
  };
  const ofType = ds.donations.filter((d) => d.donorType === filter.type);
  const inCategory = (d: DonationRecord) => !filter.categoryId || idOf(d) === filter.categoryId;
  const scoped = ofType.filter((d) => inCategory(d) && inPeriod(d, filter.period));
  const ranked = rank(scoped, idOf, nameOf);
  const years = [...new Set(ds.donations.map((d) => yearOf(d.donatedAt)))].sort((a, b) => a - b);

  return {
    scope: {
      total: scoped.reduce((a, d) => a + d.amount, 0),
      count: scoped.length,
      donors: ranked.length,
      anonymousCount: scoped.filter(isAnonymous).length,
    },
    top: ranked.slice(0, TOP_COUNT),
    byCategory: ds.categories.map((c) => ({
      id: c.id,
      name: c.name,
      top: rank(ofType.filter((d) => idOf(d) === c.id && inPeriod(d, filter.period)), idOf, nameOf)[0] ?? null,
    })),
    byYear: years.map((year) => ({ year, top: rank(ofType.filter((d) => inCategory(d) && yearOf(d.donatedAt) === year), idOf, nameOf)[0] ?? null })),
  };
}

export function buildDonorCommunity(ds: Dataset): DonorCommunity {
  const groups = new Map<string, DonationRecord[]>();
  for (const d of ds.donations) {
    if (isAnonymous(d)) continue;
    groups.set(keyOf(d), [...(groups.get(keyOf(d)) ?? []), d]);
  }
  const loyal = [...groups.values()]
    .map((list) => ({
      alias: maskName(list[0].donorName),
      type: list[0].donorType,
      campaigns: new Set(list.map((d) => d.campaignId)).size,
      years: new Set(list.map((d) => yearOf(d.donatedAt))).size,
      count: list.length,
    }))
    .sort((a, b) => b.campaigns - a.campaigns || b.years - a.years || b.count - a.count)
    .slice(0, LOYAL_COUNT);

  const seen = new Set<string>();
  const stories = storiesOf(ds)
    .filter((s) => !seen.has(s.categoryName) && seen.add(s.categoryName))
    .slice(0, FEATURED_COUNT);

  const anonymous = ds.donations.filter(isAnonymous);
  return { donors: groups.size + new Set(anonymous.map(keyOf)).size, loyal, stories };
}

/** 정성껏 쓴 메시지를 최신순으로. 같은 문장은 가장 최근 건만 */
function storiesOf(ds: Dataset): StoryMessage[] {
  const { idOf, nameOf } = categoryLookup(ds);
  const titles = new Map(ds.campaigns.map((c) => [c.id, c.title]));
  const byText = new Map<string, DonationRecord>();
  for (const d of ds.donations) {
    if (!d.message || d.message.length < STORY_MIN_LENGTH) continue;
    const cur = byText.get(d.message);
    if (!cur || d.donatedAt > cur.donatedAt) byText.set(d.message, d);
  }
  return [...byText.values()]
    .sort((a, b) => b.donatedAt.localeCompare(a.donatedAt))
    .map((d) => ({ id: d.id, text: d.message!, alias: maskName(d.donorName), campaignId: d.campaignId, campaignTitle: titles.get(d.campaignId) ?? "", categoryName: nameOf(idOf(d)), donatedAt: d.donatedAt }));
}

export function buildMessageWall(ds: Dataset, categoryId: string | null): MessageWall {
  const { idOf, nameOf } = categoryLookup(ds);
  const name = categoryId ? nameOf(categoryId) : null;
  const written = ds.donations.filter((d) => d.message && !SYSTEM_MESSAGES.has(d.message) && (!categoryId || idOf(d) === categoryId));
  const short = new Map<string, number>();
  for (const d of written) {
    if (d.message!.length < STORY_MIN_LENGTH) short.set(d.message!, (short.get(d.message!) ?? 0) + 1);
  }
  return {
    total: written.length,
    stories: storiesOf(ds).filter((s) => !name || s.categoryName === name),
    short: [...short.entries()].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count),
  };
}

/** 본인 조회 화면용 — 같은 구분(개인·기업·단체) 안에서의 내 위치와 나눔 단계 */
export function buildStanding(ds: Dataset, mine: DonationRecord[]): DonorStanding {
  const { idOf, nameOf } = categoryLookup(ds);
  const type = mine[0].donorType;
  const total = mine.reduce((a, d) => a + d.amount, 0);

  const totals = new Map<string, number>();
  for (const d of ds.donations) {
    if (d.donorType === type && !isAnonymous(d)) totals.set(keyOf(d), (totals.get(keyOf(d)) ?? 0) + d.amount);
  }
  const rankOfMine = 1 + [...totals.values()].filter((v) => v > total).length;

  const tierIndex = TIERS.findLastIndex((t) => total >= t.min);
  const next = TIERS[tierIndex + 1];
  const byCategory = new Map<string, number>();
  for (const d of mine) byCategory.set(idOf(d), (byCategory.get(idOf(d)) ?? 0) + d.amount);
  const campaignIds = new Set(mine.map((d) => d.campaignId));

  return {
    type,
    rank: rankOfMine,
    of: totals.size,
    topPercent: (rankOfMine / (totals.size || 1)) * 100,
    tier: TIERS[tierIndex].name,
    nextTier: next ? { name: next.name, remaining: next.min - total } : null,
    firstDonatedAt: mine.map((d) => d.donatedAt).sort()[0],
    campaigns: campaignIds.size,
    completedCampaigns: ds.campaigns.filter((c) => campaignIds.has(c.id) && c.status === "완료").length,
    categories: [...byCategory.entries()].map(([id, amount]) => ({ name: nameOf(id), amount })).sort((a, b) => b.amount - a.amount),
  };
}
