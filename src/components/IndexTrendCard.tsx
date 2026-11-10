"use client";

import { useEffect, useRef, useState } from "react";
import type { IndexTrend, TrendPoint } from "@/lib/index-trend";
import { Term } from "@/components/Term";

/** 항목 색: 검증된 범주형 팔레트 1~5번(고정 순서, 항목 순서대로 배정) */
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
const INK = "#15202B";

type Unit = "monthly" | "yearly";
type View = "overall" | "category";

const H = 260;
const PAD = { top: 12, right: 16, bottom: 28, left: 36 };

/** 완료된 모집건의 기부투명도지수 추이 — 월별/연별 × 종합/항목별 */
export function IndexTrendCard({ trend }: { trend: IndexTrend }) {
  const [unit, setUnit] = useState<Unit>("monthly");
  const [view, setView] = useState<View>("overall");
  const [hover, setHover] = useState<number | null>(null);
  // 강조할 계열(항목별 보기): 선·범례에 마우스를 올리면 그 선만 진하게
  const [active, setActive] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points: TrendPoint[] = trend[unit];
  const series =
    view === "overall"
      ? [{ id: "overall", name: "종합", color: SERIES[0], width: 2.5, values: points.map((p) => p.overall) }]
      : trend.categories.map((c, i) => ({ id: c.id, name: c.name, color: SERIES[i % SERIES.length], width: 2, values: points.map((p) => p.byCategory[c.id] ?? null) }));

  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + (1 - v / 100) * innerH;
  // 결측(null)에서 선을 끊음
  const pathOf = (vals: (number | null)[]) => {
    let d = "";
    let pen = false;
    vals.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  // x축 라벨이 겹치지 않게 간격 조절
  const step = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(innerW / 56))));
  const latest = points.length ? points[points.length - 1] : null;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left - PAD.left;
    if (px < -8 || px > innerW + 8) return setHover(null);
    const i = points.length <= 1 ? 0 : Math.round((px / innerW) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };
  const multi = series.length > 1;
  // 항목별 보기: 기본은 모든 선을 연하게, 강조 대상만 진하게
  const opacityOf = (id: string) => (!multi ? 1 : active === null ? 0.4 : active === id ? 1 : 0.15);

  return (
    <section className="rounded-xl border border-line bg-card">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-5">
        <h2 className="text-base font-bold">완료 모집건 <Term k="score" /> 추이</h2>
        <span className="hidden text-xs text-muted sm:inline">완료 {trend.campaigns.length}건 · 각 시점까지의 원장으로 다시 판정</span>
      </header>

      {/* 필터: 한 줄 */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-2.5">
        <Segmented
          label="기간 단위"
          value={unit}
          onChange={(v) => {
            setUnit(v);
            setHover(null);
          }}
          options={[
            ["monthly", "월별"],
            ["yearly", "연별"],
          ]}
        />
        <Segmented
          label="보기"
          value={view}
          onChange={setView}
          options={[
            ["overall", "종합"],
            ["category", "기부항목별"],
          ]}
        />
        {/* 범례: 2개 이상 계열일 때 */}
        {series.length > 1 && (
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {series.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onPointerEnter={() => setActive(s.id)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(s.id)}
                  onBlur={() => setActive(null)}
                  className={`inline-flex items-center gap-1.5 rounded px-1 py-0.5 ${active === s.id ? "font-semibold text-foreground" : ""}`}
                >
                  <span className="h-1 w-4 rounded-full" style={{ background: s.color, opacity: opacityOf(s.id) === 1 ? 1 : 0.6 }} aria-hidden="true" />
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {view === "overall" && latest?.overall != null && (
          <span className="ml-auto text-sm">
            최근 <span className="font-bold tnum">{latest.overall}점</span> <span className="text-xs text-muted">({latest.label})</span>
          </span>
        )}
      </div>

      <div ref={boxRef} className="relative px-2 py-3">
        <svg width={width} height={H} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={`${unit === "monthly" ? "월별" : "연별"} ${view === "overall" ? "종합" : "기부항목별"} 기부투명도지수 추이`} className="block">
          {/* 등급 구간 배경: 위반 <60 · 주의 60~79 · 양호 ≥80 */}
          <rect x={PAD.left} y={y(100)} width={innerW} height={y(80) - y(100)} fill="var(--color-ok-bg)" opacity="0.55" />
          <rect x={PAD.left} y={y(80)} width={innerW} height={y(60) - y(80)} fill="var(--color-warn-bg)" opacity="0.55" />
          <rect x={PAD.left} y={y(60)} width={innerW} height={y(0) - y(60)} fill="var(--color-bad-bg)" opacity="0.4" />
          {[0, 20, 40, 60, 80, 100].map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={PAD.left + innerW} y1={y(v)} y2={y(v)} stroke={v === 60 || v === 80 ? "#C9D1DC" : "#E9EDF3"} strokeWidth="1" />
              <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6B7787">
                {v}
              </text>
            </g>
          ))}
          <text x={PAD.left + innerW - 4} y={y(100) + 13} textAnchor="end" fontSize="10" fill="#6B7787">통과</text>
          <text x={PAD.left + innerW - 4} y={y(80) + 13} textAnchor="end" fontSize="10" fill="#6B7787">주의</text>
          <text x={PAD.left + innerW - 4} y={y(60) + 13} textAnchor="end" fontSize="10" fill="#6B7787">기준 초과</text>

          {points.map((p, i) =>
            i % step === 0 || i === points.length - 1 ? (
              <text key={p.key} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#6B7787">
                {p.label}
              </text>
            ) : null,
          )}

          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke={INK} strokeOpacity="0.35" strokeWidth="1" />}

          {/* 강조된 선을 맨 위에 그림 */}
          {[...series].sort((a, b) => (a.id === active ? 1 : 0) - (b.id === active ? 1 : 0)).map((s) => (
            <g key={s.id} style={{ opacity: opacityOf(s.id), transition: "opacity 150ms" }}>
              <path d={pathOf(s.values)} fill="none" stroke={s.color} strokeWidth={active === s.id ? s.width + 1 : s.width} strokeLinejoin="round" strokeLinecap="round" />
              {/* 선보다 넓은 투명 영역: 선에 마우스를 올리면 강조 */}
              {multi && (
                <path d={pathOf(s.values)} fill="none" stroke="transparent" strokeWidth="14" strokeLinejoin="round" onPointerEnter={() => setActive(s.id)} onPointerLeave={() => setActive(null)} />
              )}
              {/* 점이 적을 때(연별)는 표식 표시 */}
              {(unit === "yearly" || hover !== null) &&
                s.values.map((v, i) =>
                  v === null || (unit === "monthly" && i !== hover) ? null : (
                    <circle key={i} cx={x(i)} cy={y(v)} r="4.5" fill={s.color} stroke="#fff" strokeWidth="2" />
                  ),
                )}
            </g>
          ))}

        </svg>

        {hover !== null && points[hover] && (
          <div
            className="pointer-events-none absolute top-3 z-10 min-w-[150px] rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-lg"
            style={{ left: Math.min(width - 160, Math.max(8, x(hover) + 12)) }}
          >
            <div className="mb-1 font-semibold">{unit === "monthly" ? `20${points[hover].label.replace(".", "년 ")}월` : `${points[hover].label}년`}</div>
            {series.map((s) => (
              <div key={s.id} className={`flex items-center gap-2 ${multi && active !== null && active !== s.id ? "opacity-40" : ""}`}>
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                <span className="text-muted">{s.name}</span>
                <span className="ml-auto font-semibold tnum">{s.values[hover] === null ? "—" : `${s.values[hover]}점`}</span>
              </div>
            ))}
          </div>
        )}

        {/* 표 보기(화면낭독기). 표는 높이 제한을 무시하므로 sr-only는 감싸는 div에 줌 */}
        <div className="sr-only">
          <table>
            <caption>투명도 점수 추이</caption>
            <thead>
              <tr>
                <th>기간</th>
                {series.map((s) => (
                  <th key={s.id}>{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={p.key}>
                  <th>{p.label}</th>
                  {series.map((s) => (
                    <td key={s.id}>{s.values[i] ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="border-t border-line px-5 py-2 text-[11px] text-muted">
        종합은 그 시점에 진행 중이던 완료 모집건 지수를 기부받은 돈으로 가중 평균한 값입니다. 공개 이력은 마지막 공개일만 있어 그 이전은 주기대로 공개한 것으로 봅니다.
      </p>
    </section>
  );
}

function Segmented<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div role="group" aria-label={label} className="flex rounded-lg border border-line p-0.5 text-xs">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`rounded-md px-2.5 py-1 font-semibold ${value === v ? "bg-primary text-white" : "text-muted hover:text-primary"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
