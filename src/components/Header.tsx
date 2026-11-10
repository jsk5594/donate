import Link from "next/link";
import { HeaderNav } from "./HeaderNav";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="8" stroke="#1F4FD8" strokeWidth="2" />
            <path d="M18 18l7 7" stroke="#1F4FD8" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M12 15.6s-3.6-2.2-3.6-4.6a2 2 0 0 1 3.6-1.2A2 2 0 0 1 15.6 11c0 2.4-3.6 4.6-3.6 4.6z" fill="#1F4FD8" />
          </svg>
          <span className="whitespace-nowrap text-2xl font-bold tracking-tight">기부 돋보기</span>
          <span className="hidden text-xs text-muted sm:inline">투명한 기부, 따뜻한 세상</span>
        </Link>
        <HeaderNav />
      </div>
    </header>
  );
}
