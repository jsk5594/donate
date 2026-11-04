import Link from "next/link";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/monitor", label: "감시 현황" },
  { href: "/rules", label: "운영 세칙" },
  { href: "/reports", label: "기부 보고서" },
  { href: "/my", label: "나의 기부내역" },
];

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
          <span className="whitespace-nowrap text-xl font-bold tracking-tight">기부CCTV</span>
          <span className="hidden text-xs text-muted sm:inline">기부받은 돈 = 쓰인 돈 + 잔액, 누구나 확인</span>
        </Link>
        <nav className="ml-auto flex flex-wrap items-center gap-1 text-sm">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-foreground hover:bg-primary-soft hover:text-primary">
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
