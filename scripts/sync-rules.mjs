/**
 * 운영 세칙 근거 자료 월간 점검·자동 갱신 — `npm run rules:sync`
 *
 * 1) 근거 법령(기부금품법·시행령·재해구호법·고향사랑기부금법)의 현행 조문을 가져와
 *    data/law-articles.json 을 새로 씁니다. 화면(세칙 상세의 '관련 법령 원문')과 AI 기부 도우미(RAG)가
 *    이 파일을 읽으므로, 법령이 바뀌면 다음 배포부터 자동으로 반영됩니다.
 * 2) 세칙 각 장의 '근거 자료' 링크를 열어 본문이 바뀌었는지 확인합니다(지문 비교).
 * 3) 바뀐 것이 있으면 data/rules-sync.json 의 changes 에 기록합니다. 세칙 본문(해석·판정 기준)은
 *    사람이 검토해 고쳐야 하므로, 해당 장 화면에 '근거 법령 개정 · 세칙 검토 중' 안내가 뜹니다.
 *    검토를 마치면 그 항목의 reviewed 를 true 로 바꿉니다.
 *
 * GitHub Actions(.github/workflows/sync-rules.yml)가 매월 1일 실행해 변경분을 커밋합니다.
 * 종료 코드: 0(변경 없음) · 0 + stdout "CHANGED"(변경 있음) · 1(실행 오류)
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RULE_POSTS } from "../src/lib/rules-content.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAW_FILE = path.join(ROOT, "data", "law-articles.json");
const SYNC_FILE = path.join(ROOT, "data", "rules-sync.json");
const UA = "GibuDotbogi-RuleSync/1.0 (+https://github.com/jsk5594/donate)";
const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10); // KST

/** 근거 법령 — short 는 세칙 본문에서 법령을 부르는 이름 */
const LAWS = [
  { id: "donation-act", short: "기부금품법", name: "기부금품의 모집ㆍ사용 및 기부문화 활성화에 관한 법률", slug: "기부금품의-모집-및-사용에-관한-법률" },
  { id: "donation-decree", short: "시행령", name: "기부금품의 모집ㆍ사용 및 기부문화 활성화에 관한 법률 시행령", slug: "기부금품의-모집-및-사용에-관한-법률-시행령" },
  { id: "disaster-relief-act", short: "재해구호법", name: "재해구호법", slug: "재해구호법" },
  { id: "hometown-act", short: "고향사랑기부금법", name: "고향사랑 기부금에 관한 법률", slug: "고향사랑-기부금에-관한-법률" },
];
const lawUrl = (l) => `https://www.nepla.ai/law/${encodeURIComponent(l.slug)}`;

const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const readJson = (f, d) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : d);

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/pdf,*/*" }, signal: AbortSignal.timeout(30_000), redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (/pdf|octet-stream/.test(type)) return { pdf: true, body: Buffer.from(await res.arrayBuffer()) };
  return { pdf: false, body: await res.text() };
}

/** HTML → 읽을 수 있는 줄 단위 텍스트 */
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(header|footer|nav)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean)
    .join("\n");
}

/** 법령 페이지에서 시행일·공포번호·조문을 뽑음 */
function parseLaw(text) {
  const head = text.match(/\[시행\s*([\d.]+)\]\s*\[([^\]]+)\]/);
  // 목차(제/1/조…)는 건너뛰고 본문 시작(시행 표기 뒤)부터, 부칙 앞까지
  let body = head ? text.slice(text.indexOf(head[0]) + head[0].length) : text;
  const end = body.search(/\n부칙\s*(?:<|\n)/);
  if (end > 0) body = body.slice(0, end);
  const articles = [];
  const re = /^제(\d+)조(?:의\s?(\d+))?\s*\(([^)\n]*)\)\s*$/gm;
  const marks = [...body.matchAll(re)];
  marks.forEach((m, i) => {
    const text = body.slice(m.index + m[0].length, marks[i + 1]?.index ?? body.length).trim();
    articles.push({ no: m[2] ? `${m[1]}-${m[2]}` : m[1], title: m[3].trim(), text });
  });
  return { effective: head?.[1].replace(/\.$/, "") ?? "", promulgation: head?.[2].trim() ?? "", articles };
}

/** 법령 개정이 영향을 주는 세칙 장 */
function affectedSlugs(law, changedNos) {
  const nums = changedNos.map((n) => n.replace(/-.*/, ""));
  return RULE_POSTS.filter((p) => {
    const all = `${p.title}\n${p.summary}\n${p.body.join("\n")}`;
    if (law.id === "donation-act") return nums.some((n) => new RegExp(`기부금품법[^.\\n]{0,20}제${n}조(?!\\d)`).test(all) || new RegExp(`\\(기부금품법 제${n}조`).test(p.title));
    return all.includes(law.short);
  }).map((p) => p.slug);
}

