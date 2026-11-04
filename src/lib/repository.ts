/**
 * 저장소 계층
 * - UI/페이지는 오직 이 모듈의 함수만 호출합니다.
 * - 지금은 MockRepository(가상 데이터)이고, DB 연결 시 DbRepository를 구현해 getRepository()에서 바꿔 끼웁니다.
 * - 개인정보(이름·연락처·수혜자)는 여기서 가명처리되어 Public* 타입으로만 밖으로 나갑니다.
 */

import { getDataset, interestIncomeFor, syntheticLiveDonations } from "./mock-data";
import { donorCodeOf, toPublicDonation, toPublicExpense } from "./pseudonymize";
import { evaluateHealth } from "./rules";
import type { BalanceSheet, Campaign, CampaignSummary, Category, DonationRecord, ExpenseRecord, PublicDonation, PublicExpense } from "./types";

export interface CampaignDetail extends CampaignSummary {
  donations: PublicDonation[];
  expenses: PublicExpense[];
}

export interface Overview {
  sheet: BalanceSheet;
  totals: { received: number; donated: number; admin: number; fundraising: number; balance: number; donationCount: number; expenseCount: number; campaignCount: number };
  categories: { category: Category; sheet: BalanceSheet; campaigns: CampaignSummary[] }[];
  campaigns: CampaignSummary[];
  donations: PublicDonation[];
  expenses: PublicExpense[];
}

export interface MyDonationsResult {
  donorCode: string;
  donorAlias: string;
  items: (PublicDonation & { campaignTitle: string; allocation: { program: number; admin: number; fundraising: number; balance: number } })[];
  total: number;
}

export interface Repository {
  listCategories(): Promise<Category[]>;
  listCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | null>;
  getCampaignDetail(id: string): Promise<CampaignDetail | null>;
  getOverview(): Promise<Overview>;
  /** now 생략 시 호출 시각 기준 */
  getLiveDonations(now?: number, count?: number): Promise<(PublicDonation & { campaignTitle: string })[]>;
  findMyDonations(donorCode: string): Promise<MyDonationsResult | null>;
}

// ---------- 공통 집계 ----------
export function computeBalanceSheet(donations: Pick<DonationRecord, "donorType" | "amount">[], expenses: Pick<ExpenseRecord, "type" | "amount">[], otherInflow = 0): BalanceSheet {
  const inflow = { individual: 0, corporate: 0, group: 0, other: otherInflow, total: 0 };
  for (const d of donations) {
    if (d.donorType === "개인") inflow.individual += d.amount;
    else if (d.donorType === "기업") inflow.corporate += d.amount;
    else inflow.group += d.amount;
  }
  inflow.total = inflow.individual + inflow.corporate + inflow.group + inflow.other;

  const outflow = { program: 0, admin: 0, fundraising: 0, balance: 0, total: 0 };
  for (const e of expenses) {
    if (e.type === "사업수행비용") outflow.program += e.amount;
    else if (e.type === "일반관리비용") outflow.admin += e.amount;
    else outflow.fundraising += e.amount;
  }
  outflow.balance = inflow.total - outflow.program - outflow.admin - outflow.fundraising;
  outflow.total = outflow.program + outflow.admin + outflow.fundraising + outflow.balance;

  return { inflow, outflow, difference: inflow.total - outflow.total };
}

const otherInflowFor = interestIncomeFor;

// ---------- Mock 구현 ----------
class MockRepository implements Repository {
  private get ds() {
    return getDataset();
  }

  async listCategories() {
    return this.ds.categories;
  }

  async listCampaigns() {
    return this.ds.campaigns;
  }

  async getCampaign(id: string) {
    return this.ds.campaigns.find((c) => c.id === id) ?? null;
  }

  private summarize(c: Campaign): CampaignSummary & { rawDonations: DonationRecord[]; rawExpenses: ExpenseRecord[] } {
    const donations = this.ds.donations.filter((d) => d.campaignId === c.id);
    const expenses = this.ds.expenses.filter((e) => e.campaignId === c.id);
    const received = donations.reduce((s, d) => s + d.amount, 0);
    const sheet = computeBalanceSheet(donations, expenses, otherInflowFor(received));
    const category = this.ds.categories.find((k) => k.id === c.categoryId)!;
    return {
      campaign: c,
      category,
      sheet,
      health: evaluateHealth(c, sheet),
      donationCount: donations.length,
      expenseCount: expenses.length,
      rawDonations: donations,
      rawExpenses: expenses,
    };
  }

  async getCampaignDetail(id: string): Promise<CampaignDetail | null> {
    const c = await this.getCampaign(id);
    if (!c) return null;
    const s = this.summarize(c);
    return {
      campaign: s.campaign,
      category: s.category,
      sheet: s.sheet,
      health: s.health,
      donationCount: s.donationCount,
      expenseCount: s.expenseCount,
      donations: s.rawDonations.map(toPublicDonation).sort((a, b) => b.donatedAt.localeCompare(a.donatedAt)),
      expenses: s.rawExpenses.map(toPublicExpense).sort((a, b) => b.spentAt.localeCompare(a.spentAt)),
    };
  }

