/**
 * 가상 데이터(5개년)를 SQLite DB 파일로 저장합니다.
 *   npm run db:seed   →  data/donation-dotbogi.db
 * Node 22.13+ 내장 node:sqlite 사용(추가 패키지 없음). 생성기는 src/lib/mock-data.ts(시드 고정).
 */
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getDataset, REFERENCE_NOW } from "../src/lib/mock-data.ts";

const file = path.join(process.cwd(), "data", "donation-dotbogi.db");
mkdirSync(path.dirname(file), { recursive: true });
rmSync(file, { force: true });

const db = new DatabaseSync(file);
db.exec(`
PRAGMA journal_mode = DELETE;
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE categories (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL
);
CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  title TEXT NOT NULL, region TEXT NOT NULL, organizer TEXT NOT NULL,
  legal_basis TEXT NOT NULL CHECK (legal_basis IN ('기부금품법','재해구호법','고향사랑기부금법','사회복지공동모금회법')),
  registration_no TEXT NOT NULL, purpose TEXT NOT NULL,
  goal INTEGER NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('예정','모집중','집행중','종료','완료')),
  disclosure_cycle_days INTEGER NOT NULL, last_disclosed_at TEXT NOT NULL, completed_at TEXT
);
-- 개인정보(donor_name, donor_phone_last4, recipient)는 서버에서 가명처리 후에만 화면으로 나감
CREATE TABLE donations (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  donor_name TEXT NOT NULL, donor_type TEXT NOT NULL CHECK (donor_type IN ('개인','기업','단체')),
  donor_phone_last4 TEXT, amount INTEGER NOT NULL, donated_at TEXT NOT NULL,
  method TEXT NOT NULL, message TEXT
);
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  type TEXT NOT NULL CHECK (type IN ('사업수행비용','일반관리비용','모금비용')),
  stat_code TEXT NOT NULL, stat_name TEXT NOT NULL, vendor TEXT NOT NULL, recipient TEXT,
  description TEXT NOT NULL, amount INTEGER NOT NULL, spent_at TEXT NOT NULL, receipt_id TEXT NOT NULL
);
CREATE INDEX idx_donations_campaign ON donations(campaign_id);
CREATE INDEX idx_donations_date ON donations(donated_at);
CREATE INDEX idx_expenses_campaign ON expenses(campaign_id);
`);

const ds = getDataset();
const insert = (sql, rows, map) => {
  const st = db.prepare(sql);
  for (const r of rows) st.run(...map(r));
};

db.exec("BEGIN");
insert("INSERT INTO meta VALUES (?, ?)", [["reference_now", REFERENCE_NOW.toISOString()], ["generated_at", new Date().toISOString()], ["source", "src/lib/mock-data.ts (seeded)"]], (r) => r);
insert("INSERT INTO categories VALUES (?, ?, ?)", ds.categories, (c) => [c.id, c.name, c.description]);
insert("INSERT INTO campaigns VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ds.campaigns, (c) => [
  c.id, c.categoryId, c.title, c.region, c.organizer, c.legalBasis, c.registrationNo, c.purpose, c.goal, c.startDate, c.endDate, c.status, c.disclosureCycleDays, c.lastDisclosedAt, c.completedAt ?? null,
]);
insert("INSERT INTO donations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", ds.donations, (d) => [
  d.id, d.campaignId, d.donorName, d.donorType, d.donorPhoneLast4 ?? null, d.amount, d.donatedAt, d.method, d.message ?? null,
]);
insert("INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ds.expenses, (e) => [
  e.id, e.campaignId, e.type, e.statCode, e.statName, e.vendor, e.recipient ?? null, e.description, e.amount, e.spentAt, e.receiptId,
]);
db.exec("COMMIT");

const count = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
const years = db.prepare("SELECT substr(start_date,1,4) AS y, COUNT(*) AS n FROM campaigns GROUP BY y ORDER BY y").all();
console.log(`✔ ${path.relative(process.cwd(), file)}`);
console.log(`  categories ${count("categories")} · campaigns ${count("campaigns")} · donations ${count("donations")} · expenses ${count("expenses")}`);
console.log(`  campaigns by start year: ${years.map((r) => `${r.y}=${r.n}`).join(" ")}`);
db.close();
