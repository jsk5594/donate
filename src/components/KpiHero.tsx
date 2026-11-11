import type { ReactNode } from "react";
import { HeroExpand } from "./HeroExpand";
import { pct, won } from "@/lib/format";
import type { HealthLevel } from "@/lib/types";
import { Term } from "@/components/Term";
import { LEVEL_TEXT } from "@/lib/terms";
import { TransparencyHelp } from "@/components/TransparencyHelp";

export interface YearSummary {
  year: number;
  received: number;
  donationCount: number;
  campaignCount: number;
  program: number;
  admin: number;
  fundraising: number;
  /** 그해 들어온 돈 중 아직 쓰이지 않은 몫(받은 돈 − 쓴 돈, 0 미만이면 0) */
  balance: number;
  score: number;
  level: HealthLevel;
}

const LEVEL_COLOR: Record<HealthLevel, string> = { 양호: "#5BD39A", 주의: "#F5B544", 위반: "#FF7A7A" };

/** 메인 상단: 올해 기부받은 금액 / 기부된 금액 + 올해 종합 기부투명도지수 */
export function KpiHero({ y, children }: { y: YearSummary; children?: ReactNode }) {
  const total = Math.max(y.received, y.program + y.admin + y.fundraising) || 1;
  const parts = [
    { label: "수혜자에게 간 돈", value: y.program, color: "var(--out-program)" },
    { label: "운영비", value: y.admin, color: "var(--out-admin)" },
    { label: "모금에 쓴 돈", value: y.fundraising, color: "var(--out-fundraising)" },
    { label: "남은 돈", value: y.balance, color: "var(--out-balance)" },
  ];
  const r = 54;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const recv = y.received || 1;
  const per10k = Math.round((y.program / recv) * 10000);

  return (
    <HeroExpand
      label="전체 기부금 대차대조표"
      panel={children}
      top={
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_1fr_1fr] md:items-center md:gap-8">
      {/* 핵심: 종합 기부투명도지수 — 칸 가운데 정렬, 오른쪽 구분선 */}
      <div className="flex flex-col items-center md:border-r md:border-white/10 md:pr-8">
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-base font-semibold text-white">
          <span>{y.year}년 종합 <Term k="score" /></span>
          <TransparencyHelp tone="dark" align="center" />
        </div>
        <div className="flex items-center gap-5">
          <svg
            viewBox="0 0 140 140"
            className="h-[180px] w-[180px] shrink-0 xl:h-[210px] xl:w-[210px]"
            role="img"
            aria-label={`${y.year}년 종합 투명도 점수 ${y.score}점(${LEVEL_TEXT[y.level]}). 사용 비율: ${parts.map((p) => `${p.label} ${pct(p.value / total, 0)}`).join(", ")}`}
          >
            <circle cx="70" cy="70" r={r} fill="none" stroke="#2A3745" strokeWidth="18" />
            {parts.map((p) => {
              const len = (p.value / total) * C;
              const el = <circle key={p.label} cx="70" cy="70" r={r} fill="none" stroke={p.color} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />;
              offset += len;
              return el;
            })}
            <text x="70" y="73" textAnchor="middle" fill="#fff" fontSize="32" fontWeight="700">
              {y.score}
              <tspan fontSize="12" fill="#B9C4D3" fontWeight="400">
                점
              </tspan>
            </text>
            <text x="70" y="93" textAnchor="middle" fill={LEVEL_COLOR[y.level]} fontSize="14" fontWeight="700">
              {LEVEL_TEXT[y.level]}
            </text>
          </svg>
          <ul className="space-y-2 text-sm">
            {parts.map((p) => (
              <li key={p.label} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ background: p.color }} aria-hidden="true" />
                <span className="min-w-[6.5rem] whitespace-nowrap text-[#B9C4D3]">{p.label}</span>
                <span className="tnum">{pct(p.value / total)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <div className="text-sm text-[#B9C4D3]">{y.year}년 기부받은 금액</div>
        <div className="mt-1 whitespace-nowrap text-[clamp(26px,2.6vw,40px)] font-bold leading-none tracking-tight tnum">{won(y.received)}</div>
        <div className="mt-2 text-sm text-[#B9C4D3]">
          {y.donationCount.toLocaleString("ko-KR")}건 · 모집건 {y.campaignCount}개
        </div>
      </div>
      <div>
        <div className="text-sm text-[#B9C4D3]">{y.year}년 기부된 금액 (수혜자에게 전달)</div>
        <div className="mt-1 whitespace-nowrap text-[clamp(26px,2.6vw,40px)] font-bold leading-none tracking-tight tnum" style={{ color: "#5BD39A" }}>
          {won(y.program)}
        </div>
        <div className="mt-2 text-sm text-[#B9C4D3]">
          기부받은 돈의 {pct(y.program / recv)} · 기부금 1만원 중 <strong className="text-white">{per10k.toLocaleString("ko-KR")}원</strong>
        </div>
      </div>
    </div>
      }
    />
  );
}
