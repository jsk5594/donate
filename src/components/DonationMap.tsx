"use client";

import Link from "next/link";
import { useMemo, useState, type KeyboardEvent } from "react";
import { ScoreBadge } from "@/components/HealthBadge";
import { fmtDate, pct, won, wonShort } from "@/lib/format";
import map from "@/lib/korea-map.json";
import type { Sido } from "@/lib/regions";
import { aggregateIndex } from "@/lib/rules";
import type { CampaignStatus, HealthLevel } from "@/lib/types";

/** 재난 피해지 긴급 모금 지도 — 재난·재해 모집건만 표시 */
export interface MapCampaign {
  id: string;
  title: string;
  region: string;
  organizer: string;
  purpose: string;
  status: CampaignStatus;
  sidos: Sido[];
  goal: number;
  received: number;
  program: number;
  spent: number; // 지금까지 쓴 돈(수혜자에게 간 돈 + 운영비 + 모금에 쓴 돈)
  balance: number; // 남은 돈
  goalRate: number;
  startDate: string;
  endDate: string;
  daysLeft: number; // 모집 마감까지 남은 날(서버 기준)
  score: number | null;
  level: HealthLevel;
}

/** 재난 단계: 모금 중 → 모금 끝·기부금 쓰는 중 → 다 쓰고 정산 완료 */
export const PHASES = ["도움 필요", "복구 진행", "복구 완료"] as const;
export type Phase = (typeof PHASES)[number];
export function phaseOf(status: CampaignStatus): Phase {
  if (status === "예정" || status === "모집중") return "도움 필요";
  if (status === "완료") return "복구 완료";
  return "복구 진행";
}

/** 얼마나 급한가(도움 필요 단계만): 모금률과 마감까지 남은 날로 판단 */
type Urgency = "긴급" | "필요" | "안정";
const URGENCY: { key: Urgency; color: string; tint: string; rule: string }[] = [
  { key: "긴급", color: "#D9483B", tint: "#F9D3CE", rule: "모금률 50% 미만 또는 마감 7일 이내" },
  { key: "필요", color: "#E5A212", tint: "#FBE7BD", rule: "모금률 50~90%" },
  { key: "안정", color: "#2E9E6B", tint: "#CFEBDC", rule: "모금률 90% 이상" },
];
const URGENCY_OF = Object.fromEntries(URGENCY.map((u) => [u.key, u])) as Record<Urgency, (typeof URGENCY)[number]>;
function urgencyOf(c: MapCampaign): Urgency {
  if (c.goalRate < 0.5 || c.daysLeft <= 7) return "긴급";
  if (c.goalRate < 0.9) return "필요";
  return "안정";
}
const PHASE_TONE: Record<Exclude<Phase, "도움 필요">, { color: string; tint: string }> = {
  "복구 진행": { color: "#E58A12", tint: "#FBE2C4" },
  "복구 완료": { color: "#2E9E6B", tint: "#CFEBDC" },
};

/** 재난 종류: 모집건 이름에서 판단 */
const KINDS: { re: RegExp; icon: string; name: string }[] = [
  { re: /홍수|호우|폭우|침수/, icon: "💧", name: "홍수·호우" },
  { re: /산불|화재/, icon: "🔥", name: "산불" },
  { re: /지진/, icon: "🏚️", name: "지진" },
  { re: /태풍/, icon: "🌀", name: "태풍" },
  { re: /폭설|한파/, icon: "❄️", name: "폭설" },
];
const kindOf = (c: MapCampaign) => KINDS.find((k) => k.re.test(c.title)) ?? { icon: "⚠️", name: "재난" };

const shortageOf = (c: MapCampaign) => Math.max(0, c.goal - c.received);
const dday = (n: number) => (n > 0 ? `마감 D-${n}` : n === 0 ? "오늘 마감" : "모집 마감");

const NATIONWIDE = "전국";
type Place = Sido | typeof NATIONWIDE;

const REGION_FILL = "#ECEFF3";
const REGION_HOVER = "#DCE2EA";
const SELECTED_STROKE = "#15202B";

