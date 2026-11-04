/**
 * 기능 2 — 메인 페이지 챗봇(기부 도우미)
 * 1) 질문에서 기부코드·모집건·주관기관을 찾아 원장에서 필요한 데이터만 조회(가명처리된 Public 데이터만)
 * 2) AI는 그 데이터(컨텍스트)만 근거로 답변 — 데이터에 없으면 모른다고 답함
 * 3) 키가 없으면 같은 컨텍스트로 데모 답변
 */

import { fmtDate, pct, won, wonShort } from "../format";
import { ORGANIZATIONS } from "../org-data";
import { getRepository, type MyDonationsResult, type Overview } from "../repository";
import { POLICY } from "../rules";
import type { CampaignSummary } from "../types";
import { generate, type ChatTurn } from "./client";
import { DEMO_ENGINE, type EngineInfo } from "./config";
import { computeOrgMetrics, gradeOf } from "./org-audit";

export interface ChatLink {
  label: string;
  href: string;
}

export interface ChatReply {
  reply: string;
  links: ChatLink[];
  engine: EngineInfo;
}

const CODE_RE = /D-?[0-9A-F]{4}\b/i;

/** 모집건 제목의 첫 단어(지명·대상)로 언급 여부 판단 */
function mentionedCampaigns(text: string, all: CampaignSummary[]): CampaignSummary[] {
  return all.filter((s) => {
    const key = s.campaign.title.split(" ")[0];
    return text.includes(key) || text.includes(s.campaign.title);
  });
}

function mentionedOrgs(text: string) {
  return ORGANIZATIONS.filter((o) => {
    const core = o.name.replace(/\(가상\)/, "").trim();
    return text.includes(core) || text.includes(core.slice(0, 4));
  });
}

interface Context {
  myDonations?: MyDonationsResult | null;
  donorCode?: string;
  campaigns: CampaignSummary[];
  orgs: Awaited<ReturnType<typeof orgContext>>[];
  overview: Overview;
}

async function orgContext(org: (typeof ORGANIZATIONS)[number], overview: Overview) {
  const m = await computeOrgMetrics(org, overview.campaigns);
  return { id: org.id, name: org.name, grade: gradeOf(m.indicatorScore), score: m.indicatorScore, avgProgram: m.avgProgram, latestAdmin: m.latestAdmin, overCap: m.fundraisingOverCapYears, maxDelay: m.maxDelay, issues: org.issues.map((i) => `${i.year} ${i.title}`) };
}

async function buildContext(messages: ChatTurn[]): Promise<Context> {
  const repo = getRepository();
  const overview = await repo.getOverview();
  const userText = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");
  const latest = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  // 기부코드는 대화 전체에서 가장 최근 것을 기억
  const codes = [...userText.matchAll(new RegExp(CODE_RE, "gi"))].map((m) => m[0].toUpperCase().replace(/^D-?/, "D-"));
  const donorCode = codes.at(-1);
  const myDonations = donorCode ? await repo.findMyDonations(donorCode) : undefined;
  const orgs = await Promise.all(mentionedOrgs(latest).map((o) => orgContext(o, overview)));
  return { donorCode, myDonations, campaigns: mentionedCampaigns(latest, overview.campaigns), orgs, overview };
}

