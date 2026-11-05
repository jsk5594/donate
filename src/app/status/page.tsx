import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { CampaignCard } from "@/components/CampaignCard";
import { ScoreBadge } from "@/components/HealthBadge";
import { RiskView } from "@/components/RiskView";
import { fmtDate, pct, won, wonShort } from "@/lib/format";
import { getRepository } from "@/lib/repository";
import { STAGES, stageOf, type CampaignSummary, type Stage } from "@/lib/types";

export const dynamic = "force-dynamic";

const COLORS = {
  received: "var(--in-individual)",
  program: "var(--out-program)",
  admin: "var(--out-admin)",
  fundraising: "var(--out-fundraising)",
};

const STAGE_STYLE: Record<Stage, string> = {
  진행중: "bg-primary-soft text-primary",
  "진행 예정": "bg-warn-bg text-warn",
  종료: "bg-[#E9EDF3] text-muted",
};

type Params = { y?: string | string[]; c?: string | string[]; s?: string | string[]; v?: string; tab?: string; sort?: string; dir?: string };
const asList = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const yearOf = (iso: string) => new Date(iso).getFullYear();

interface Row {
  s: CampaignSummary;
  received: number;
  count: number;
  program: number;
  admin: number;
  fundraising: number;
}

/** 기부 현황 — '기부 현황 조회'(연도·항목·진행상황 체크) / '기부 위기 감지'(위반·주의 모집건) 탭 */
export default async function StatusPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  if (params.tab === "risk") {
    return (
      <div className="flex flex-col gap-6">
        <StatusHeader tab="risk" />
        <RiskView params={params} />
      </div>
    );
  }

  const overview = await getRepository().getOverview();
  const { campaigns, donations, expenses, categories } = overview;

  // 선택지: 모집건 기간 + 입출금이 걸친 모든 연도
  const yearSet = new Set<number>();
  for (const s of campaigns) {
    const from = yearOf(s.campaign.startDate);
    const to = yearOf(s.campaign.completedAt ?? s.campaign.endDate);
    for (let y = from; y <= to; y++) yearSet.add(y);
  }
  for (const d of donations) yearSet.add(yearOf(d.donatedAt));
  for (const e of expenses) yearSet.add(yearOf(e.spentAt));
  const allYears = [...yearSet].sort((a, b) => a - b);

  // 선택값(유효한 값만). 비어 있으면 '전체'
  const selYears = asList(params.y).map(Number).filter((y) => yearSet.has(y));
  const selCats = asList(params.c).filter((id) => categories.some((c) => c.category.id === id));
  const selStatus = asList(params.s).filter((p) => (STAGES as readonly string[]).includes(p)) as Stage[];
  const searched = params.y !== undefined || params.c !== undefined || params.s !== undefined;
  const yearFilter = selYears.length > 0;
  const inYears = (iso: string) => !yearFilter || selYears.includes(yearOf(iso));

  // 모집건 필터: 항목 · 진행상황 · 모집 기간이 선택 연도에 걸치는지
  const matched = campaigns.filter((s) => {
    if (selCats.length && !selCats.includes(s.category.id)) return false;
    if (selStatus.length && !selStatus.includes(stageOf(s.campaign.status))) return false;
    if (yearFilter) {
      const from = yearOf(s.campaign.startDate);
      const to = yearOf(s.campaign.completedAt ?? s.campaign.endDate);
      if (!selYears.some((y) => y >= from && y <= to)) return false;
    }
    return true;
  });

  // 금액: 연도를 고르면 그 연도에 들어오고 나간 돈만 합산. 전체 기간이면 다른 화면과 같게 이자 등 기타수입까지 포함
  const rowMap = new Map<string, Row>(matched.map((s) => [s.campaign.id, { s, received: yearFilter ? 0 : s.sheet.inflow.other, count: 0, program: 0, admin: 0, fundraising: 0 }]));
  for (const d of donations) {
    const r = rowMap.get(d.campaignId);
    if (!r || !inYears(d.donatedAt)) continue;
    r.received += d.amount;
    r.count += 1;
  }
  for (const e of expenses) {
    const r = rowMap.get(e.campaignId);
    if (!r || !inYears(e.spentAt)) continue;
    if (e.type === "사업수행비용") r.program += e.amount;
    else if (e.type === "일반관리비용") r.admin += e.amount;
    else r.fundraising += e.amount;
  }
  const rows = [...rowMap.values()].sort((a, b) => b.s.campaign.startDate.localeCompare(a.s.campaign.startDate));
  const tot = rows.reduce(
    (a, r) => ({ received: a.received + r.received, count: a.count + r.count, program: a.program + r.program, admin: a.admin + r.admin, fundraising: a.fundraising + r.fundraising }),
    { received: 0, count: 0, program: 0, admin: 0, fundraising: 0 },
  );
  const spent = tot.program + tot.admin + tot.fundraising;
  const balance = rows.reduce((a, r) => a + r.s.sheet.outflow.balance, 0);
  const max = Math.max(1, tot.received, spent);

  // 보기 방식: 나열형(표, 기본) / 폴더형(항목별 묶음 + 카드)
  const view: "list" | "folder" = params.v === "folder" ? "folder" : "list";
  const viewHref = (v: "list" | "folder") => {
    const q = new URLSearchParams();
    selYears.forEach((y) => q.append("y", String(y)));
    selCats.forEach((c) => q.append("c", c));
    selStatus.forEach((s) => q.append("s", s));
    if (v === "folder") q.set("v", "folder");
    const str = q.toString();
    return str ? `/status?${str}` : "/status";
  };
  const folders = categories
    .map((c) => ({ category: c.category, rows: rows.filter((r) => r.s.category.id === c.category.id) }))
    .filter((f) => f.rows.length > 0);

  const conditionText = [
    yearFilter ? `${selYears.sort((a, b) => a - b).join("·")}년` : "전체 연도",
    selCats.length ? categories.filter((c) => selCats.includes(c.category.id)).map((c) => c.category.name).join("·") : "전체 항목",
    selStatus.length ? selStatus.join("·") : "전체 진행상황",
  ].join(" / ");

  return (
    <div className="flex flex-col gap-6">
      <StatusHeader tab="search" />
      <p className="text-sm text-muted">연도·항목·진행상황을 체크하고 조회하세요. 아무것도 체크하지 않은 묶음은 전체로 봅니다.</p>

      {/* 조회 조건 */}
      {/* next/form: 새로고침 없이 클라이언트 이동 → 사이드바 접힘 상태 유지. key로 '초기화' 시 체크 상태 갱신 */}
      <Form action="/status" key={`${selYears.join()}|${selCats.join()}|${selStatus.join()}`} className="rounded-xl border border-line bg-card p-5">
        {view === "folder" && <input type="hidden" name="v" value="folder" />}
        <div className="flex flex-col gap-4">
          <FilterGroup title="연도">
            {allYears.map((y) => (
              <Check key={y} name="y" value={String(y)} checked={selYears.includes(y)} label={`${y}년`} />
            ))}
          </FilterGroup>
          <FilterGroup title="항목">
            {categories.map((c) => (
              <Check key={c.category.id} name="c" value={c.category.id} checked={selCats.includes(c.category.id)} label={c.category.name} />
            ))}
          </FilterGroup>
          <FilterGroup title="진행상황">
            {STAGES.map((p) => (
              <Check key={p} name="s" value={p} checked={selStatus.includes(p)} label={p} />
            ))}
          </FilterGroup>
        </div>
        <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
          <button type="submit" className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90">
            조회
          </button>
          <Link href="/status" className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-[#F3F5F8]">
            초기화
          </Link>
        </div>
      </Form>

      {/* 조회 결과 */}
      <section className="rounded-xl border border-line bg-card">
        <header className="border-b border-line px-5 py-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-bold">조회 결과</h2>
            <span className="text-sm text-muted">{searched ? conditionText : "전체 (조건 없음)"}</span>
            <nav className="ml-auto flex gap-1 rounded-lg border border-line p-1 text-sm" aria-label="보기 방식">
              {(
                [
                  ["list", "나열형"],
                  ["folder", "폴더형"],
                ] as const
              ).map(([v, label]) => (
                <Link
                  key={v}
                  href={viewHref(v)}
                  scroll={false}
                  aria-current={view === v ? "page" : undefined}
                  className={`rounded-md px-3 py-1 font-semibold ${view === v ? "bg-primary text-white" : "text-muted hover:bg-primary-soft hover:text-primary"}`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">조건에 맞는 모집건이 없습니다.</p>
        ) : (
          <>
            <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1fr_320px]">
              <div className="flex flex-col gap-2">
                <Bar label="받음" max={max} parts={[{ v: tot.received, c: COLORS.received }]} />
                <Bar
                  label="쓰임"
                  max={max}
                  parts={[
                    { v: tot.program, c: COLORS.program },
                    { v: tot.admin, c: COLORS.admin },
                    { v: tot.fundraising, c: COLORS.fundraising },
                  ]}
                />
                <Legend />
                {yearFilter && <p className="text-xs text-muted">선택한 연도에 들어오고 나간 돈만 합산했습니다(입금일·지출일 기준, 이자 수입 제외).</p>}
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted">모집건</dt>
                <dd className="text-right font-semibold tnum">{rows.length}개</dd>
                <dt className="text-muted">기부 건수</dt>
                <dd className="text-right tnum">{tot.count.toLocaleString("ko-KR")}건</dd>
                <dt className="text-muted">기부받은 돈</dt>
                <dd className="text-right font-semibold tnum">{won(tot.received)}</dd>
                <dt className="text-muted">쓰인 돈</dt>
                <dd className="text-right font-semibold tnum">{won(spent)}</dd>
                <dt className="text-muted">사업비 비중(총지출 대비)</dt>
                <dd className="text-right tnum">{spent ? pct(tot.program / spent) : "—"}</dd>
                <dt className="text-muted">미집행 잔액(현재)</dt>
                <dd className="text-right tnum">{won(balance)}</dd>
              </dl>
            </div>

            {view === "folder" ? (
              <div className="flex flex-col gap-3 border-t border-line px-5 py-5">
                {folders.map((f) => {
                  const fr = f.rows.reduce((a, r) => a + r.received, 0);
                  const fp = f.rows.reduce((a, r) => a + r.program, 0);
                  return (
                    <details key={f.category.id} open className="group rounded-lg border border-line">
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-4 py-3 hover:bg-[#F7F8FA] [&::-webkit-details-marker]:hidden">
                        <FolderIcon />
                        <span className="text-base font-bold">{f.category.name}</span>
                        <span className="text-xs text-muted tnum">{f.rows.length}건</span>
                        <span className="text-sm text-muted">
                          {f.category.description} · 기부받은 돈 {wonShort(fr)} · 기부됨 {wonShort(fp)}
                        </span>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="ml-auto shrink-0 text-muted transition-transform group-open:rotate-180">
                          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </summary>
                      <div className="grid gap-3 border-t border-line p-4 sm:grid-cols-2 xl:grid-cols-3">
                        {f.rows.map((r) => (
                          <CampaignCard key={r.s.campaign.id} s={r.s} />
                        ))}
                      </div>
                    </details>
                  );
                })}
                {yearFilter && <p className="text-xs text-muted">카드 안의 금액은 연도와 관계없이 모집건 전체 기준입니다.</p>}
              </div>
            ) : (
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-[#F7F8FA] text-xs text-muted">
                  <tr>
                    <th className="px-5 py-2 text-left font-semibold">진행상황</th>
                    <th className="px-3 py-2 text-left font-semibold">모집건</th>
                    <th className="px-3 py-2 text-left font-semibold">항목</th>
                    <th className="px-3 py-2 text-left font-semibold">모집 기간</th>
                    <th className="px-3 py-2 text-right font-semibold">기부받은 돈</th>
                    <th className="px-3 py-2 text-right font-semibold">쓰인 돈</th>
                    <th className="px-3 py-2 text-right font-semibold">사업비 비중<span className="block font-normal">(총지출 대비)</span></th>
                    <th className="px-5 py-2 text-left font-semibold">투명도지수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => {
                    const c = r.s.campaign;
                    const out = r.program + r.admin + r.fundraising;
                    const upcoming = c.status === "예정";
                    return (
                      <tr key={c.id} className="hover:bg-[#F7F8FA]">
                        <td className="px-5 py-2.5">
                          <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${STAGE_STYLE[stageOf(c.status)]}`}>{stageOf(c.status)}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <Link href={`/campaigns/${c.id}`} className="font-semibold hover:text-primary">
                            {c.title}
                          </Link>
                          <div className="text-xs text-muted">{c.organizer}</div>
                        </td>
                        <td className="px-3 py-2.5">{r.s.category.name}</td>
                        <td className="px-3 py-2.5 text-xs text-muted tnum">
                          {fmtDate(c.startDate)} ~ {fmtDate(c.endDate)}
                        </td>
                        <td className="px-3 py-2.5 text-right tnum">{upcoming ? <span className="text-xs text-muted">목표 {wonShort(c.goal)}</span> : wonShort(r.received)}</td>
                        <td className="px-3 py-2.5 text-right tnum">{upcoming ? "—" : wonShort(out)}</td>
                        <td className="px-3 py-2.5 text-right tnum">{out ? pct(r.program / out) : "—"}</td>
                        <td className="px-5 py-2.5">{upcoming ? <span className="text-muted">—</span> : <ScoreBadge score={r.s.health.score} level={r.s.health.overall} />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function StatusHeader({ tab }: { tab: "search" | "risk" }) {
  const tabs = [
    { key: "search", href: "/status", label: "기부 현황 조회", on: "bg-primary text-white", off: "text-muted hover:bg-primary-soft hover:text-primary" },
    { key: "risk", href: "/status?tab=risk", label: "기부 위기 감지", on: "bg-risk-orange text-risk-ink", off: "text-muted hover:bg-risk-hover hover:text-risk-ink" },
  ] as const;
  return (
    <header className="flex">
      <h1 className="sr-only">기부 현황</h1>
      <nav className="flex flex-wrap gap-1 rounded-xl border border-line bg-card p-1" aria-label="기부 현황 보기">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            scroll={false}
            aria-current={tab === t.key ? "page" : undefined}
            className={`rounded-lg px-5 py-1.5 text-2xl font-bold tracking-tight ${tab === t.key ? t.on : t.off}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-primary">
      <path d="M2 4.5A1.5 1.5 0 013.5 3h3.4l1.6 1.8h6A1.5 1.5 0 0116 6.3v7.2a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 012 13.5v-9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={title} className="grid gap-2 md:grid-cols-[88px_1fr] md:items-center">
      <span className="text-sm font-bold">{title}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Check({ name, value, label, checked }: { name: string; value: string; label: string; checked: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="h-4 w-4 accent-[var(--color-primary)]" />
      <span className="font-semibold">{label}</span>
    </label>
  );
}

function Bar({ label, max, parts }: { label: string; max: number; parts: { v: number; c: string }[] }) {
  const total = parts.reduce((a, p) => a + p.v, 0);
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-xs text-muted">{label}</span>
      <div className="h-5 flex-1 overflow-hidden rounded bg-[#F3F5F8]" role="img" aria-label={`${label} ${won(total)}`}>
        <div className="flex h-full" style={{ width: `${(total / max) * 100}%` }}>
          {parts.map((p, i) => (
            <div key={i} style={{ width: `${(p.v / (total || 1)) * 100}%`, background: p.c }} />
          ))}
        </div>
      </div>
      <span className="w-20 shrink-0 text-right text-xs font-semibold tnum">{wonShort(total)}</span>
    </div>
  );
}

function Legend() {
  const items = [
    { l: "기부받은 돈", c: COLORS.received },
    { l: "기부됨(사업비)", c: COLORS.program },
    { l: "운영비", c: COLORS.admin },
    { l: "모금비용", c: COLORS.fundraising },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <span key={i.l} className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ background: i.c }} aria-hidden="true" />
          {i.l}
        </span>
      ))}
    </div>
  );
}