export function DonationMap({ items }: { items: MapCampaign[] }) {
  const [phase, setPhase] = useState<Phase>("도움 필요");
  const [selected, setSelected] = useState<Place | null>(null);
  const [hovered, setHovered] = useState<Sido | null>(null);
  // 좁은 화면 전용: 지역을 골라도 상세는 접힌 채로 시작 (넓은 화면은 오른쪽 카드 자리에 바로 펼침)
  const [expanded, setExpanded] = useState(false);

  const phaseItems = useMemo(() => items.filter((c) => phaseOf(c.status) === phase), [items, phase]);
  const counts = useMemo(() => {
    const m = new Map<Place, MapCampaign[]>();
    for (const c of phaseItems) {
      for (const p of c.sidos.length ? c.sidos : [NATIONWIDE as Place]) m.set(p, [...(m.get(p) ?? []), c]);
    }
    // 급한 순서(도움 필요) 또는 최근 순서로 정렬
    for (const [p, list] of m) m.set(p, sortList(list, phase));
    return m;
  }, [phaseItems, phase]);
  const listOf = (p: Place) => counts.get(p) ?? [];
  const help = phase === "도움 필요";
  const maxShortage = Math.max(1, ...phaseItems.map(shortageOf));
  const nationwide = items.filter((c) => c.sidos.length === 0).length;
  const helpCount = items.filter((c) => phaseOf(c.status) === "도움 필요").length;

  /** 지역 대표 색: 도움 필요는 가장 급한 건 기준, 그 외는 단계 색 */
  const toneOf = (list: MapCampaign[]) => {
    if (!list.length) return null;
    if (help) return URGENCY_OF[URGENCY.find((u) => list.some((c) => urgencyOf(c) === u.key))!.key];
    return PHASE_TONE[phase];
  };
  const summaryOf = (list: MapCampaign[]) => {
    if (!list.length) return `${phase} 없음`;
    if (help) return `${list.length}건 · 모자란 금액 ${wonShort(list.reduce((a, c) => a + shortageOf(c), 0))}`;
    if (phase === "복구 진행") return `${list.length}건 · 남은 돈 ${wonShort(list.reduce((a, c) => a + c.balance, 0))}`;
    return `${list.length}건 · 수혜자에게 간 돈 ${wonShort(list.reduce((a, c) => a + c.program, 0))}`;
  };
  const headline = (() => {
    const n = phaseItems.length;
    if (help) return <>도움이 필요한 재난 <b className="text-foreground tnum">{n}</b>건 · 아직 모자란 금액 <b className="text-risk-ink tnum">{wonShort(phaseItems.reduce((a, c) => a + shortageOf(c), 0))}</b></>;
    if (phase === "복구 진행") return <>복구 중인 재난 <b className="text-foreground tnum">{n}</b>건 · 아직 쓰지 않은 남은 돈 <b className="text-foreground tnum">{wonShort(phaseItems.reduce((a, c) => a + c.balance, 0))}</b></>;
    return <>복구를 마친 재난 <b className="text-foreground tnum">{n}</b>건 · 수혜자에게 간 돈 <b className="text-foreground tnum">{wonShort(phaseItems.reduce((a, c) => a + c.program, 0))}</b></>;
  })();

  const toggle = (p: Place) => {
    setSelected((cur) => (cur === p ? null : p));
    setExpanded(false);
  };
  const changePhase = (p: Phase) => {
    setPhase(p);
    setSelected(null);
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
    <section className={`relative flex h-full flex-col rounded-xl border border-[#E59A90] bg-card ${helpCount > 0 ? "urgent-glow" : ""}`}>
      {/* 긴급함 강조: 붉은 테두리 + 바깥 빛(테두리 두께는 그대로 두어 옆 카드 위 상세 창 위치가 어긋나지 않게 함) */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-5">
        <h2 className="min-w-0 truncate text-base font-bold">재난 피해지 긴급 모금 지도</h2>
        {/* 지금 모금 중인 재난 건수 — 제목에 '재난'이 있으므로 항목 대신 급한 건수를 표시 */}
        {helpCount > 0 && <span className="shrink-0 whitespace-nowrap rounded-full bg-[#D9483B] px-2 py-0.5 text-xs font-bold text-white">도움 필요 {helpCount}건</span>}
        {nationwide > 0 && (
          <button
            type="button"
            onClick={() => toggle(NATIONWIDE)}
            aria-pressed={selected === NATIONWIDE}
            className={`ml-auto rounded-md border px-2.5 py-1 text-sm font-semibold ${selected === NATIONWIDE ? "border-foreground bg-[#F3F5F8]" : "border-line hover:bg-[#F3F5F8]"}`}
          >
            전국 단위 <span className="tnum">{listOf(NATIONWIDE).length}</span>건
          </button>
        )}
      </header>
      <nav className="flex shrink-0 gap-1 border-b border-line px-3 py-2" aria-label="재난 단계">
        {PHASES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => changePhase(p)}
            aria-pressed={phase === p}
            className={`flex-1 whitespace-nowrap rounded-md px-2 py-1 text-sm font-semibold ${phase === p ? "bg-primary text-white" : "text-muted hover:bg-primary-soft hover:text-primary"}`}
          >
            {p} <span className="tnum">{items.filter((c) => phaseOf(c.status) === p).length}</span>
          </button>
        ))}
      </nav>
      <p className="shrink-0 truncate border-b border-line bg-[#F7F8FA] px-5 py-2 text-xs text-muted" aria-live="polite">
        {headline}
      </p>

      {/* 상세: 넓은 화면은 오른쪽 "투명도 확인이 필요한 모집건" 카드 자리를 덮고, 좁은 화면은 지도 위를 덮음. 넘치면 안에서 스크롤 */}
      <div className="relative min-h-0 flex-1 xl:static">
        <div inert={expanded} className="h-full p-2 [container-type:size]">
          {/* 지도 비율을 지키며 칸에 맞춘 상자: 말풍선 위치(%)가 지도와 어긋나지 않게 함 */}
          <div className="relative mx-auto" style={{ aspectRatio: `${map.width} / ${map.height}`, width: `min(100cqw, ${(map.width / map.height) * 100}cqh)` }}>
            <svg viewBox={`0 0 ${map.width} ${map.height}`} className="block h-full w-full" role="group" aria-label={`시·도별 재난 모집건 지도 (${phase})`}>
              {/* 울릉도·독도 네모칸 (섬은 경북 경로의 일부라 눌러도 경북이 선택됨) */}
              <rect x={map.inset.x} y={map.inset.y} width={map.inset.width} height={map.inset.height} rx="6" fill="#F7F8FA" stroke="#C9D1DC" />
              {map.regions.map((r) => {
                const id = r.id as Sido;
                const list = listOf(id);
                const tone = toneOf(list);
                const active = selected === id;
                return (
                  <path
                    key={id}
                    d={r.path}
                    fill={tone ? tone.tint : hovered === id ? REGION_HOVER : REGION_FILL}
                    fillOpacity={tone && hovered === id ? 0.8 : 1}
                    fillRule="evenodd"
                    stroke="#FFFFFF"
                    strokeWidth={1}
                    strokeLinejoin="round"
                    role="button"
                    tabIndex={0}
                    aria-pressed={active}
                    aria-label={`${r.name} ${summaryOf(list)}`}
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
              {/* 선택된 경계가 이웃 지역에 가리지 않도록 다시 그림 */}
              {map.regions
                .filter((r) => r.id === selected)
                .map((r) => (
                  <path key={r.id} d={r.path} fill="none" stroke={SELECTED_STROKE} strokeWidth={2} strokeLinejoin="round" pointerEvents="none" />
                ))}
              {map.inset.labels.map((l) => (
                <text key={l.name} x={l.x} y={l.y} fontSize="19" fontWeight="600" textAnchor="middle" fill="#5B6B7F" pointerEvents="none">{l.name}</text>
              ))}
              {map.regions.map((r) => {
                const list = listOf(r.id as Sido);
                const tone = toneOf(list);
                const cy = r.labelY + 26;
                // 원 크기: 도움 필요는 모자란 금액, 그 외는 고정
                const radius = help ? 13 + 13 * Math.sqrt(list.reduce((a, c) => a + shortageOf(c), 0) / maxShortage) : 14;
                return (
                  <g key={r.id} pointerEvents="none">
                    <text x={r.labelX} y={r.labelY - 12} fontSize="23" fontWeight="600" textAnchor="middle" fill={tone ? "#15202B" : "#7A8799"} stroke="#FFFFFF" strokeWidth="3" paintOrder="stroke" strokeLinejoin="round">{r.id}</text>
                    {tone && (
                      <>
                        {/* 도움 필요: 퍼지는 원(움직임 줄이기 설정이면 멈춤) */}
                        {help && <circle cx={r.labelX} cy={cy} r={radius} fill={tone.color} className="map-pulse" />}
                        <circle cx={r.labelX} cy={cy} r={radius} fill={tone.color} fillOpacity={help ? 0.9 : 0.85} stroke="#FFFFFF" strokeWidth="2.5" />
                        <text x={r.labelX} y={cy + 7} fontSize="19" textAnchor="middle">{kindOf(list[0]).icon}</text>
                        {list.length > 1 && (
                          <g>
                            <circle cx={r.labelX + radius * 0.8} cy={cy - radius * 0.8} r="11" fill="#15202B" stroke="#FFFFFF" strokeWidth="2" />
                            <text x={r.labelX + radius * 0.8} y={cy - radius * 0.8 + 5.5} fontSize="15" fontWeight="700" textAnchor="middle" fill="#FFFFFF" className="tnum">{list.length}</text>
                          </g>
                        )}
                      </>
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
                <span className="font-semibold">{hoverRegion.name}</span> · <span className="tnum">{summaryOf(listOf(hoverRegion.id as Sido))}</span>
              </div>
            )}
          </div>
        </div>

        {selected && (
          <aside key={`${phase}-${selected}`} aria-label={`${placeName} 상세`} className={`sheet-open absolute inset-0 z-20 flex-col bg-card xl:-inset-y-px xl:left-[calc(100%+1.5rem+1px)] xl:right-auto xl:flex xl:w-[calc(100%+2px)] xl:overflow-hidden xl:rounded-xl xl:border xl:border-line xl:shadow-lg ${expanded ? "flex" : "hidden"}`}>
            <PlaceDetail place={selected} name={placeName} phase={phase} list={listOf(selected)} onClose={() => toggle(selected)} />
          </aside>
        )}
      </div>

      {/* 좁은 화면: 범례 자리에 접힌 상세가 들어옴. 높이를 고정해 지역을 눌러도 지도가 움직이지 않게 함 */}
      {selected && (
        <div className="flex h-16 shrink-0 items-center gap-2 rounded-b-xl border-t border-line bg-[#F7F8FA] pl-2 pr-3 xl:hidden">
          <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-lg px-3 text-left hover:bg-[#E9EDF3]">
            <span className="min-w-0 flex-1 truncate text-sm">
              <span className="font-bold">{placeName}</span> <span className="text-muted">{phase} <span className="font-semibold text-foreground tnum">{listOf(selected).length}</span>건</span>
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
        <div className="flex items-center gap-x-3 whitespace-nowrap">
          {help ? (
            <>
              {URGENCY.map((u) => (
                <span key={u.key} className="flex items-center gap-1.5" title={u.rule}>
                  <span className="h-3 w-3 rounded-full" style={{ background: u.color }} aria-hidden="true" /> {u.key}
                </span>
              ))}
              <span>원 크기 = 모자란 금액</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full" style={{ background: PHASE_TONE[phase].color }} aria-hidden="true" /> {phase}
              </span>
              <span>숫자 = 건수 · 아이콘 = 재난 종류</span>
            </>
          )}
        </div>
        <p className="truncate">{help ? "긴급: 모금률 50% 미만 또는 마감 7일 이내 · 필요: 50~90%" : "지역을 누르면 기부금이 어떻게 쓰였는지 보입니다"}</p>
      </footer>
    </section>
  );
}

function sortList(list: MapCampaign[], phase: Phase) {
  if (phase === "도움 필요") {
    const rank = (c: MapCampaign) => URGENCY.findIndex((u) => u.key === urgencyOf(c));
    return [...list].sort((a, b) => rank(a) - rank(b) || a.daysLeft - b.daysLeft);
  }
  return [...list].sort((a, b) => b.endDate.localeCompare(a.endDate));
}

function PlaceDetail({ place, name, phase, list, onClose }: { place: Place; name: string; phase: Phase; list: MapCampaign[]; onClose: () => void }) {
  const received = list.reduce((a, c) => a + c.received, 0);
  const avg = aggregateIndex(list.flatMap((c) => (c.score === null ? [] : [{ score: c.score, weight: c.received }])));
  const second: [string, string] =
    phase === "도움 필요"
      ? ["모자란 금액", wonShort(list.reduce((a, c) => a + shortageOf(c), 0))]
      : phase === "복구 진행"
        ? ["남은 돈", wonShort(list.reduce((a, c) => a + c.balance, 0))]
        : ["수혜자에게 간 돈", wonShort(list.reduce((a, c) => a + c.program, 0))];
  return (
    <>
      {/* 좁은 화면은 접힌 바가 제목과 닫기를 대신함 */}
      <header className="hidden h-14 shrink-0 items-center gap-2 border-b border-line px-5 xl:flex">
        <h2 className="min-w-0 truncate text-base font-bold">{name}</h2>
        <span className="shrink-0 text-sm text-muted">{phase} <span className="font-semibold text-foreground tnum">{list.length}</span>건</span>
        <button type="button" onClick={onClose} className="ml-auto shrink-0 rounded-md border border-line px-2.5 py-1 text-xs text-muted hover:bg-[#F3F5F8]">
          닫기
        </button>
      </header>
      {list.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted">{name}에는 {phase} 단계의 재난 모집건이 없습니다.</p>
      ) : (
        <>
          <dl className="grid shrink-0 grid-cols-3 gap-2 border-b border-line px-5 py-3 text-center">
            <Stat label="기부받은 돈" value={wonShort(received)} />
            <Stat label={second[0]} value={second[1]} />
            <Stat label="평균 투명도 점수" value={avg === null ? "—" : `${avg}점`} />
          </dl>
          {place !== NATIONWIDE && list.some((c) => c.sidos.length > 1) && <p className="shrink-0 border-b border-line bg-[#F7F8FA] px-5 py-2 text-xs text-muted">금액에는 다른 지역에 걸친 모집건의 전체 금액이 포함됩니다.</p>}
          <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
            {list.map((c) => (
              <CampaignRow key={c.id} c={c} phase={phase} />
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
      <dt className="whitespace-nowrap text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold tnum">{value}</dd>
    </div>
  );
}

function CampaignRow({ c, phase }: { c: MapCampaign; phase: Phase }) {
  const kind = kindOf(c);
  const u = phase === "도움 필요" ? URGENCY_OF[urgencyOf(c)] : null;
  const usedRate = c.received ? c.spent / c.received : 0;
  // 1만원이면: 지금까지 쓴 돈 중 수혜자에게 간 비율로 계산
  const perTen = c.spent > 0 ? Math.round((10000 * c.program) / c.spent / 10) * 10 : null;
  const bar = phase === "도움 필요" ? c.goalRate : phase === "복구 진행" ? usedRate : 1;
  const barColor = u ? u.color : PHASE_TONE[phase as Exclude<Phase, "도움 필요">].color;
  return (
    <li className="px-5 py-3.5">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-base" title={kind.name} aria-label={kind.name}>{kind.icon}</span>
        <Link href={`/campaigns/${c.id}`} className="min-w-0 flex-1 truncate font-semibold hover:text-primary">
          {c.title}
        </Link>
        <ScoreBadge score={c.score} level={c.level} />
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
        {u ? (
          <span className="shrink-0 rounded-full px-2 py-0.5 font-bold text-white" style={{ background: u.color }} title={u.rule}>{u.key}</span>
        ) : (
          <span className="shrink-0 rounded-full px-2 py-0.5 font-semibold" style={{ background: PHASE_TONE[phase as Exclude<Phase, "도움 필요">].tint, color: "#15202B" }}>{phase}</span>
        )}
        <span className="min-w-0 truncate">{c.region} · {c.organizer}</span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs text-foreground/80">{c.purpose}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E9EDF3]" role="img" aria-label={phase === "도움 필요" ? `목표 대비 모금 ${pct(c.goalRate, 0)}` : `기부금 사용 ${pct(usedRate, 0)}`}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, bar * 100)}%`, background: barColor }} />
      </div>
      <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs text-muted tnum">
        {phase === "도움 필요" ? (
          <>
            <span>모금 {pct(c.goalRate, 0)} · 모자란 금액 <b className="text-foreground">{won(shortageOf(c))}</b></span>
            <span className={c.daysLeft <= 7 ? "font-bold text-[#B3372C]" : ""}>{dday(c.daysLeft)}</span>
          </>
        ) : phase === "복구 진행" ? (
          <>
            <span>기부금 {pct(usedRate, 0)} 사용 · 남은 돈 {wonShort(c.balance)}</span>
            <span>{fmtDate(c.startDate)} 모집 시작</span>
          </>
        ) : (
          <>
            <span>수혜자에게 간 돈 {won(c.program)}</span>
            <span>{fmtDate(c.endDate)} 모집 마감</span>
          </>
        )}
      </div>
      <p className="mt-1.5 rounded-md bg-[#F7F8FA] px-2.5 py-1.5 text-xs">
        {perTen === null ? (
          <span className="text-muted">아직 쓴 돈이 없어 1만원당 전달액은 집행이 시작되면 보입니다.</span>
        ) : (
          <>
            기부금 <b>1만원</b>이면 수혜자에게 <b className="text-primary tnum">{perTen.toLocaleString()}원</b>이 갑니다 <span className="text-muted">(지금까지 쓴 돈 기준)</span>
          </>
        )}
      </p>
    </li>
  );
}
