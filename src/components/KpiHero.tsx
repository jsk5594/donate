import { pct, won } from "@/lib/format";
import type { BalanceSheet } from "@/lib/types";

/** 메인 상단: 총 기부받은 금액 / 총 기부된 금액을 크게, 도넛으로 비율 */
export function KpiHero({ sheet, donationCount, campaignCount }: { sheet: BalanceSheet; donationCount: number; campaignCount: number }) {
  const total = sheet.inflow.total || 1;
  const parts = [
    { label: "기부됨", value: sheet.outflow.program, color: "var(--out-program)" },
    { label: "운영비", value: sheet.outflow.admin, color: "var(--out-admin)" },
    { label: "모금비용", value: sheet.outflow.fundraising, color: "var(--out-fundraising)" },
    { label: "잔액", value: sheet.outflow.balance, color: "var(--out-balance)" },
  ];
  const r = 54;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const per10k = Math.round((sheet.outflow.program / total) * 10000);

  return (
    <section className="grid gap-5 rounded-2xl bg-[#15202B] p-6 text-white md:grid-cols-[1fr_1fr_auto] md:items-center md:p-8">
      <div>
        <div className="text-sm text-[#B9C4D3]">총 기부받은 금액</div>
        <div className="mt-1 whitespace-nowrap text-[clamp(26px,2.6vw,40px)] font-bold leading-none tracking-tight tnum">{won(sheet.inflow.total)}</div>
        <div className="mt-2 text-sm text-[#B9C4D3]">
          {donationCount.toLocaleString("ko-KR")}건 · 모집건 {campaignCount}개
        </div>
      </div>
      <div>
        <div className="text-sm text-[#B9C4D3]">총 기부된 금액 (수혜자에게 전달)</div>
        <div className="mt-1 whitespace-nowrap text-[clamp(26px,2.6vw,40px)] font-bold leading-none tracking-tight tnum" style={{ color: "#5BD39A" }}>
          {won(sheet.outflow.program)}
        </div>
        <div className="mt-2 text-sm text-[#B9C4D3]">
          기부받은 돈의 {pct(sheet.outflow.program / total)} · 기부금 1만원 중 <strong className="text-white">{per10k.toLocaleString("ko-KR")}원</strong>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`기부받은 돈의 사용 비율: ${parts.map((p) => `${p.label} ${pct(p.value / total, 0)}`).join(", ")}`}>
          <circle cx="70" cy="70" r={r} fill="none" stroke="#2A3745" strokeWidth="18" />
          {parts.map((p) => {
            const len = (p.value / total) * C;
            const el = <circle key={p.label} cx="70" cy="70" r={r} fill="none" stroke={p.color} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />;
            offset += len;
            return el;
          })}
          <text x="70" y="66" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="700">
            {pct(sheet.outflow.program / total, 0)}
          </text>
          <text x="70" y="84" textAnchor="middle" fill="#B9C4D3" fontSize="11">
            기부됨
          </text>
        </svg>
        <ul className="space-y-1.5 text-xs">
          {parts.map((p) => (
            <li key={p.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} aria-hidden="true" />
              <span className="w-14 text-[#B9C4D3]">{p.label}</span>
              <span className="tnum">{pct(p.value / total)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
