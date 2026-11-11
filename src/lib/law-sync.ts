/**
 * 근거 법령 원문·월간 점검 결과 — scripts/sync-rules.mjs 가 매월 새로 쓰는 data/*.json 을 읽음
 * 법령이 개정되면 이 파일들이 바뀌고, 세칙 상세 화면의 '관련 법령 원문'과 AI 기부 도우미 근거가 함께 갱신됩니다.
 */

import lawData from "../../data/law-articles.json" with { type: "json" };
import syncData from "../../data/rules-sync.json" with { type: "json" };

export interface LawArticle {
  no: string; // "13", "2-2"(제2조의2)
  title: string;
  text: string;
}

export interface LawDoc {
  id: string;
  short: string; // 세칙 본문에서 부르는 이름(기부금품법·시행령·재해구호법·고향사랑기부금법)
  name: string;
  url: string;
  effective: string; // 시행일 2024.07.31
  promulgation: string;
  checkedAt: string;
  articles: LawArticle[];
}

export interface RuleChange {
  date: string;
  kind: string;
  title: string;
  url: string;
  detail: string;
  slugs: string[];
  reviewed: boolean;
}

export const LAWS = lawData.laws as LawDoc[];
export const RULE_SYNC = syncData as { checkedAt: string; schedule: string; changes: RuleChange[] };

export const articleLabel = (no: string) => (no.includes("-") ? `제${no.replace("-", "조의")}` : `제${no}조`);
export const lawLabel = (l: LawDoc) => (l.short === "시행령" ? "기부금품법 시행령" : l.short);

/** 아직 세칙에 반영(검토)되지 않은 변경 */
export function pendingChanges(slug?: string) {
  return RULE_SYNC.changes.filter((c) => !c.reviewed && (!slug || c.slugs.includes(slug)));
}

/** 세칙 글이 인용한 법령 조문(예: '기부금품법 제13조', '재해구호법 제5조') */
export function citedArticles(text: string): { law: LawDoc; article: LawArticle }[] {
  const out: { law: LawDoc; article: LawArticle }[] = [];
  const seen = new Set<string>();
  for (const law of LAWS) {
    if (law.short === "시행령") continue; // 세칙은 시행령을 조문 번호로 인용하지 않음
    const re = new RegExp(`${law.short}\\s*(?:제\\d+조(?:의\\d+)?(?:제\\d+항)?\\s*[·ㆍ,]\\s*)*제(\\d+)조(?:의(\\d+))?`, "g");
    for (const m of text.matchAll(re)) {
      // '기부금품법 제4조제6항·제6조·제7조'처럼 이어진 인용도 모두 잡음
      for (const n of m[0].matchAll(/제(\d+)조(?:의(\d+))?/g)) {
        const no = n[2] ? `${n[1]}-${n[2]}` : n[1];
        const key = `${law.id}:${no}`;
        const article = law.articles.find((a) => a.no === no);
        if (article && !seen.has(key)) {
          seen.add(key);
          out.push({ law, article });
        }
      }
    }
  }
  return out;
}
