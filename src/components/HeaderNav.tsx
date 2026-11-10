"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Item = { href: string; label: string; desc?: string };
type Menu = { href: string; label: string; match: string[]; items?: Item[] };

/** match: 이 메뉴에 속하는 경로(하위 페이지 포함). items가 있으면 마우스를 올렸을 때 아래로 하위 메뉴가 열림 */
const NAV: Menu[] = [
  { href: "/", label: "홈", match: [] },
  {
    href: "/status",
    label: "기부 살펴보기",
    match: ["/status", "/campaigns", "/categories"],
    items: [
      { href: "/status", label: "기부 현황 조회", desc: "연도·항목·진행상황별 모집건" },
      { href: "/status?tab=risk", label: "확인 필요 모집건", desc: "기준을 넘었거나 주의가 필요한 모집건" },
    ],
  },
  {
    href: "/organizations",
    label: "AI 점검",
    match: ["/organizations", "/ai-check"],
    items: [
      { href: "/organizations", label: "기관 살펴보기", desc: "모집기관의 5년 이력과 점검 의견" },
      { href: "/ai-check/purpose", label: "모집 목적 점검", desc: "모집 목적과 맞지 않는 지출 찾기" },
      { href: "/ai-check/anomaly", label: "지출 패턴 점검", desc: "분할 결제·중복 지급 같은 패턴 찾기" },
    ],
  },
  { href: "/reports", label: "기부 보고서", match: ["/reports"] },
  { href: "/donations", label: "기부내역", match: ["/donations"] },
  { href: "/rules", label: "운영 세칙", match: ["/rules"] },
];

export function HeaderNav() {
  const pathname = usePathname();
  const isActive = (n: Menu) => (n.href === "/" ? pathname === "/" : n.match.some((m) => pathname === m || pathname.startsWith(`${m}/`)));
  // 클릭(터치)·키보드로 연 하위 메뉴. 마우스는 올리기만 해도 열림(CSS hover)
  const [open, setOpen] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // 바깥을 누르거나 Esc를 누르면 닫음
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 하위 항목을 눌러 이동하면 메뉴를 닫고 포커스를 풂
  const choose = (e: React.MouseEvent<HTMLElement>) => {
    setOpen(null);
    e.currentTarget.blur();
  };

  return (
    <nav ref={navRef} aria-label="주요 메뉴" className="ml-auto flex flex-wrap items-center gap-1 text-sm">
      {NAV.map((n) => {
        const active = isActive(n);
        const top = `flex items-center gap-1 rounded-lg px-3 py-2 ${active ? "bg-primary font-semibold text-white" : "text-foreground hover:bg-primary-soft hover:text-primary"}`;
        if (!n.items) {
          return (
            <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={top}>
              {n.label}
            </Link>
          );
        }
        const isOpen = open === n.href;
        return (
          <div key={n.href} className="group relative">
            {/* 상위 버튼은 이동하지 않고 하위 메뉴만 엶 — 이동은 아래 항목을 골라야 함 */}
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={isOpen}
              aria-current={active ? "page" : undefined}
              className={`${top} cursor-pointer`}
              onClick={() => setOpen(isOpen ? null : n.href)}
            >
              {n.label}
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className={`opacity-70 transition-transform group-hover:rotate-180 ${isOpen ? "rotate-180" : ""}`}>
                <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {/* pt-2: 버튼과 메뉴 사이 빈틈에서 마우스가 벗어나 닫히지 않도록 */}
            <div
              className={`absolute left-0 top-full z-40 pt-2 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-has-[a:focus-visible]:visible group-has-[a:focus-visible]:opacity-100 ${isOpen ? "visible opacity-100" : "invisible opacity-0"}`}
            >
              <ul role="menu" aria-label={`${n.label} 하위 메뉴`} className="w-64 overflow-hidden rounded-xl border border-line bg-card py-1.5 shadow-lg">
                {n.items.map((it) => {
                  const here = !it.href.includes("?") && pathname === it.href;
                  return (
                    <li key={it.href} role="none">
                      <Link
                        role="menuitem"
                        href={it.href}
                        onClick={choose}
                        aria-current={here ? "page" : undefined}
                        className={`block px-4 py-2.5 hover:bg-primary-soft focus:bg-primary-soft focus:outline-none ${here ? "text-primary" : "text-foreground"}`}
                      >
                        <span className="block font-semibold">{it.label}</span>
                        {it.desc && <span className="mt-0.5 block text-xs text-muted">{it.desc}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
