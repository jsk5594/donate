import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtDateTime } from "@/lib/format";
import { getDemoArticle } from "@/lib/news";

export const dynamic = "force-dynamic";

/** 뉴스 API 연결 전 가상 기사 화면 — 실제 기사는 언론사 페이지로 바로 이동 */
export default async function DemoNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = getDemoArticle(id);
  if (!article) notFound();

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <nav className="text-xs text-muted" aria-label="경로">
        <Link href="/" className="hover:text-primary">홈</Link> › 최신 기부 뉴스
      </nav>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{article.title}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="rounded-full bg-warn-bg px-2 py-0.5 text-[11px] font-semibold text-warn">가상 뉴스</span>
          <span>{article.source} · {fmtDateTime(article.publishedAt)}</span>
        </p>
      </header>
      {/* eslint-disable-next-line @next/next/no-img-element -- public 폴더의 SVG */}
      <img src={article.thumbnail} alt="" className="aspect-[16/9] w-full rounded-xl object-cover" />
      <div className="flex flex-col gap-4 text-[15px] leading-relaxed">
        {article.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </article>
  );
}
