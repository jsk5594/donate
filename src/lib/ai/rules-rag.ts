/**
 * 운영 세칙(법령 근거 포함) 검색 — 기부 도우미가 AI로 답할 때 근거 조문을 찾아 붙이는 RAG의 검색 단계
 *
 * - 문서: 운영 세칙 게시판(RULE_POSTS)의 조문 하나를 한 조각으로 나눔(장 제목·출처 링크 포함)
 *   + 근거 법령 현행 조문(data/law-articles.json, 매월 scripts/sync-rules.mjs 가 갱신)도 한 조문씩 넣음
 * - 검색: 한국어는 띄어쓰기·조사가 다양하므로 글자 2개 단위(bigram)로 쪼갠 BM25 점수 + 조문 번호·법률명 가산
 * - 별도 임베딩 키 없이 동작하고(OpenAI·Gemini·Claude 어느 제공자든 같은 결과), 서버 시작 후 한 번만 색인함
 */

import { RULE_POSTS } from "../rules-content.ts";
import { TERMS } from "../terms.ts";
import { LAWS, articleLabel, citedArticles, lawLabel } from "../law-sync.ts";

export interface RuleChunk {
  id: string; // 예: fundraising-cap#3
  slug: string; // /rules/{slug} — 세칙에서 인용하지 않은 법령 조문은 빈칸(링크는 sources[0] 법령 페이지)
  chapter: string; // 예: 제2장 모금비용 한도(기부금품법 제13조)
  article: string; // 예: 제8조(판정) — 요약 조각은 '요지'
  text: string;
  sources: { title: string; url: string }[];
}

export interface RuleHit extends RuleChunk {
  score: number;
}

// ---------- 조각 나누기 ----------
const ARTICLE_RE = /^(제\d+조(?:의\d+)?(?:\([^)]*\))?)/;

function buildChunks(): RuleChunk[] {
  const out: RuleChunk[] = [];
  for (const p of RULE_POSTS) {
    out.push({ id: `${p.slug}#0`, slug: p.slug, chapter: p.title, article: "요지", text: p.summary, sources: p.sources });
    p.body.forEach((para, i) => {
      const m = para.match(ARTICLE_RE);
      out.push({ id: `${p.slug}#${i + 1}`, slug: p.slug, chapter: p.title, article: m ? m[1] : `${i + 1}항목`, text: para, sources: p.sources });
    });
  }
  // 법령 원문: 그 조문을 인용한 세칙 장으로 연결(인용하지 않은 조문은 법령 페이지로)
  const citedBy = new Map<string, string>();
  for (const p of RULE_POSTS) for (const c of citedArticles([p.title, ...p.body].join(" "))) {
    const key = `${c.law.id}:${c.article.no}`;
    if (!citedBy.has(key)) citedBy.set(key, p.slug);
  }
  for (const law of LAWS) {
    for (const a of law.articles) {
      out.push({
        id: `law:${law.id}#${a.no}`,
        slug: citedBy.get(`${law.id}:${a.no}`) ?? "",
        chapter: `${lawLabel(law)} 원문(시행 ${law.effective})`,
        article: `${articleLabel(a.no)}(${a.title})`,
        text: `${lawLabel(law)} ${articleLabel(a.no)}(${a.title}) ${a.text}`,
        sources: [{ title: law.name, url: law.url }],
      });
    }
  }
  return out;
}

// ---------- 토큰화 ----------
/** 조문·법률 이름처럼 통째로 맞아야 의미 있는 표현 */
const LAW_ALIASES: [RegExp, string][] = [
  [/기부금품(?:의\s*모집ㆍ사용\s*및\s*기부문화\s*활성화에\s*관한\s*법률|법)/g, " 기부금품법 "],
  [/고향사랑\s*기부금(?:에\s*관한\s*법률|법)/g, " 고향사랑기부금법 "],
  [/재해구호법/g, " 재해구호법 "],
  [/사회복지공동모금회법/g, " 사회복지공동모금회법 "],
];

function normalize(text: string) {
  let s = text;
  for (const [re, to] of LAW_ALIASES) s = s.replace(re, to);
  return s.toLowerCase();
}

function tokenize(text: string): string[] {
  const s = normalize(text);
  const toks: string[] = [];
  // 조문 번호(제13조, 13조, 제2조의2)는 그대로 한 토큰
  for (const m of s.matchAll(/제?\s?(\d+)\s?조(?:의\s?(\d+))?/g)) toks.push(`조${m[1]}${m[2] ? `-${m[2]}` : ""}`);
  for (const w of s.split(/[^0-9a-z가-힣%]+/).filter(Boolean)) {
    if (/^[가-힣]+$/.test(w)) {
      if (w.length === 1) continue;
      for (let i = 0; i < w.length - 1; i++) toks.push(w.slice(i, i + 2));
      if (/법$/.test(w) && w.length >= 4) toks.push(`법:${w}`); // 법률명은 통째로도
    } else if (w.length >= 2 || /^\d+$/.test(w)) {
      toks.push(w);
    }
  }
  return toks;
}

