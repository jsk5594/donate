import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { fmtDateTime } from "@/lib/format";
import { getDonationNews, type NewsItem } from "@/lib/news";

/** 높이는 옆의 지수 추이 카드에 맞춤(absolute) */
function Frame({ children, credit }: { children: ReactNode; credit?: string }) {
  return (
    <div className="relative min-h-[390px] xl:min-h-0">
      <section className="flex h-full flex-col rounded-xl border border-line bg-card xl:absolute xl:inset-0">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-5">
          <h2 className="text-base font-bold">최신 기부 뉴스</h2>
          {credit && <span className="ml-auto text-xs text-muted">{credit}</span>}
        </header>
        {children}
      </section>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return <p className="flex flex-1 items-center justify-center px-5 py-8 text-center text-sm leading-relaxed text-muted">{children}</p>;
}

/** 이미지가 없거나 언론사가 외부 표시를 막아 깨져도 회색 칸만 보이도록 alt는 비움 */
function Thumbnail({ src }: { src: string | null }) {
  return (
    <span className="relative block h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-[#E9EDF3] sm:h-24 sm:w-36">
      {/* eslint-disable-next-line @next/next/no-img-element -- 언론사마다 도메인이 달라 next/image 허용 목록을 쓸 수 없음 */}
      {src && <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />}
    </span>
  );
}

function Row({ n }: { n: NewsItem }) {
  const className = "flex h-full items-center gap-4 px-5 py-3 hover:bg-[#F7F8FA]";
  const body = (
    <>
      <Thumbnail src={n.thumbnail} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-semibold leading-snug">{n.title}</span>
        {n.summary && <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{n.summary}</span>}
        <span className="mt-1 block truncate text-xs text-muted">
          {n.source} · {fmtDateTime(n.publishedAt)}
        </span>
      </span>
    </>
  );
  return n.external ? (
    <a href={n.link} target="_blank" rel="noopener noreferrer" className={className}>
      {body}
    </a>
  ) : (
    <Link href={n.link} className={className}>
      {body}
    </Link>
  );
}

async function NewsList() {
  const news = await getDonationNews();
  if (news.status === "error") return <Frame><Notice>뉴스를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</Notice></Frame>;
  if (news.items.length === 0) return <Frame><Notice>표시할 기부 뉴스가 없습니다.</Notice></Frame>;

  return (
    <Frame credit={news.status === "demo" ? "가상 데이터 · 실제 기사가 아닙니다" : "네이버 뉴스 검색 제공"}>
      <ul className="flex min-h-0 flex-1 flex-col divide-y divide-line">
        {news.items.map((n) => (
          <li key={n.link} className="min-h-0 flex-1">
            <Row n={n} />
          </li>
        ))}
      </ul>
    </Frame>
  );
}

/** 뉴스 응답을 기다리는 동안에도 메인 페이지의 나머지는 먼저 표시 */
export function NewsCard() {
  return (
    <Suspense fallback={<Frame><Notice>뉴스를 불러오는 중입니다.</Notice></Frame>}>
      <NewsList />
    </Suspense>
  );
}
