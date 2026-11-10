/**
 * 메인 기부 전광판에 가끔 끼워 넣는 지정 기부 내역
 * - 표시 전용입니다. 원장(DB)·대차대조표·기부내역 조회에는 들어가지 않습니다.
 * - 이름은 이미 가명처리된 형태 그대로 표시합니다.
 * - 실제 기부 FEATURED_EVERY건마다 1건씩 섞입니다. 목록을 비우면 전광판은 실제 기부만 보여 줍니다.
 */
import type { PublicDonation } from "./types";

export const FEATURED_DONATIONS: { alias: string; amount: number }[] = [
  { alias: "한*", amount: 1700 },
  { alias: "정*철", amount: 999000 },
  { alias: "김*미", amount: 300000 },
  { alias: "신*민", amount: 330000 },
  { alias: "조*빈", amount: 150000 },
  { alias: "박*주", amount: 1000000000 },
  { alias: "정*권", amount: 9999999999 },
  { alias: "이*원", amount: 350 },
];

/** 실제 기부 몇 건마다 지정 내역 1건을 넣을지 */
export const FEATURED_EVERY = 3;

type LiveItem = PublicDonation & { campaignTitle: string };

/** 실제 기부 목록 사이에 지정 내역을 고르게 끼움 — 모집건·시각은 바로 앞 실제 기부를 따름 */
export function mixFeatured(items: LiveItem[]): LiveItem[] {
  if (!items.length || !FEATURED_DONATIONS.length) return items;
  const out: LiveItem[] = [];
  let f = 0;
  items.forEach((d, i) => {
    out.push(d);
    if ((i + 1) % FEATURED_EVERY === 0 && f < FEATURED_DONATIONS.length) {
      const x = FEATURED_DONATIONS[f++];
      out.push({ ...d, id: `featured-${f}`, donorCode: "", donorAlias: x.alias, donorType: "개인", amount: x.amount, method: "계좌이체", message: undefined });
    }
  });
  return out;
}
