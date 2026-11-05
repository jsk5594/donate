import Link from "next/link";
import type { ReactNode } from "react";
import { MyDonations } from "./MyDonations";
import { DONOR_TYPES, type BoardPeriod, type HonorRow } from "@/lib/donor-board";
import { fmtDate, won, wonShort } from "@/lib/format";
import { getRepository, sampleDonorCodes } from "@/lib/repository";
import type { DonorType } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { code?: string; t?: string; c?: string; p?: string };

const UNIT: Record<DonorType, string> = { 개인: "명", 기업: "곳", 단체: "곳" };
const MEDAL = [
  { bg: "#F6C544", ink: "#5A4300", label: "1위" },
  { bg: "#C9D1DC", ink: "#2E3A47", label: "2위" },
  { bg: "#E2A873", ink: "#54300F", label: "3위" },
];

/** 기부내역 — 함께 만든 결과, 내 기부 조회, 우수기부자 */
export default async function DonationsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const repo = getRepository();
  const overview = await repo.getOverview();
  const years = [...new Set(overview.donations.map((d) => new Date(d.donatedAt).getFullYear()))].sort((a, b) => a - b);

  // 유효한 값만 사용. 없으면 개인 / 전체 항목 / 전체 기간
  const type = DONOR_TYPES.find((t) => t === params.t) ?? "개인";
  const categoryId = overview.categories.some((c) => c.category.id === params.c) ? (params.c as string) : null;
  const period: BoardPeriod = params.p === "12m" ? "12m" : years.includes(Number(params.p)) ? Number(params.p) : "all";

  const code = params.code && /^D-?[0-9A-Fa-f]{8}$/.test(params.code) ? params.code.toUpperCase() : undefined;
  const [board, community, initialResult] = await Promise.all([repo.getDonorBoard({ type, categoryId, period }), repo.getDonorCommunity(), code ? repo.findMyDonations(code) : undefined]);

  const hrefOf = (next: { t?: DonorType; c?: string | null; p?: BoardPeriod }) => {
    const q = new URLSearchParams();
    const t = next.t ?? type;
    const c = next.c === undefined ? categoryId : next.c;
    const p = next.p ?? period;
    if (code) q.set("code", code);
    if (t !== "개인") q.set("t", t);
    if (c) q.set("c", c);
    if (p !== "all") q.set("p", String(p));
    const str = q.toString();
    return str ? `/donations?${str}` : "/donations";
  };

  const { totals } = overview;
  const per10k = Math.round((totals.donated / (totals.received || 1)) * 10000);
  const completed = overview.campaigns
    .filter((s) => s.campaign.status === "완료" && s.campaign.completedAt)
    .sort((a, b) => b.campaign.completedAt!.localeCompare(a.campaign.completedAt!));
  const periodText = period === "all" ? "전체 기간" : period === "12m" ? "최근 12개월" : `${period}년`;
  const categoryText = overview.categories.find((c) => c.category.id === categoryId)?.category.name ?? "전체 항목";
  const [first, second, third, ...rest] = board.top;
  const podium = [first, second, third].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">기부내역</h1>
        <p className="mt-1 text-sm text-muted">기부자 한 분 한 분이 만든 변화를 모았습니다. 이름은 모두 가명으로 표시됩니다.</p>
      </header>

      <section className="rounded-2xl bg-[#15202B] px-6 py-6 text-white md:px-8">
        <p className="text-sm font-semibold text-[#B9C4D3]">{years[0]}년부터 지금까지, 기부자 {community.donors.toLocaleString("ko-KR")}명·곳이 함께 만든 결과</p>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-sm text-[#B9C4D3]">함께 모은 돈</div>
            <div className="mt-1 text-[clamp(26px,3vw,40px)] font-bold leading-none tracking-tight tnum">{won(totals.received)}</div>
          </div>
          <div>
            <div className="text-sm text-[#B9C4D3]">수혜자에게 전달된 돈</div>
            <div className="mt-1 text-[clamp(26px,3vw,40px)] font-bold leading-none tracking-tight tnum" style={{ color: "#5BD39A" }}>{won(totals.donated)}</div>
            <div className="mt-2 text-sm text-[#B9C4D3]">기부금 1만원 중 <strong className="text-white tnum">{per10k.toLocaleString("ko-KR")}원</strong></div>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm md:grid-cols-3">
          <HeroStat label="기부 참여" value={`${totals.donationCount.toLocaleString("ko-KR")}건`} />
          <HeroStat label="함께한 모집건" value={`${totals.campaignCount}개`} />
          <HeroStat label="끝까지 전달을 마친 모집건" value={`${completed.length}개`} />
        </dl>
      </section>

      <section aria-labelledby="my-donations" className="flex flex-col gap-3">
        <div>
          <h2 id="my-donations" className="text-lg font-bold">나의 기부내역</h2>
          <p className="text-sm text-muted">기부코드를 입력하면 내 기부가 어디까지 닿았는지 볼 수 있습니다. 이름·연락처는 조회에 쓰이지 않습니다.</p>
        </div>
        <MyDonations samples={sampleDonorCodes()} initialCode={code} initialResult={initialResult ?? undefined} />
      </section>

      <section aria-labelledby="honor" className="rounded-xl border border-line bg-card">
        <header className="flex flex-col gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 id="honor" className="text-lg font-bold">우수기부자</h2>
            <p className="text-sm text-muted">구분·항목·기간별로 가장 큰 나눔을 실천한 분들입니다.</p>
          </div>
          <nav aria-label="기부자 구분" className="flex gap-1">
            {DONOR_TYPES.map((t) => (
              <Link key={t} href={hrefOf({ t })} scroll={false} aria-current={t === type ? "true" : undefined} className={`rounded-lg px-4 py-1.5 text-sm font-bold ${t === type ? "bg-primary text-white" : "text-muted hover:bg-primary-soft hover:text-primary"}`}>
                {t}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2">
            <ChipRow label="항목">
              <Chip href={hrefOf({ c: null })} active={categoryId === null}>전체</Chip>
              {overview.categories.map((c) => (
                <Chip key={c.category.id} href={hrefOf({ c: c.category.id })} active={categoryId === c.category.id}>{c.category.name}</Chip>
              ))}
            </ChipRow>
            <ChipRow label="기간">
              <Chip href={hrefOf({ p: "all" })} active={period === "all"}>전체</Chip>
              <Chip href={hrefOf({ p: "12m" })} active={period === "12m"}>최근 12개월</Chip>
              {years.map((y) => (
                <Chip key={y} href={hrefOf({ p: y })} active={period === y}>{y}년</Chip>
              ))}
            </ChipRow>
          </div>
        </header>

        <p className="border-b border-line bg-[#F7F8FA] px-5 py-2 text-xs text-muted">
          {periodText} · {categoryText} · {type} 기부 <strong className="text-foreground tnum">{won(board.scope.total)}</strong> · {board.scope.count.toLocaleString("ko-KR")}건 · 기부자 {board.scope.donors.toLocaleString("ko-KR")}{UNIT[type]}
          {board.scope.anonymousCount > 0 && ` · 익명 ${board.scope.anonymousCount.toLocaleString("ko-KR")}건은 합계에만 포함`}
        </p>

        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            {board.top.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">이 조건의 기부 기록이 없습니다. 다른 항목이나 기간을 골라 보세요.</p>
            ) : (
              <>
                <ol className="grid gap-3 sm:grid-cols-3">
                  {podium.map((r, i) => (
                    <li key={r.rank} className="flex flex-col items-center rounded-xl border border-line p-4 text-center" style={{ background: `color-mix(in srgb, ${MEDAL[i].bg} 14%, var(--card))` }}>
                      <span className="rounded-full px-3 py-0.5 text-xs font-bold" style={{ background: MEDAL[i].bg, color: MEDAL[i].ink }}>{MEDAL[i].label}</span>
                      <span className="mt-2 text-lg font-bold">{r.alias}</span>
                      <span className="mt-1 font-bold tnum">{won(r.amount)}</span>
                      <span className="mt-1 text-xs text-muted">{r.count}건 · 모집건 {r.campaigns}개 · {r.mainCategory}</span>
                    </li>
                  ))}
                </ol>
                {rest.length > 0 && (
                  <ol start={4} className="mt-3 divide-y divide-line rounded-xl border border-line">
                    {rest.map((r) => (
                      <li key={r.rank} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        <span className="w-6 shrink-0 text-center font-bold text-muted tnum">{r.rank}</span>
                        <span className="min-w-0 flex-1 truncate font-semibold">{r.alias}</span>
                        <span className="hidden shrink-0 text-xs text-muted sm:inline">{r.count}건 · {r.mainCategory}</span>
                        <span className="shrink-0 font-bold tnum">{won(r.amount)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </div>

          <div className="grid min-w-0 content-start gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <Leaders title={`항목별 1위 · ${periodText}`}>
              {board.byCategory.map((c) => (
                <Leader key={c.id} href={hrefOf({ c: c.id })} name={c.name} top={c.top} />
              ))}
            </Leaders>
            <Leaders title={`연도별 1위 · ${categoryText}`}>
              {[...board.byYear].reverse().map((y) => (
                <Leader key={y.year} href={hrefOf({ p: y.year })} name={`${y.year}년`} top={y.top} />
              ))}
            </Leaders>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-card">
          <header className="border-b border-line px-5 py-4">
            <h2 className="text-base font-bold">꾸준한 동행</h2>
            <p className="text-sm text-muted">가장 많은 모집건과 오래 함께한 기부자입니다.</p>
          </header>
          <ol className="divide-y divide-line">
            {community.loyal.map((l, i) => (
              <li key={l.alias} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="w-5 shrink-0 text-center font-bold text-muted tnum">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{l.alias} <span className="text-xs font-normal text-muted">{l.type}</span></span>
                <span className="shrink-0 text-right text-xs text-muted tnum"><strong className="text-sm text-foreground">모집건 {l.campaigns}개</strong> · {l.years}년째 · {l.count}건</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-line bg-card">
          <header className="flex items-center gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold">기부자들이 남긴 말</h2>
              <p className="text-sm text-muted">기부와 함께 남겨 주신 마음입니다.</p>
            </div>
            <Link href="/donations/messages" aria-label="기부자들이 남긴 말 전체 보기" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-muted hover:border-primary hover:text-primary">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M5.5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </header>
          <ul className="flex flex-col gap-2 p-5">
            {community.stories.map((s) => (
              <li key={s.id}>
                <Link href="/donations/messages" className="block rounded-lg bg-primary-soft px-4 py-3 hover:ring-1 hover:ring-primary">
                  <span className="line-clamp-2 text-sm font-semibold leading-relaxed">“{s.text}”</span>
                  <span className="mt-1 block truncate text-xs text-muted">{s.alias} · {s.categoryName} · {s.campaignTitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-line bg-card">
        <header className="flex flex-wrap items-baseline gap-x-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-bold">끝까지 전달된 기부</h2>
          <span className="text-sm text-muted">최근에 집행을 마친 모집건입니다.</span>
          <Link href="/reports" className="ml-auto rounded-md px-2 py-1 text-sm font-semibold text-primary hover:bg-primary-soft">결산 보고서 전체 →</Link>
        </header>
        <ul className="grid gap-3 p-5 md:grid-cols-3">
          {completed.slice(0, 3).map((s) => (
            <li key={s.campaign.id}>
              <Link href={`/reports/${s.campaign.id}`} className="flex h-full flex-col gap-1 rounded-lg border border-line p-4 hover:border-primary">
                <span className="text-xs text-muted">{s.category.name} · {fmtDate(s.campaign.completedAt!)} 완료</span>
                <span className="truncate font-bold">{s.campaign.title}</span>
                <span className="text-sm text-muted">기부자 참여 <span className="tnum">{s.donationCount.toLocaleString("ko-KR")}</span>건으로 <strong className="text-ok tnum">{wonShort(s.sheet.outflow.program)}</strong> 전달</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[#B9C4D3]">{label}</dt>
      <dd className="mt-0.5 font-bold tnum">{value}</dd>
    </div>
  );
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-1">
      <span className="mr-1 w-8 shrink-0 text-xs font-bold text-muted">{label}</span>
      {children}
    </nav>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link href={href} scroll={false} aria-current={active ? "true" : undefined} className={`rounded-md px-2.5 py-1 text-sm font-semibold ${active ? "bg-primary-soft text-primary" : "text-muted hover:bg-[#F3F5F8] hover:text-foreground"}`}>
      {children}
    </Link>
  );
}

function Leaders({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-line">
      <h3 className="border-b border-line px-4 py-2.5 text-sm font-bold">{title}</h3>
      <ul className="divide-y divide-line">{children}</ul>
    </div>
  );
}

function Leader({ href, name, top }: { href: string; name: string; top: HonorRow | null }) {
  return (
    <li>
      <Link href={href} scroll={false} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[#F7F8FA]">
        <span className="w-16 shrink-0 truncate text-xs text-muted">{name}</span>
        <span className="min-w-0 flex-1 truncate font-semibold">{top?.alias ?? "—"}</span>
        {top && <span className="shrink-0 text-xs font-bold tnum">{wonShort(top.amount)}</span>}
      </Link>
    </li>
  );
}
