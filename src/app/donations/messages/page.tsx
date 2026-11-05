import Link from "next/link";
import { fmtDate } from "@/lib/format";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

/** 기부자들이 남긴 말 — 정성껏 쓴 메시지를 모아 보는 페이지 */
export default async function DonorMessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const repo = getRepository();
  const categories = await repo.listCategories();
  const categoryId = categories.some((k) => k.id === c) ? (c as string) : null;
  const wall = await repo.getMessageWall(categoryId);
  const hrefOf = (id: string | null) => (id ? `/donations/messages?c=${id}` : "/donations/messages");

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-xs text-muted" aria-label="경로">
        <Link href="/donations" className="hover:text-primary">기부내역</Link> <span aria-hidden="true">›</span> 기부자들이 남긴 말
      </nav>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">기부자들이 남긴 말</h1>
        <p className="mt-1 text-sm text-muted">기부와 함께 전해 주신 메시지 {wall.total.toLocaleString("ko-KR")}건 가운데, 마음을 담아 길게 써 주신 글을 모았습니다. 이름은 가명으로 표시됩니다.</p>
      </header>

      <nav aria-label="항목" className="flex flex-wrap gap-1">
        {[{ id: null, name: "전체" }, ...categories].map((k) => (
          <Link
            key={k.name}
            href={hrefOf(k.id)}
            scroll={false}
            aria-current={categoryId === k.id ? "true" : undefined}
            className={`rounded-md px-3 py-1 text-sm font-semibold ${categoryId === k.id ? "bg-primary text-white" : "text-muted hover:bg-primary-soft hover:text-primary"}`}
          >
            {k.name}
          </Link>
        ))}
      </nav>

      {wall.stories.length === 0 ? (
        <p className="rounded-xl border border-line bg-card px-5 py-10 text-center text-sm text-muted">이 항목에는 아직 메시지가 없습니다.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {wall.stories.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 rounded-xl border border-line bg-card p-5">
              <p className="flex-1 leading-relaxed">“{s.text}”</p>
              <div className="border-t border-line pt-3 text-xs text-muted">
                <span className="font-semibold text-foreground">{s.alias}</span> · {fmtDate(s.donatedAt)} · {s.categoryName}
                <Link href={`/campaigns/${s.campaignId}`} className="mt-0.5 block truncate hover:text-primary">{s.campaignTitle}</Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {wall.short.length > 0 && (
        <section className="rounded-xl border border-line bg-card p-5">
          <h2 className="text-base font-bold">짧지만 따뜻한 응원</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {wall.short.map((m) => (
              <li key={m.text} className="rounded-full bg-primary-soft px-3 py-1.5 text-sm font-semibold">
                “{m.text}” <span className="font-normal text-muted tnum">{m.count.toLocaleString("ko-KR")}번</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
