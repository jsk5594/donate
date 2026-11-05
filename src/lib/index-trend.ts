/**
 * 완료된 모집건의 기부투명도지수 추이
 * - 각 시점(월말·연말)까지의 원장으로 대차대조표를 다시 계산하고, 그 시점의 상태로 운영 세칙을 다시 판정
 * - 종합: 그 시점에 진행 중이던 완료 모집건 지수의 '그때까지 기부받은 돈' 가중 평균
 * - 항목별: 같은 방식으로 항목 안에서만 평균
 * ※ 공개 이력은 데이터에 마지막 공개일만 있어, 그 이전 시점은 '주기대로 공개했다'고 가정
 */
import { computeBalanceSheet, otherInflowFor, type Overview } from "./repository";
import { aggregateIndex, evaluateHealth } from "./rules";
import type { Campaign } from "./types";

export interface TrendPoint {
  key: string; // "2025-09" | "2025"
  label: string; // "25.9" | "2025"
  overall: number | null;
  byCategory: Record<string, number | null>;
}

export interface IndexTrend {
  categories: { id: string; name: string }[];
  campaigns: { id: string; title: string; categoryId: string; completedAt: string }[];
  monthly: TrendPoint[];
  yearly: TrendPoint[];
}

const DAY = 86_400_000;

function asOfCampaign(c: Campaign, asOf: Date): Campaign {
  const completed = c.completedAt && asOf >= new Date(c.completedAt);
  const last = new Date(c.lastDisclosedAt);
  return {
    ...c,
    status: completed ? "완료" : new Date(c.endDate) < asOf ? "집행중" : "모집중",
    lastDisclosedAt: (last <= asOf ? last : asOf).toISOString(),
  };
}

export function buildIndexTrend(o: Overview, now = new Date()): IndexTrend {
  const done = o.campaigns.filter((s) => s.campaign.status === "완료" && s.campaign.completedAt);
  const ids = new Set(done.map((s) => s.campaign.id));
  const dons = o.donations.filter((d) => ids.has(d.campaignId));
  const exps = o.expenses.filter((e) => ids.has(e.campaignId));
  const categories = o.categories.filter((c) => done.some((s) => s.category.id === c.category.id)).map((c) => ({ id: c.category.id, name: c.category.name }));

  /** asOf 시점 각 완료 모집건의 (지수, 가중치=그때까지 받은 돈) */
  const snapshot = (periodStart: Date, asOf: Date) => {
    const out: { categoryId: string; score: number; weight: number }[] = [];
    for (const s of done) {
      const c = s.campaign;
      const start = new Date(c.startDate);
      const end = new Date(c.completedAt!);
      // 이 기간에 진행 중이던 모집건만 (시작 전·완료 이후 제외)
      if (start > asOf || end < periodStart) continue;
      const at = end < asOf ? end : asOf;
      const d = dons.filter((x) => x.campaignId === c.id && new Date(x.donatedAt) <= at);
      const e = exps.filter((x) => x.campaignId === c.id && new Date(x.spentAt) <= at);
      const received = d.reduce((a, x) => a + x.amount, 0);
      if (received === 0) continue;
      const sheet = computeBalanceSheet(d, e, otherInflowFor(received));
      const h = evaluateHealth(asOfCampaign(c, new Date(at.getTime() + DAY)), sheet, at);
      if (h.score !== null) out.push({ categoryId: s.category.id, score: h.score, weight: received });
    }
    return out;
  };
  const point = (key: string, label: string, periodStart: Date, asOf: Date): TrendPoint => {
    const snap = snapshot(periodStart, asOf);
    return {
      key,
      label,
      overall: aggregateIndex(snap),
      byCategory: Object.fromEntries(categories.map((c) => [c.id, aggregateIndex(snap.filter((x) => x.categoryId === c.id))])),
    };
  };

  const first = new Date(Math.min(...done.map((s) => new Date(s.campaign.startDate).getTime())));
  const last = new Date(Math.min(now.getTime(), Math.max(...done.map((s) => new Date(s.campaign.completedAt!).getTime()))));

  const monthly: TrendPoint[] = [];
  for (let y = first.getFullYear(), m = first.getMonth(); y < last.getFullYear() || (y === last.getFullYear() && m <= last.getMonth()); m === 11 ? (y++, (m = 0)) : m++) {
    const start = new Date(y, m, 1);
    const end = new Date(Math.min(new Date(y, m + 1, 0, 23, 59, 59).getTime(), now.getTime()));
    monthly.push(point(`${y}-${String(m + 1).padStart(2, "0")}`, `${String(y).slice(2)}.${m + 1}`, start, end));
  }
  const yearly: TrendPoint[] = [];
  for (let y = first.getFullYear(); y <= last.getFullYear(); y++) {
    const end = new Date(Math.min(new Date(y, 11, 31, 23, 59, 59).getTime(), now.getTime()));
    yearly.push(point(String(y), String(y), new Date(y, 0, 1), end));
  }

  return {
    categories,
    campaigns: done.map((s) => ({ id: s.campaign.id, title: s.campaign.title, categoryId: s.category.id, completedAt: s.campaign.completedAt! })),
    monthly,
    yearly,
  };
}
