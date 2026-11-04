import Link from "next/link";
import { fmtDate } from "@/lib/format";
import { RULE_POSTS } from "@/lib/rules-content";

const CAT_STYLE: Record<string, string> = {
  총칙: "bg-[#E9EDF3] text-foreground",
  법령기준: "bg-primary-soft text-primary",
  회계기준: "bg-ok-bg text-ok",
  해외기준: "bg-[#F1E8FA] text-[#5B2E91]",
  판정기준: "bg-warn-bg text-warn",
  개인정보: "bg-bad-bg text-bad",
};

export default function RulesPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">기부금 운영 세칙</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          국내 법령(기부금품의 모집ㆍ사용 및 기부문화 활성화에 관한 법률)과 공익법인회계기준을 1차 근거로 하고, 국내 기준이 정하지 않은 운영비 상한·사업비 비중은 미국 BBB Wise Giving Alliance
          기준을 참고해 정했습니다. 모든 모집건은 이 세칙으로 판정됩니다.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Rule title="모금비용" value="≤ 15%" sub="법정 한도(10억 이하 구간) · 제2장" />
        <Rule title="운영비" value="≤ 10%" sub="세칙 상한(주의 8%) · 제6장" />
        <Rule title="사업수행비용" value="≥ 65%" sub="총지출 대비 하한(권장 75%) · 제5장" />
      </section>

      <section className="overflow-hidden rounded-xl border border-line bg-card">
        <div className="grid grid-cols-[1fr_auto] items-center border-b border-line bg-[#F7F8FA] px-5 py-2.5 text-xs font-semibold text-muted sm:grid-cols-[90px_1fr_110px]">
          <span className="hidden sm:block">분류</span>
          <span>제목</span>
          <span className="text-right">게시일</span>
        </div>
        <ul className="divide-y divide-line">
          {RULE_POSTS.map((p) => (
            <li key={p.slug}>
              <Link href={`/rules/${p.slug}`} className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-4 hover:bg-[#F7F8FA] sm:grid-cols-[90px_1fr_110px]">
                <span className={`hidden w-fit rounded-full px-2 py-0.5 text-xs font-semibold sm:inline-flex ${CAT_STYLE[p.category]}`}>{p.category}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold">{p.title}</span>
                  <span className="block truncate text-xs text-muted">{p.summary}</span>
                </span>
                <span className="text-right text-xs text-muted tnum">{fmtDate(p.publishedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Rule({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="text-xs text-muted">{title}</div>
      <div className="mt-1 text-2xl font-bold tnum">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{sub}</div>
    </div>
  );
}