function contextForPrompt(c: Context) {
  return {
    전체현황: {
      모집건수: c.overview.totals.campaignCount,
      기부받은돈: won(c.overview.totals.received),
      사업에쓰인돈: won(c.overview.totals.donated),
      확인필요모집건: c.overview.campaigns.filter((s) => s.health.overall !== "양호").map((s) => `${s.campaign.title}(${s.health.overall}: ${s.health.checks.filter((k) => k.level !== "양호").map((k) => `${k.label} ${k.value}`).join(", ")})`),
    },
    운영세칙: { 운영비한도: "10%", 사업비최소: "65%(권장 75%)", 모금비용: "법정 한도(10억 이하 15%)", 모집종료후잔액: "30% 이하 권장", 공개주기: "14일" },
    ...(c.donorCode
      ? {
          나의기부내역: c.myDonations
            ? {
                기부코드: c.myDonations.donorCode,
                이름: c.myDonations.donorAlias,
                총기부액: won(c.myDonations.total),
                내역: c.myDonations.items.slice(0, 10).map((i) => ({ 모집건: i.campaignTitle, 금액: won(i.amount), 일시: fmtDate(i.donatedAt), 사업비로: won(i.allocation.program), 운영비로: won(i.allocation.admin), 모금비용으로: won(i.allocation.fundraising), 아직미집행: won(i.allocation.balance) })),
              }
            : `기부코드 ${c.donorCode}에 해당하는 내역 없음`,
        }
      : {}),
    언급된모집건: c.campaigns.map((s) => ({
      제목: s.campaign.title,
      상태: s.campaign.status,
      주관기관: s.campaign.organizer,
      기부받은돈: won(s.sheet.inflow.total),
      사업비: `${won(s.sheet.outflow.program)} (${pct(s.sheet.outflow.program / (s.sheet.inflow.total || 1))})`,
      운영비: pct(s.sheet.outflow.admin / (s.sheet.inflow.total || 1)),
      모금비용: pct(s.sheet.outflow.fundraising / (s.sheet.inflow.total || 1)),
      미집행잔액: won(s.sheet.outflow.balance),
      판정: s.health.overall,
      확인필요: s.health.checks.filter((k) => k.level !== "양호").map((k) => `${k.label} ${k.value}`),
    })),
    언급된주관기관: c.orgs.map((o) => ({ 이름: o.name, 지표등급: o.grade, 지표점수: o.score, 평균사업비비율: pct(o.avgProgram), 최근운영비: pct(o.latestAdmin), 모금비용한도초과연도수: o.overCap, 최장공시지연일: o.maxDelay, 처분지적: o.issues })),
  };
}

const SYSTEM = `당신은 기부금 투명성 플랫폼 '기부CCTV'의 기부 도우미입니다.
- 오직 [조회 데이터]에 있는 내용으로만 답합니다. 없는 정보는 "확인되지 않습니다"라고 말하고 어디서 볼 수 있는지 안내하세요.
- 수치는 데이터 값을 그대로 인용하세요. 새로 계산하지 마세요.
- 기부내역 질문인데 기부코드가 없으면, 기부코드(D-XXXX, 기부 완료 문자에 포함)를 알려달라고 요청하세요.
- 실명·연락처를 묻거나 추측하지 마세요. 이름은 가명(김*성) 그대로만 씁니다.
- 기관을 믿어도 되는지 묻는 질문엔 지표 근거로 답하되, 최종 판단은 기부자 몫임을 존중하고 '주관기관 감사' 페이지를 안내하세요.
- 존댓말, 3~6문장, 필요하면 짧은 목록.`;

export async function answer(messages: ChatTurn[]): Promise<ChatReply> {
  const trimmed = messages.slice(-8).map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  const ctx = await buildContext(trimmed);
  const links = linksFor(ctx);

  const ai = await generate({
    system: `${SYSTEM}\n\n[조회 데이터]\n${JSON.stringify(contextForPrompt(ctx))}`,
    messages: trimmed,
    maxTokens: 700,
    temperature: 0.3,
  });
  if (ai) return { reply: ai.text, links, engine: ai.engine };
  return { reply: demoAnswer(trimmed.at(-1)?.content ?? "", ctx), links, engine: DEMO_ENGINE };
}

function linksFor(c: Context): ChatLink[] {
  const out: ChatLink[] = [];
  if (c.myDonations) out.push({ label: `${c.myDonations.donorCode} 기부내역 자세히`, href: `/my?code=${c.myDonations.donorCode}` });
  for (const s of c.campaigns.slice(0, 3)) out.push({ label: s.campaign.title, href: `/campaigns/${s.campaign.id}` });
  for (const o of c.orgs.slice(0, 2)) out.push({ label: `${o.name} 감사 보기`, href: `/organizations/${o.id}` });
  return out;
}

