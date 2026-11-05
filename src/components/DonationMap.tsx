"use client";

import Link from "next/link";
import { useMemo, useState, type KeyboardEvent } from "react";
import { ScoreBadge, StatusBadge } from "@/components/HealthBadge";
import { fmtDate, pct, won, wonShort } from "@/lib/format";
import map from "@/lib/korea-map.json";
import type { Sido } from "@/lib/regions";
import { aggregateIndex } from "@/lib/rules";
import { STAGES, type CampaignStatus, type HealthLevel, type Stage } from "@/lib/types";

export interface MapCampaign {
  id: string;
  title: string;
  region: string;
  organizer: string;
  status: CampaignStatus;
  stage: Stage;
  sidos: Sido[];
  category: string;
  goal: number;
  received: number;
  program: number;
  goalRate: number;
  startDate: string;
  endDate: string;
  score: number | null;
  level: HealthLevel;
}

const NATIONWIDE = "전국";
type Place = Sido | typeof NATIONWIDE;

const REGION_FILL = "#E9EDF2";
const REGION_HOVER = "#DCE2EA";
const SELECTED_FILL = "#A8DDF7";
const SELECTED_STROKE = "#3A9BD0";

/** 지역별 막대: 왼쪽부터 양호·주의·위반 순서 고정 */
const LEVELS: { level: HealthLevel; color: string }[] = [
  { level: "양호", color: "#2E9E6B" },
  { level: "주의", color: "#E5A212" },
  { level: "위반", color: "#D9483B" },
];
// 메인 카드에서 지도가 절반 크기로 줄어드므로, 글자·막대는 화면에서 읽히는 크기를 기준으로 잡음
const BAR_WIDTH = 15;
const BAR_GAP = 3;
const BAR_MAX_HEIGHT = 24;
const BAR_MIN_HEIGHT = 7;
const BAR_EMPTY_HEIGHT = 3;

const countLevel = (list: MapCampaign[], level: HealthLevel) => list.filter((c) => c.level === level).length;

