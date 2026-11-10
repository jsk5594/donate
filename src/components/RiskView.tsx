import Link from "next/link";
import type { ReactNode } from "react";
import { ScoreBadge, StatusBadge } from "@/components/HealthBadge";
import { fmtDate, pct, wonShort } from "@/lib/format";
import { getRepository } from "@/lib/repository";
import { aggregateIndex, CHECK_COUNT } from "@/lib/rules";
import { stageOf, type CampaignSummary, type Stage } from "@/lib/types";

type Dir = "asc" | "desc";
const yearOf = (iso: string) => new Date(iso).getFullYear();
const ratio = (s: CampaignSummary, amount: number) => amount / (s.sheet.inflow.total || 1);
const firstOf = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// 진행 예정은 판정 대상이 아니므로 선택지에서 제외
const RISK_STAGES: Stage[] = ["진행중", "종료"];

/** 표 머리글 클릭 정렬. first = 처음 눌렀을 때 방향 */
const SORTS = {
  score: { first: "asc", value: (s: CampaignSummary) => s.health.score ?? 0 },
  title: { first: "asc", value: (s: CampaignSummary) => s.campaign.title },
  received: { first: "desc", value: (s: CampaignSummary) => s.sheet.inflow.total },
  program: { first: "desc", value: (s: CampaignSummary) => ratio(s, s.sheet.outflow.program) },
  admin: { first: "desc", value: (s: CampaignSummary) => ratio(s, s.sheet.outflow.admin) },
  fundraising: { first: "desc", value: (s: CampaignSummary) => ratio(s, s.sheet.outflow.fundraising) },
  balance: { first: "desc", value: (s: CampaignSummary) => ratio(s, s.sheet.outflow.balance) },
  disclosed: { first: "desc", value: (s: CampaignSummary) => new Date(s.campaign.lastDisclosedAt).getTime() },
} satisfies Record<string, { first: Dir; value: (s: CampaignSummary) => number | string }>;
type SortKey = keyof typeof SORTS;

/** 표의 강조색은 판정 결과를 그대로 따름 */
function levelStyle(s: CampaignSummary, key: string) {
  const level = s.health.checks.find((c) => c.key === key)?.level;
  return level === "위반" ? "font-bold text-bad" : level === "주의" ? "font-bold text-warn" : "";
}

const compare = (a: number | string, b: number | string) => (typeof a === "string" || typeof b === "string" ? String(a).localeCompare(String(b), "ko") : a - b);