// ---------- 데모 답변(키 없을 때) ----------
function demoAnswer(q: string, c: Context): string {
  const asksMine = /내\s*기부|나의\s*기부|기부\s*내역|내역|내\s*돈|어디에\s*쓰/.test(q) || CODE_RE.test(q);

  if (c.orgs.length > 0) {
    const o = c.orgs[0];
    return [
      `${o.name}의 최근 5년 공시 지표를 보면 '${o.grade}' 수준입니다(지표 점수 ${o.score}점).`,
      `- 평균 사업비 비율 ${pct(o.avgProgram)}, 최근 운영비 ${pct(o.latestAdmin)}`,
      `- 모금비용 법정 한도 초과 ${o.overCap}개 연도, 결산 공시 최장 지연 ${o.maxDelay}일`,
      o.issues.length ? `- 처분·지적: ${o.issues.join(" / ")}` : `- 처분·지적 이력은 없습니다.`,
      `자세한 AI 감사의견은 아래 링크에서 확인하세요.`,
    ].join("\n");
  }

  if (asksMine) {
    if (!c.donorCode) return "기부내역을 확인하려면 기부코드가 필요합니다. 기부 완료 문자에 있는 'D-XXXX' 형식의 코드를 입력해 주세요.";
    if (!c.myDonations) return `기부코드 ${c.donorCode}로 조회된 내역이 없습니다. 코드를 다시 확인해 주세요.`;
    const r = c.myDonations;
    const sum = r.items.reduce((a, i) => ({ p: a.p + i.allocation.program, ad: a.ad + i.allocation.admin, f: a.f + i.allocation.fundraising, b: a.b + i.allocation.balance }), { p: 0, ad: 0, f: 0, b: 0 });
    return [
      `${r.donorAlias}님(${r.donorCode})은 ${r.items.length}건, 총 ${won(r.total)}을 기부하셨습니다.`,
      ...r.items.slice(0, 3).map((i) => `- ${fmtDate(i.donatedAt)} ${i.campaignTitle} ${won(i.amount)}`),
      ...(r.items.length > 3 ? [`- 외 ${r.items.length - 3}건`] : []),
      `내 기부금은 지금까지 사업비 ${won(sum.p)}, 운영비 ${won(sum.ad)}, 모금비용 ${won(sum.f)}으로 쓰였고, ${won(sum.b)}은 아직 쓰이지 않았습니다.`,
    ].join("\n");
  }

  if (c.campaigns.length > 0) {
    const s = c.campaigns[0];
    const t = s.sheet.inflow.total || 1;
    const flagged = s.health.checks.filter((k) => k.level !== "양호");
    return [
      `${s.campaign.title}(${s.campaign.status})은 지금까지 ${won(s.sheet.inflow.total)}을 모금했습니다.`,
      `- 사업비 ${pct(s.sheet.outflow.program / t)} · 운영비 ${pct(s.sheet.outflow.admin / t)} · 모금비용 ${pct(s.sheet.outflow.fundraising / t)}`,
      `- 아직 쓰이지 않은 돈 ${won(s.sheet.outflow.balance)}`,
      flagged.length ? `- 확인 필요: ${flagged.map((k) => `${k.label} ${k.value}`).join(", ")}` : `- 운영 세칙 판정은 모두 양호합니다.`,
    ].join("\n");
  }

  if (/문제|위반|주의|이상|확인\s*필요|위험/.test(q)) {
    const list = c.overview.campaigns.filter((s) => s.health.overall !== "양호");
    if (!list.length) return "현재 운영 세칙 판정에서 '주의' 이상인 모집건은 없습니다.";
    return [`운영 세칙 판정에서 확인이 필요한 모집건은 ${list.length}건입니다.`, ...list.map((s) => `- [${s.health.overall}] ${s.campaign.title}: ${s.health.checks.filter((k) => k.level !== "양호").map((k) => `${k.label} ${k.value}`).join(", ")}`)].join("\n");
  }

  if (/운영비|모금비|기준|세칙|몇\s*%|한도/.test(q)) {
    return [
      "기부CCTV는 다음 기준으로 모집건을 판정합니다.",
      `- 운영비(일반관리비용): 수입의 ${pct(POLICY.adminRatioBad, 0)} 이하 (${pct(POLICY.adminRatioWarn, 0)} 초과 시 주의)`,
      `- 사업비: 총지출의 ${pct(POLICY.programShareMin, 0)} 이상, 권장 ${pct(POLICY.programShareGood, 0)}`,
      "- 모금비용: 기부금품법 시행령 한도(10억 이하 모금 시 15%)",
      `- 모집 종료 후 미집행 잔액 ${pct(POLICY.balanceAfterEndWarn, 0)} 이하 권장`,
    ].join("\n");
  }

  return [
    `현재 ${c.overview.totals.campaignCount}개 모집건에 ${wonShort(c.overview.totals.received)}이 모였고, ${wonShort(c.overview.totals.donated)}이 사업에 쓰였습니다.`,
    "이런 질문을 할 수 있어요.",
    "- 내 기부내역 확인 (기부코드 D-XXXX 입력)",
    "- 지금 문제 있는 모집건은?",
    "- ○○재단 믿을 만해?",
    "- 거제도 홍수 모금 어떻게 쓰였어?",
  ].join("\n");
}