export function DonationMap({ items }: { items: MapCampaign[] }) {
  const [stage, setStage] = useState<Stage>("진행중");
  const [selected, setSelected] = useState<Place | null>(null);
  const [hovered, setHovered] = useState<Sido | null>(null);
  // 좁은 화면 전용: 지역을 골라도 상세는 접힌 채로 시작 (넓은 화면은 오른쪽 카드 자리에 바로 펼침)
  const [expanded, setExpanded] = useState(false);

  const stageItems = useMemo(() => items.filter((c) => c.stage === stage), [items, stage]);
  const counts = useMemo(() => {
    const m = new Map<Place, MapCampaign[]>();
    for (const c of stageItems) {
      for (const p of c.sidos.length ? c.sidos : [NATIONWIDE as Place]) m.set(p, [...(m.get(p) ?? []), c]);
    }
    return m;
  }, [stageItems]);
  const listOf = (p: Place) => counts.get(p) ?? [];
  // 진행 예정은 판정 대상이 아니므로 막대 대신 건수만 표시
  const judged = stage !== "진행 예정";
  const maxBar = Math.max(1, ...map.regions.flatMap((r) => LEVELS.map(({ level }) => countLevel(listOf(r.id as Sido), level))));
  const summaryOf = (id: Sido) => {
    const list = listOf(id);
    return judged ? LEVELS.map(({ level }) => `${level} ${countLevel(list, level)}건`).join(" · ") : `${stage} ${list.length}건`;
  };
  const nationwide = listOf(NATIONWIDE).length;

  const toggle = (p: Place) => {
    setSelected((cur) => (cur === p ? null : p));
    setExpanded(false);
  };
  const onKey = (e: KeyboardEvent, p: Place) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    toggle(p);
  };
  const hoverRegion = map.regions.find((r) => r.id === hovered);
  const placeName = selected === NATIONWIDE ? "전국 단위 모집건" : (map.regions.find((r) => r.id === selected)?.name ?? "");

  return (
    <section className="relative flex h-full flex-col rounded-xl border border-line bg-card">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-5">
        <h2 className="text-base font-bold">기부 지도</h2>
        <button
          type="button"
          onClick={() => toggle(NATIONWIDE)}
          aria-pressed={selected === NATIONWIDE}
          className={`ml-auto rounded-md border px-2.5 py-1 text-sm font-semibold ${selected === NATIONWIDE ? "border-foreground bg-[#F3F5F8]" : "border-line hover:bg-[#F3F5F8]"}`}
        >
          전국 단위 <span className="tnum">{nationwide}</span>건
        </button>
      </header>
      <nav className="flex shrink-0 gap-1 border-b border-line px-3 py-2" aria-label="진행상황">
        {STAGES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStage(s)}
            aria-pressed={stage === s}
            className={`flex-1 rounded-md px-2 py-1 text-sm font-semibold ${stage === s ? "bg-primary text-white" : "text-muted hover:bg-primary-soft hover:text-primary"}`}
          >
            {s} <span className="tnum">{items.filter((c) => c.stage === s).length}</span>
          </button>
        ))}
      </nav>

      {/* 상세: 넓은 화면은 오른쪽 "지금 확인이 필요한 모집건" 카드 자리를 덮고, 좁은 화면은 지도 위를 덮음. 넘치면 안에서 스크롤 */}
      <div className="relative min-h-0 flex-1 xl:static">
        <div inert={expanded} className="h-full p-2 [container-type:size]">
          {/* 지도 비율을 지키며 칸에 맞춘 상자: 말풍선 위치(%)가 지도와 어긋나지 않게 함 */}
          <div className="relative mx-auto" style={{ aspectRatio: `${map.width} / ${map.height}`, width: `min(100cqw, ${(map.width / map.height) * 100}cqh)` }}>
          <svg viewBox={`0 0 ${map.width} ${map.height}`} className="block h-full w-full" role="group" aria-label={`시·도별 ${stage} 모집건 지도`}>
            {/* 울릉도·독도 네모칸 (섬은 경북 경로의 일부라 눌러도 경북이 선택됨) */}
            <rect x={map.inset.x} y={map.inset.y} width={map.inset.width} height={map.inset.height} rx="6" fill="#F7F8FA" stroke="#C9D1DC" />
            {map.regions.map((r) => {
              const id = r.id as Sido;
              const active = selected === id;
              return (
                <path
                  key={id}
                  d={r.path}
                  fill={active ? SELECTED_FILL : hovered === id ? REGION_HOVER : REGION_FILL}
                  fillRule="evenodd"
                  stroke="#FFFFFF"
                  strokeWidth={1}
                  strokeLinejoin="round"
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={`${r.name} ${stage} ${listOf(id).length}건${judged ? `, ${summaryOf(id)}` : ""}`}
                  onClick={() => toggle(id)}
                  onKeyDown={(e) => onKey(e, id)}
                  onPointerEnter={() => setHovered(id)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setHovered(id)}
                  onBlur={() => setHovered(null)}
                  className="cursor-pointer outline-none"
                />
              );
            })}
            {/* 선택·강조된 경계가 이웃 지역에 가리지 않도록 다시 그림 */}
            {map.regions
              .filter((r) => r.id === selected)
              .map((r) => (
                <path key={r.id} d={r.path} fill="none" stroke={SELECTED_STROKE} strokeWidth={1.8} strokeLinejoin="round" pointerEvents="none" />
              ))}
            {map.inset.labels.map((l) => (
              <text key={l.name} x={l.x} y={l.y} fontSize="19" fontWeight="600" textAnchor="middle" fill="#5B6B7F" pointerEvents="none">{l.name}</text>
            ))}
            {map.regions.map((r) => {
              const list = listOf(r.id as Sido);
              const baseY = r.labelY + 36;
              return (
                <g key={r.id} pointerEvents="none">
                  <text x={r.labelX} y={r.labelY - 12} fontSize="23" fontWeight="600" textAnchor="middle" fill="#15202B" stroke="#FFFFFF" strokeWidth="3" paintOrder="stroke" strokeLinejoin="round">{r.id}</text>
                  {judged ? (
                    // 해당 건이 없는 지역은 막대를 그리지 않음
                    list.length > 0 && LEVELS.map(({ level, color }, i) => {
                      const n = countLevel(list, level);
                      const h = n ? Math.max(BAR_MIN_HEIGHT, (n / maxBar) * BAR_MAX_HEIGHT) : BAR_EMPTY_HEIGHT;
                      const x = r.labelX + (i - 1) * (BAR_WIDTH + BAR_GAP);
                      return (
                        <g key={level}>
                          <rect x={x - BAR_WIDTH / 2} y={baseY - h} width={BAR_WIDTH} height={h} rx="1.5" fill={n ? color : "#B7C0CC"} />
                          <text x={x} y={baseY - h - 2} fontSize="18" fontWeight="700" textAnchor="middle" fill="#15202B" stroke="#FFFFFF" strokeWidth="2.5" paintOrder="stroke" className="tnum">{n}</text>
                        </g>
                      );
                    })
                  ) : (
                    list.length > 0 && <text x={r.labelX} y={r.labelY + 18} fontSize="26" fontWeight="800" textAnchor="middle" fill="#15202B" stroke="#FFFFFF" strokeWidth="3" paintOrder="stroke" className="tnum">{list.length}</text>
                  )}
                </g>
              );
            })}
          </svg>
          {hoverRegion && (
            <div
              role="status"
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 text-xs text-white shadow-lg"
              style={{ left: `${(hoverRegion.labelX / map.width) * 100}%`, top: `calc(${(hoverRegion.labelY / map.height) * 100}% - 14px)` }}
            >
              <span className="font-semibold">{hoverRegion.name}</span> · <span className="tnum">{summaryOf(hoverRegion.id as Sido)}</span>
            </div>
          )}
          </div>
        </div>

        {selected && (
          <aside key={selected} aria-label={`${placeName} 상세`} className={`sheet-open absolute inset-0 z-20 flex-col bg-card xl:-inset-y-px xl:left-[calc(100%+1.5rem+1px)] xl:right-auto xl:flex xl:w-[calc(100%+2px)] xl:overflow-hidden xl:rounded-xl xl:border xl:border-line xl:shadow-lg ${expanded ? "flex" : "hidden"}`}>
            <PlaceDetail place={selected} name={placeName} stage={stage} list={listOf(selected)} onClose={() => toggle(selected)} />
          </aside>
        )}
      </div>

      {/* 좁은 화면: 범례 자리에 접힌 상세가 들어옴. 높이를 고정해 지역을 눌러도 지도가 움직이지 않게 함 */}
      {selected && (
        <div className="flex h-16 shrink-0 items-center gap-2 rounded-b-xl border-t border-line bg-[#F7F8FA] pl-2 pr-3 xl:hidden">
          <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-lg px-3 text-left hover:bg-[#E9EDF3]">
            <span className="min-w-0 flex-1 truncate text-sm">
              <span className="font-bold">{placeName}</span> <span className="text-muted">{stage} <span className="font-semibold text-foreground tnum">{listOf(selected).length}</span>건</span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-primary">{expanded ? "접기" : "펼치기"}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className={`shrink-0 text-primary transition-transform ${expanded ? "rotate-180" : ""}`}>
              <path d="M3 9l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" onClick={() => toggle(selected)} className="shrink-0 rounded-md border border-line bg-card px-2.5 py-1 text-xs text-muted hover:bg-[#F3F5F8]">
            닫기
          </button>
        </div>
      )}
      <footer className={`h-16 shrink-0 flex-col justify-center gap-1 rounded-b-xl border-t border-line px-5 text-xs text-muted xl:flex ${selected ? "hidden" : "flex"}`}>
          <div className="flex items-center gap-x-3">
            {judged ? (
              <>
                {LEVELS.map(({ level, color }) => (
                  <span key={level} className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-sm" style={{ background: color }} aria-hidden="true" /> {level}
                  </span>
                ))}
                <span>막대 높이 = 건수</span>
              </>
            ) : (
              <span>숫자 = 진행 예정 건수 (모집 시작 후 판정)</span>
            )}
          </div>
          <p className="truncate">여러 지역 모집건은 각 지역에 모두 셈 · 경계 자료: 통계청 2018</p>
      </footer>
    </section>
  );
}