/** 기부 현황 페이지의 '확인 필요 모집건' 탭 — 위반·주의 모집건 표 (옅은 노랑·주황·빨강 계열) */
export async function RiskView({ params }: { params: { y?: string | string[]; s?: string | string[]; sort?: string | string[]; dir?: string | string[] } }) {
  const overview = await getRepository().getOverview();
  const upcomingCount = overview.campaigns.filter((s) => s.campaign.status === "예정").length;
  const judged = overview.campaigns.filter((s) => s.campaign.status !== "예정");
  const periodOf = (s: CampaignSummary) => [yearOf(s.campaign.startDate), yearOf(s.campaign.completedAt ?? s.campaign.endDate)] as const;

  const yearSet = new Set<number>();
  for (const s of judged) {
    const [from, to] = periodOf(s);
    for (let y = from; y <= to; y++) yearSet.add(y);
  }
  const allYears = [...yearSet].sort((a, b) => a - b);

  // 유효한 값만 사용. 없으면 전체 / 투명도지수 낮은 순
  const yearParam = Number(firstOf(params.y));
  const year = yearSet.has(yearParam) ? yearParam : null;
  const stage = RISK_STAGES.find((p) => p === firstOf(params.s)) ?? null;
  const sortParam = firstOf(params.sort);
  const dirParam = firstOf(params.dir);
  const sort: SortKey = sortParam !== undefined && Object.hasOwn(SORTS, sortParam) ? (sortParam as SortKey) : "score";
  const dir: Dir = dirParam === "asc" || dirParam === "desc" ? dirParam : SORTS[sort].first;

  const hrefOf = (next: { y?: number | null; s?: Stage | null; sort?: SortKey; dir?: Dir }) => {
    const q = new URLSearchParams({ tab: "risk" });
    const y = next.y === undefined ? year : next.y;
    const s = next.s === undefined ? stage : next.s;
    const k = next.sort ?? sort;
    const d = next.dir ?? dir;
    if (y !== null) q.set("y", String(y));
    if (s !== null) q.set("s", s);
    if (k !== "score" || d !== "asc") {
      q.set("sort", k);
      q.set("dir", d);
    }
    return `/status?${q}`;
  };
  /** 같은 열을 다시 누르면 방향 반전, 다른 열은 그 열의 기본 방향 */
  const sortHref = (k: SortKey) => hrefOf({ sort: k, dir: k === sort ? (dir === "asc" ? "desc" : "asc") : SORTS[k].first });
  const th = (k: SortKey) => ({ href: sortHref(k), dir: k === sort ? dir : null });

  // 연도·진행상황에 맞는 판정 대상 (상단 집계 기준)
  const scoped = judged.filter((s) => {
    if (stage && stageOf(s.campaign.status) !== stage) return false;
    if (year !== null) {
      const [from, to] = periodOf(s);
      if (year < from || year > to) return false;
    }
    return true;
  });
  const count = (lv: "위반" | "주의") => scoped.filter((r) => r.health.overall === lv).length;
  const avg = aggregateIndex(scoped.map((r) => ({ score: r.health.score ?? 0, weight: r.sheet.inflow.total })));
  const goodCount = scoped.filter((r) => r.health.overall === "양호").length;

  // 목록에는 위반·주의만 표시
  const sign = dir === "asc" ? 1 : -1;
  const rows = scoped
    .filter((s) => s.health.overall !== "양호")
    .sort((a, b) => sign * compare(SORTS[sort].value(a), SORTS[sort].value(b)) || (a.health.score ?? 0) - (b.health.score ?? 0));

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-risk-line bg-risk-wash p-4 sm:p-5">
      <div className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-risk-amber via-risk-orange to-risk-red px-5 py-4">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-risk-ink">
          <path d="M14 4L25.5 24h-23L14 4z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M14 11.5v6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="14" cy="20.6" r="1.3" fill="currentColor" />
        </svg>
        <div className="min-w-0">
          <p className="text-lg font-bold text-risk-ink">
            확인이 필요한 모집건 {count("위반") + count("주의")}건 <span className="text-sm font-semibold">· 위반 {count("위반")}건 · 주의 {count("주의")}건</span>
          </p>
          <p className="mt-0.5 text-sm text-foreground/80">모든 모집건을 운영 세칙 {CHECK_COUNT}개 항목으로 매일 점검합니다. 이 화면에는 위반과 주의 모집건만 보여 줍니다.{upcomingCount > 0 && ` 진행 예정 ${upcomingCount}건은 모집 시작 후 판정합니다.`}</p>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-risk-amber p-4"><div className="text-xs font-semibold text-risk-ink">평균 기부투명도지수 (양호 포함)</div><div className="mt-1 text-2xl font-bold tnum">{avg ?? "—"}<span className="text-sm font-normal text-risk-ink"> / 100</span></div></div>
        <div className="rounded-xl bg-risk-red p-4"><div className="text-xs font-semibold text-risk-ink">위반 (60점 미만)</div><div className="mt-1 text-2xl font-bold text-bad">{count("위반")}건</div></div>
        <div className="rounded-xl bg-risk-orange p-4"><div className="text-xs font-semibold text-risk-ink">주의 (60~79점)</div><div className="mt-1 text-2xl font-bold text-warn">{count("주의")}건</div></div>
      </section>

      <section className="overflow-hidden rounded-xl border border-risk-line bg-card">
        <header className="flex flex-col gap-2 border-b border-risk-line px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <nav className="flex flex-wrap items-center gap-1" aria-label="연도">
              <Chip href={hrefOf({ y: null })} active={year === null}>전체 연도</Chip>
              {allYears.map((y) => (
                <Chip key={y} href={hrefOf({ y })} active={year === y}>{y}년</Chip>
              ))}
            </nav>
            <nav className="flex flex-wrap items-center gap-1" aria-label="진행상황">
              <Chip href={hrefOf({ s: null })} active={stage === null}>전체</Chip>
              {RISK_STAGES.map((p) => (
                <Chip key={p} href={hrefOf({ s: p })} active={stage === p}>{p}</Chip>
              ))}
            </nav>
            <span className="ml-auto text-sm font-semibold tnum">{rows.length}건</span>
          </div>
          {(
            <p className="text-xs text-muted">
              기부됨·운영비·모금비용·잔액 비율은 기부받은 돈 대비입니다. {goodCount > 0 && `같은 조건의 양호 ${goodCount}건은 기부 현황 조회에서 볼 수 있습니다. `}
              {year !== null && "연도는 모집 시작부터 집행 완료까지의 기간이 걸친 모집건을 찾으며, 금액과 지수는 모집건 전체 기준입니다."}
            </p>
          )}
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="bg-risk-amber text-left text-xs text-risk-ink">
                <SortTh {...th("score")} className="px-4">투명도지수</SortTh>
                <SortTh {...th("title")} className="px-4">모집건</SortTh>
                <SortTh {...th("received")} right>기부받은 돈</SortTh>
                <SortTh {...th("program")} right>기부됨</SortTh>
                <SortTh {...th("admin")} right>운영비</SortTh>
                <SortTh {...th("fundraising")} right>모금비용</SortTh>
                <SortTh {...th("balance")} right>잔액</SortTh>
                <SortTh {...th("disclosed")}>마지막 공개</SortTh>
                <th className="px-4 py-2.5 font-semibold">판정 사유</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-risk-line">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted">조건에 맞는 위반·주의 모집건이 없습니다.</td>
                </tr>
              )}
              {rows.map((s) => {
                const t = s.sheet.inflow.total || 1;
                const issues = s.health.checks.filter((c) => c.level !== "양호");
                const bad = s.health.overall === "위반";
                return (
                  <tr key={s.campaign.id} className={`align-top hover:bg-risk-hover ${bad ? "bg-risk-row-bad" : "bg-risk-row-warn"}`}>
                    <td className={`border-l-4 px-4 py-3 ${bad ? "border-l-risk-mark-bad" : "border-l-risk-mark-warn"}`}><ScoreBadge score={s.health.score} level={s.health.overall} /></td>
                    <td className="px-4 py-3">
                      <Link href={`/campaigns/${s.campaign.id}`} className="font-semibold hover:text-risk-ink">{s.campaign.title}</Link>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted"><StatusBadge status={s.campaign.status} warm />{s.campaign.organizer}</div>
                    </td>
                    <td className="px-3 py-3 text-right tnum">{wonShort(s.sheet.inflow.total)}</td>
                    <td className="px-3 py-3 text-right tnum">{pct(s.sheet.outflow.program / t)}</td>
                    <td className={`px-3 py-3 text-right tnum ${levelStyle(s, "admin")}`}>{pct(s.sheet.outflow.admin / t)}</td>
                    <td className={`px-3 py-3 text-right tnum ${levelStyle(s, "fundraising")}`}>{pct(s.sheet.outflow.fundraising / t)}</td>
                    <td className="px-3 py-3 text-right tnum">{pct(s.sheet.outflow.balance / t)}</td>
                    <td className="px-3 py-3 text-xs text-muted">{fmtDate(s.campaign.lastDisclosedAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted">{issues.map((c) => `[${c.level}] ${c.label} ${c.value}`).join(" / ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`rounded-md px-2.5 py-1 text-sm font-semibold ${active ? "bg-risk-orange text-risk-ink" : "text-muted hover:bg-risk-hover hover:text-risk-ink"}`}
    >
      {children}
    </Link>
  );
}

function SortTh({ href, dir, right = false, className = "px-3", children }: { href: string; dir: Dir | null; right?: boolean; className?: string; children: ReactNode }) {
  return (
    <th aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"} className={`py-2.5 font-semibold ${className} ${right ? "text-right" : ""}`}>
      <Link href={href} scroll={false} className={`inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground ${dir ? "text-foreground" : ""}`}>
        {children}
        <span aria-hidden="true" className={dir ? "text-risk-ink" : "opacity-40"}>
          {dir === "asc" ? "▲" : dir === "desc" ? "▼" : "↕"}
        </span>
      </Link>
    </th>
  );
}