  async getOverview(): Promise<Overview> {
    const summaries = this.ds.campaigns.map((c) => this.summarize(c));
    const otherTotal = summaries.reduce((s, x) => s + x.sheet.inflow.other, 0);
    const sheet = computeBalanceSheet(this.ds.donations, this.ds.expenses, otherTotal);
    const categories = this.ds.categories.map((category) => {
      const cs = summaries.filter((s) => s.campaign.categoryId === category.id);
      const ids = new Set(cs.map((s) => s.campaign.id));
      const catSheet = computeBalanceSheet(
        this.ds.donations.filter((d) => ids.has(d.campaignId)),
        this.ds.expenses.filter((e) => ids.has(e.campaignId)),
        cs.reduce((s, x) => s + x.sheet.inflow.other, 0),
      );
      return { category, sheet: catSheet, campaigns: cs.map(stripRaw) };
    });
    return {
      sheet,
      totals: {
        received: sheet.inflow.total,
        donated: sheet.outflow.program,
        admin: sheet.outflow.admin,
        fundraising: sheet.outflow.fundraising,
        balance: sheet.outflow.balance,
        donationCount: this.ds.donations.length,
        expenseCount: this.ds.expenses.length,
        campaignCount: this.ds.campaigns.length,
      },
      categories,
      campaigns: summaries.map(stripRaw),
      donations: this.ds.donations.map(toPublicDonation).sort((a, b) => b.donatedAt.localeCompare(a.donatedAt)),
      expenses: this.ds.expenses.map(toPublicExpense).sort((a, b) => b.spentAt.localeCompare(a.spentAt)),
    };
  }

  async getLiveDonations(now?: number, count = 12) {
    const titles = new Map(this.ds.campaigns.map((c) => [c.id, c.title]));
    return syntheticLiveDonations(now ?? Date.now(), count).map((d) => ({ ...toPublicDonation(d), campaignTitle: titles.get(d.campaignId) ?? "" }));
  }

  async findMyDonations(donorCode: string): Promise<MyDonationsResult | null> {
    const code = donorCode.trim().toUpperCase().replace(/^D-?/, "D-");
    const mine = this.ds.donations.filter((d) => donorCodeOf(d.donorName, d.donorPhoneLast4) === code);
    if (mine.length === 0) return null;
    const titles = new Map(this.ds.campaigns.map((c) => [c.id, c.title]));
    const sheets = new Map(this.ds.campaigns.map((c) => [c.id, this.summarize(c).sheet]));
    const items = mine.map((d) => {
      const pub = toPublicDonation(d);
      const sheet = sheets.get(d.campaignId)!;
      const t = sheet.inflow.total || 1;
      return {
        ...pub,
        campaignTitle: titles.get(d.campaignId) ?? "",
        // 내 기부금이 해당 모집건의 집행 비율대로 어디에 쓰였는지(비례 배분)
        allocation: {
          program: Math.round((d.amount * sheet.outflow.program) / t),
          admin: Math.round((d.amount * sheet.outflow.admin) / t),
          fundraising: Math.round((d.amount * sheet.outflow.fundraising) / t),
          balance: Math.round((d.amount * sheet.outflow.balance) / t),
        },
      };
    });
    return {
      donorCode: code,
      donorAlias: items[0].donorAlias,
      items: items.sort((a, b) => b.donatedAt.localeCompare(a.donatedAt)),
      total: items.reduce((s, i) => s + i.amount, 0),
    };
  }
}

function stripRaw(s: CampaignSummary & { rawDonations?: unknown; rawExpenses?: unknown }): CampaignSummary {
  const { rawDonations, rawExpenses, ...rest } = s;
  void rawDonations;
  void rawExpenses;
  return rest;
}

let repo: Repository | null = null;

/**
 * DB 전환 지점.
 * 예) process.env.DATABASE_URL 이 있으면 new DbRepository(prisma) 를 반환하도록 변경.
 */
export function getRepository(): Repository {
  if (!repo) repo = new MockRepository();
  return repo;
}

/** 데모용: '나의 기부내역' 테스트 코드 몇 개를 노출 */
export function sampleDonorCodes(): { code: string; alias: string; count: number }[] {
  const ds = getDataset();
  const map = new Map<string, { alias: string; count: number; type: string }>();
  for (const d of ds.donations) {
    if (d.donorName === "익명") continue;
    const code = donorCodeOf(d.donorName, d.donorPhoneLast4);
    const cur = map.get(code);
    if (cur) cur.count++;
    else map.set(code, { alias: toPublicDonation(d).donorAlias, count: 1, type: d.donorType });
  }
  const all = [...map.entries()].map(([code, v]) => ({ code, ...v })).sort((a, b) => b.count - a.count);
  // 데모: 개인 2명(기부 건수 많은 순) + 단체 1곳
  const people = all.filter((x) => x.type === "개인").slice(0, 2);
  const group = all.find((x) => x.type === "단체");
  return [...people, ...(group ? [group] : [])].map(({ code, alias, count }) => ({ code, alias, count }));
}