function PlaceDetail({ place, name, stage, list, onClose }: { place: Place; name: string; stage: Stage; list: MapCampaign[]; onClose: () => void }) {
  const received = list.reduce((a, c) => a + c.received, 0);
  const program = list.reduce((a, c) => a + c.program, 0);
  const avg = aggregateIndex(list.flatMap((c) => (c.score === null ? [] : [{ score: c.score, weight: c.received }])));
  return (
    <>
      {/* 좁은 화면은 접힌 바가 제목과 닫기를 대신함 */}
      <header className="hidden h-14 shrink-0 items-center gap-2 border-b border-line px-5 xl:flex">
        <h2 className="min-w-0 truncate text-base font-bold">{name}</h2>
        <span className="shrink-0 text-sm text-muted">{stage} <span className="font-semibold text-foreground tnum">{list.length}</span>건</span>
        <button type="button" onClick={onClose} className="ml-auto shrink-0 rounded-md border border-line px-2.5 py-1 text-xs text-muted hover:bg-[#F3F5F8]">
          닫기
        </button>
      </header>
      {list.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted">{name}에는 {stage} 모집건이 없습니다.</p>
      ) : (
        <>
          <dl className="grid shrink-0 grid-cols-3 gap-2 border-b border-line px-5 py-3 text-center">
            <Stat label="기부받은 돈" value={wonShort(received)} />
            <Stat label="기부됨" value={wonShort(program)} />
            <Stat label="평균 지수" value={avg === null ? "—" : `${avg}점`} />
          </dl>
          {place !== NATIONWIDE && list.some((c) => c.sidos.length > 1) && <p className="shrink-0 border-b border-line bg-[#F7F8FA] px-5 py-2 text-xs text-muted">금액에는 다른 지역에 걸친 모집건의 전체 금액이 포함됩니다.</p>}
          <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
            {list.map((c) => (
              <CampaignRow key={c.id} c={c} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold tnum">{value}</dd>
    </div>
  );
}

function CampaignRow({ c }: { c: MapCampaign }) {
  const rate = c.goalRate;
  return (
    <li className="px-5 py-3.5">
      <div className="flex items-center gap-2">
        <StatusBadge status={c.status} />
        <Link href={`/campaigns/${c.id}`} className="min-w-0 flex-1 truncate font-semibold hover:text-primary">
          {c.title}
        </Link>
        <ScoreBadge score={c.score} level={c.level} />
      </div>
      <p className="mt-1 truncate text-xs text-muted">
        {c.region} · {c.category} · {c.organizer}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E9EDF3]" role="img" aria-label={`목표 대비 ${pct(rate, 0)}`}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, rate * 100)}%` }} />
      </div>
      <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs text-muted tnum">
        <span>{won(c.received)} / 목표 {wonShort(c.goal)} ({pct(rate, 0)})</span>
        <span>{fmtDate(c.startDate)} ~ {fmtDate(c.endDate)}</span>
      </div>
    </li>
  );
}
