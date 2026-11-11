import Link from "next/link";
import { HeaderNav } from "./HeaderNav";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            {/* 흐름(물결) 위에 실려 가는 기부(하트) — src/app/icon.svg와 같은 그림 */}
            <rect width="28" height="28" rx="7" fill="#1F4FD8" />
            <path d="M14 15.6s-5.2-3.1-5.2-6.7a2.8 2.8 0 0 1 5.2-1.5 2.8 2.8 0 0 1 5.2 1.5c0 3.6-5.2 6.7-5.2 6.7z" fill="#fff" />
            <path d="M5 19.2c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 4.5 0 3 1.3 4.5 0" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M5 23c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 4.5 0 3 1.3 4.5 0" stroke="#fff" strokeOpacity=".55" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="whitespace-nowrap text-2xl font-bold tracking-tight">기부 플로우</span>
          <span className="hidden text-xs text-muted sm:inline">투명한 기부, 따뜻한 세상</span>
        </Link>
        <HeaderNav />
      </div>
    </header>
  );
}
