"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** match: 이 메뉴에 속하는 경로(하위 페이지 포함) */
const NAV = [
  { href: "/", label: "홈", match: [] },
  { href: "/status", label: "기부 현황", match: ["/status", "/campaigns", "/categories"] },
  { href: "/organizations", label: "주관기관 감사", match: ["/organizations"] },
  { href: "/rules", label: "운영 세칙", match: ["/rules"] },
  { href: "/reports", label: "기부 보고서", match: ["/reports"] },
  { href: "/donations", label: "기부내역", match: ["/donations"] },
];

export function HeaderNav() {
  const pathname = usePathname();
  const isActive = (n: (typeof NAV)[number]) => (n.href === "/" ? pathname === "/" : n.match.some((m) => pathname === m || pathname.startsWith(`${m}/`)));

  return (
    <nav aria-label="주요 메뉴" className="ml-auto flex flex-wrap items-center gap-1 text-sm">
      {NAV.map((n) => {
        const active = isActive(n);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 ${active ? "bg-primary font-semibold text-white" : "text-foreground hover:bg-primary-soft hover:text-primary"}`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