async function main() {
  const prevLaw = readJson(LAW_FILE, { laws: [] });
  const prevSync = readJson(SYNC_FILE, { checkedAt: "", sources: [], changes: [] });
  const changes = [];
  const laws = [];

  // 1) 법령 조문
  for (const law of LAWS) {
    const url = lawUrl(law);
    const old = prevLaw.laws.find((x) => x.id === law.id);
    try {
      const { body } = await fetchText(url);
      const parsed = parseLaw(htmlToText(body));
      if (parsed.articles.length < 5) throw new Error(`조문 ${parsed.articles.length}개만 읽힘(페이지 구조 변경 의심)`);
      const entry = { id: law.id, short: law.short, name: law.name, url, effective: parsed.effective, promulgation: parsed.promulgation, checkedAt: today, articles: parsed.articles };
      laws.push(entry);
      if (old) {
        const oldMap = new Map(old.articles.map((a) => [a.no, sha(a.title + a.text)]));
        const newMap = new Map(parsed.articles.map((a) => [a.no, sha(a.title + a.text)]));
        const changed = [...newMap].filter(([no, h]) => oldMap.get(no) !== h).map(([no]) => no);
        const removed = [...oldMap.keys()].filter((no) => !newMap.has(no));
        if (changed.length || removed.length || old.effective !== parsed.effective) {
          const label = (no) => `제${no.replace("-", "조의")}${no.includes("-") ? "" : "조"}`;
          changes.push({
            date: today,
            kind: "법령 개정",
            title: `${law.short === "시행령" ? "기부금품법 시행령" : law.short} 개정(시행 ${parsed.effective || "미확인"})`,
            url,
            detail: [changed.length && `바뀐 조문: ${changed.map(label).join(", ")}`, removed.length && `삭제된 조문: ${removed.map(label).join(", ")}`].filter(Boolean).join(" / ") || "시행일·공포번호 변경",
            slugs: affectedSlugs(law, [...changed, ...removed]),
            reviewed: false,
          });
        }
      }
      console.log(`[법령] ${law.short}: 시행 ${parsed.effective} · 조문 ${parsed.articles.length}개`);
    } catch (e) {
      console.warn(`[법령] ${law.short} 확인 실패: ${e.message} — 이전 조문 유지`);
      if (old) laws.push({ ...old });
    }
  }

  // 2) 세칙 각 장의 근거 자료 링크
  const byUrl = new Map();
  for (const p of RULE_POSTS) for (const s of p.sources) {
    const cur = byUrl.get(s.url) ?? { url: s.url, title: s.title, slugs: [] };
    cur.slugs.push(p.slug);
    byUrl.set(s.url, cur);
  }
  const sources = [];
  for (const src of byUrl.values()) {
    const old = prevSync.sources.find((x) => x.url === src.url);
    const isHome = new URL(src.url).pathname.replace(/\/$/, "") === "";
    const isLawPage = laws.some((l) => decodeURIComponent(l.url) === decodeURIComponent(src.url));
    if (isHome || isLawPage) {
      // 사이트 첫 화면은 매일 바뀌어 비교하지 않음 · 법령 페이지는 1)에서 조문 단위로 비교
      sources.push({ ...src, status: isLawPage ? "조문 단위 점검" : "비교 생략(첫 화면)", hash: null, checkedAt: today, changedAt: old?.changedAt ?? null });
      continue;
    }
    try {
      const r = await fetchText(src.url);
      const hash = r.pdf ? sha(r.body) : sha(htmlToText(r.body).replace(/\d{4}[.-]\d{2}[.-]\d{2}[ T]\d{2}:\d{2}(:\d{2})?/g, ""));
      const changed = old?.hash && old.hash !== hash;
      sources.push({ ...src, status: "확인", hash, checkedAt: today, changedAt: changed ? today : (old?.changedAt ?? null) });
      if (changed) changes.push({ date: today, kind: "근거 자료 변경", title: src.title, url: src.url, detail: "링크한 안내 페이지의 내용이 바뀌었습니다.", slugs: src.slugs, reviewed: false });
      console.log(`[자료] ${changed ? "변경" : "같음"} · ${src.title}`);
    } catch (e) {
      sources.push({ ...src, status: `확인 실패(${e.message})`, hash: old?.hash ?? null, checkedAt: today, changedAt: old?.changedAt ?? null });
      console.warn(`[자료] 확인 실패 · ${src.title}: ${e.message}`);
    }
  }

  if (!laws.length) throw new Error("법령을 하나도 읽지 못했습니다.");
  writeFileSync(LAW_FILE, `${JSON.stringify({ updatedAt: today, laws }, null, 1)}\n`);
  writeFileSync(SYNC_FILE, `${JSON.stringify({ checkedAt: today, schedule: "매월 1일", sources, changes: [...changes, ...prevSync.changes].slice(0, 50) }, null, 1)}\n`);

  console.log(`\n점검 완료(${today}): 새 변경 ${changes.length}건`);
  for (const c of changes) console.log(` - [${c.kind}] ${c.title}: ${c.detail} → 관련 장: ${c.slugs.join(", ") || "없음"}`);
  if (changes.length) console.log("CHANGED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
