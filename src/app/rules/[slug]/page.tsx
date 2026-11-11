import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtDate } from "@/lib/format";
import { RULE_POSTS, getRulePost } from "@/lib/rules-content";
import { RULE_SYNC, articleLabel, citedArticles, lawLabel, pendingChanges } from "@/lib/law-sync";

export function generateStaticParams() {
  return RULE_POSTS.map((p) => ({ slug: p.slug }));
}

export default async function RulePostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getRulePost(slug);
  if (!post) notFound();
  const idx = RULE_POSTS.findIndex((p) => p.slug === slug);
  const prev = RULE_POSTS[idx - 1];
  const next = RULE_POSTS[idx + 1];
  const cited = citedArticles([post.title, ...post.body].join(" "));
  const pending = pendingChanges(slug);

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6">
      <nav className="text-xs text-muted" aria-label="경로">
        <Link href="/rules" className="hover:text-primary">운영 세칙</Link> <span aria-hidden="true">›</span> {post.category}
      </nav>
      <header className="border-b border-line pb-5">
        <div className="text-xs font-semibold text-primary">{post.category}</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{post.title}</h1>
        <p className="mt-2 text-sm text-muted">{post.summary}</p>
        <div className="mt-2 text-xs text-muted">
          게시 {fmtDate(post.publishedAt)} · 기부 돋보기 운영사무국 · 근거 자료 자동 점검 {fmtDate(RULE_SYNC.checkedAt)}
        </div>
      </header>
      {pending.length > 0 && (
        <section className="rounded-xl border border-[#E5C07B] bg-warn-bg p-4 text-sm" role="status">
          <h2 className="font-bold text-warn">근거 법령이 바뀌었습니다 · 세칙 검토 중</h2>
          <ul className="mt-1 space-y-0.5">
            {pending.map((c) => (
              <li key={c.date + c.title}>
                {fmtDate(c.date)} 확인: {c.title} ({c.detail})
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted">아래 법령 원문은 개정 내용으로 이미 바뀌었습니다. 세칙 본문은 검토를 마친 뒤 고칩니다.</p>
        </section>
      )}
      <div className="flex flex-col gap-4 text-[15px] leading-relaxed">
        {post.body.map((para, i) => (
          <p key={i} className={para.startsWith("제") ? "" : "text-muted"}>
            {para}
          </p>
        ))}
      </div>
      {cited.length > 0 && (
        <section className="rounded-xl border border-line bg-card p-4">
          <h2 className="text-sm font-bold">관련 법령 원문</h2>
          <p className="mt-0.5 text-xs text-muted">매월 1일 현행 법령을 확인해 자동으로 바꿉니다.</p>
          <div className="mt-2 divide-y divide-line">
            {cited.map(({ law, article }) => (
              <details key={law.id + article.no} className="group py-2">
                <summary className="cursor-pointer list-none text-sm font-semibold hover:text-primary">
                  <span className="mr-1 inline-block text-muted transition group-open:rotate-90" aria-hidden="true">›</span>
                  {lawLabel(law)} {articleLabel(article.no)}({article.title})
                  <span className="ml-2 text-xs font-normal text-muted">시행 {law.effective}</span>
                </summary>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{article.text}</p>
              </details>
            ))}
          </div>
        </section>
      )}
      {post.sources.length > 0 && (
        <section className="rounded-xl bg-[#F3F5F8] p-4">
          <h2 className="text-sm font-bold">근거 자료</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {post.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <nav className="flex justify-between border-t border-line pt-4 text-sm">
        {prev ? <Link href={`/rules/${prev.slug}`} className="text-primary hover:underline">← {prev.title}</Link> : <span />}
        {next ? <Link href={`/rules/${next.slug}`} className="text-right text-primary hover:underline">{next.title} →</Link> : <span />}
      </nav>
    </article>
  );
}
