/**
 * 임시 DB(SQLite 파일) 읽기 — data/donation-dotbogi.db
 * - 만들기/다시 만들기: npm run db:seed
 * - 파일이 없으면 가상 데이터 생성기(mock-data.ts)로 대체 → 처음 받은 저장소도 바로 실행됨
 * - 지금은 읽기 전용이며, 서버 시작 후 한 번 읽어 메모리에 둡니다(DB 연결 후 쿼리 단위로 교체).
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getDataset, type Dataset } from "./mock-data";
import type { Campaign, DonationRecord, ExpenseRecord } from "./types";

export const DB_FILE = path.join(process.cwd(), "data", "donation-dotbogi.db");

type Row = Record<string, string | number | null>;
const opt = (v: string | number | null) => (v === null ? undefined : String(v));

let cached: { data: Dataset; source: "db" | "generator" } | null = null;

export function loadDataset(): Dataset {
  return datasetInfo().data;
}

export function datasetInfo(): { data: Dataset; source: "db" | "generator" } {
  if (cached) return cached;
  if (!existsSync(DB_FILE)) {
    cached = { data: getDataset(), source: "generator" };
    return cached;
  }
  const db = new DatabaseSync(DB_FILE, { readOnly: true });
  try {
    const all = (sql: string) => db.prepare(sql).all() as unknown as Row[];
    const categories = all("SELECT id, name, description FROM categories ORDER BY rowid").map((r) => ({ id: String(r.id), name: String(r.name), description: String(r.description) }));
    const campaigns: Campaign[] = all("SELECT * FROM campaigns ORDER BY rowid").map((r) => ({
      id: String(r.id),
      categoryId: String(r.category_id),
      title: String(r.title),
      region: String(r.region),
      organizer: String(r.organizer),
      // 예전 DB 파일(legal_basis 열 없음)도 읽히도록 기본값 — npm run db:seed로 다시 만들면 채워짐
      legalBasis: (r.legal_basis ?? "기부금품법") as Campaign["legalBasis"],
      registrationNo: String(r.registration_no),
      purpose: String(r.purpose),
      goal: Number(r.goal),
      startDate: String(r.start_date),
      endDate: String(r.end_date),
      status: String(r.status) as Campaign["status"],
      disclosureCycleDays: Number(r.disclosure_cycle_days),
      lastDisclosedAt: String(r.last_disclosed_at),
      completedAt: opt(r.completed_at),
    }));
    const donations: DonationRecord[] = all("SELECT * FROM donations ORDER BY donated_at").map((r) => ({
      id: String(r.id),
      campaignId: String(r.campaign_id),
      donorName: String(r.donor_name),
      donorType: String(r.donor_type) as DonationRecord["donorType"],
      donorPhoneLast4: opt(r.donor_phone_last4),
      amount: Number(r.amount),
      donatedAt: String(r.donated_at),
      method: String(r.method) as DonationRecord["method"],
      message: opt(r.message),
    }));
    const expenses: ExpenseRecord[] = all("SELECT * FROM expenses ORDER BY spent_at").map((r) => ({
      id: String(r.id),
      campaignId: String(r.campaign_id),
      type: String(r.type) as ExpenseRecord["type"],
      statCode: String(r.stat_code),
      statName: String(r.stat_name),
      vendor: String(r.vendor),
      recipient: opt(r.recipient),
      description: String(r.description),
      amount: Number(r.amount),
      spentAt: String(r.spent_at),
      receiptId: String(r.receipt_id),
    }));
    cached = { data: { categories, campaigns, donations, expenses }, source: "db" };
    return cached;
  } finally {
    db.close();
  }
}
