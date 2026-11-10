import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtDate } from "@/lib/format";
import { RULE_POSTS, getRulePost } from "@/lib/rules-content";

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

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6">
      <nav className="text-xs text-muted" aria-label="경로">
        <Link href="/rules" className="hover:text-primary">운영 세칙</Link> <span aria-hidden="true">›</span> {post.category}
      </nav>
      <header className="border-b border-line pb-5">
        <div className="text-xs font-semibold text-primary">{post.category}</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{post.title}</h1>
        <p className="mt-2 text-sm text-muted">{post.summary}</p>
        <div className="mt-2 text-xs text-muted">게시 {fmtDate(post.publishedAt)} · 기부 돋보기 운영사무국</div>
      </header>
      <div className="flex flex-col gap-4 text-[15px] leading-relaxed">
        {post.body.map((para, i) => (
          <p key={i} className={para.startsWith("제") ? "" : "text-muted"}>
            {para}
          </p>
        ))}
      </div>
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