/** 화면에서 쓰는 쉬운 말 → 세칙 본문의 원래 용어로 질문을 넓힘 */
const EXPAND: [RegExp, string][] = [
  ...Object.values(TERMS).map((t) => [new RegExp(t.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), t.orig.replace(/\(.*$/, "")] as [RegExp, string]),
  [/수수료|홍보비|광고|모금비|모집비/, "모금비용 모집비용 법정 한도"],
  [/%|퍼센트|비율|얼마까지|몇\s*프로/, "구간별 비율 한도"],
  [/등록|신고/, "모집등록 등록청"],
  [/보고|결산/, "모집완료 보고 사용명세 회계감사"],
  [/세금|세제|연말정산|공제/, "세제혜택 기부금 영수증"],
  [/개인정보|실명|이름/, "가명처리 개인정보"],
  [/점수|등급|지수/, "기부투명도지수 판정 배점"],
  [/남은|잔액|이월/, "미집행 잔액"],
  [/한도|상한|최대/, "한도 상한액"],
  [/재난|재해|이재민/, "재해구호법 의연금품"],
];

function expandQuery(q: string) {
  const extra = EXPAND.filter(([re]) => re.test(q)).map(([, w]) => w);
  return [q, ...extra].join(" ");
}

// ---------- 색인(BM25) ----------
const K1 = 1.4;
const B = 0.75;

interface Index {
  chunks: RuleChunk[];
  tf: Map<string, number>[];
  len: number[];
  avgLen: number;
  df: Map<string, number>;
}

let INDEX: Index | null = null;

function getIndex(): Index {
  if (INDEX) return INDEX;
  const chunks = buildChunks();
  const tf = chunks.map((c) => {
    const m = new Map<string, number>();
    // 세칙 장 제목은 짧고 핵심이라 세 번 셈(법령 원문은 모든 조문이 같은 제목이라 한 번)
    const ch = tokenize(c.chapter);
    for (const t of [...tokenize(c.text), ...ch, ...(c.id.startsWith("law:") ? [] : [...ch, ...ch])]) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  });
  const len = tf.map((m) => [...m.values()].reduce((a, b) => a + b, 0));
  const df = new Map<string, number>();
  for (const m of tf) for (const t of m.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  INDEX = { chunks, tf, len, avgLen: len.reduce((a, b) => a + b, 0) / len.length, df };
  return INDEX;
}

/** 질문과 가까운 세칙 조문을 점수순으로 돌려줌. 관련 조문이 없으면 빈 배열 */
export function searchRules(query: string, k = 5): RuleHit[] {
  const idx = getIndex();
  const N = idx.chunks.length;
  const qTokens = [...new Set(tokenize(expandQuery(query)))];
  // '기부금품법 13조'처럼 법령명과 조문 번호를 함께 물으면 그 법령 원문 조문을 맨 위로
  const exact = new Set<string>();
  for (const m of normalize(query).matchAll(/(기부금품법|재해구호법|고향사랑기부금법|시행령)\s*제?\s?(\d+)\s?조(?:의\s?(\d+))?/g)) {
    const law = LAWS.find((l) => l.short === m[1]);
    if (law) exact.add(`law:${law.id}#${m[3] ? `${m[2]}-${m[3]}` : m[2]}`);
  }
  if (!qTokens.length) return [];
  const scored = idx.chunks.map((c, i) => {
    let s = 0;
    for (const t of qTokens) {
      const f = idx.tf[i].get(t);
      if (!f) continue;
      const n = idx.df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      // 조문 번호·법률명이 맞으면 가중
      const w = t.startsWith("조") || t.startsWith("법:") ? 2 : 1;
      s += w * idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * idx.len[i]) / idx.avgLen)));
    }
    if (exact.has(c.id)) s += 30;
    return { ...c, score: s };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0]?.score ?? 0;
  // 최소 점수: 흔한 글자 몇 개만 겹친 조문은 버림
  if (top < 4) return [];
  return scored.filter((h) => h.score >= Math.max(4, top * 0.35)).slice(0, k);
}

/** 프롬프트에 넣을 근거 블록 */
export function rulesContext(hits: RuleHit[]): string {
  return hits.map((h, i) => `[근거${i + 1}] ${h.chapter} › ${h.article}\n${h.text}`).join("\n\n");
}
