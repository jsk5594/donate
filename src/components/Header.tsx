import Link from "next/link";
import { HeaderNav } from "./HeaderNav";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="2" y="6" width="24" height="16" rx="3" stroke="#1F4FD8" strokeWidth="2" />
            <circle cx="14" cy="14" r="4" stroke="#1F4FD8" strokeWidth="2" />
            <circle cx="14" cy="14" r="1.5" fill="#1F4FD8" />
          </svg>
          <span className="whitespace-nowrap text-2xl font-bold tracking-tight">기부CCTV</span>
          <span className="hidden text-xs text-muted sm:inline">기부받은 돈 = 쓰인 돈 + 잔액, 누구나 확인</span>
        </Link>
        <HeaderNav />
      </div>
    </header>
  );
}
