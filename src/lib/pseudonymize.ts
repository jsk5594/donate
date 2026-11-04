/**
 * 가명처리 유틸
 * - DB에서 읽은 원본(이름·상호·수혜자)을 UI로 보내기 전에 반드시 이 모듈을 거칩니다.
 * - 기부코드(D-XXXX)는 이름+연락처 뒤 4자리 기반 해시로 생성되어,
 *   기부자가 '나의 기부내역'에서 자신의 내역을 조회하는 키로도 쓰입니다.
 */

import type { DonationRecord, ExpenseRecord, PublicDonation, PublicExpense } from "./types";

/** 간단한 FNV-1a 해시 (서버/클라이언트 공용, 의존성 없음) */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** 기부코드 생성: 이름 + 전화 뒤 4자리 → D-XXXX */
export function donorCodeOf(name: string, phoneLast4 = ""): string {
  const h = fnv1a(`${name}|${phoneLast4}`);
  return `D-${h.toString(16).toUpperCase().padStart(8, "0").slice(0, 4)}`;
}

const CORP_PREFIXES = ["㈜", "(주)", "(사)", "(재)", "(유)"];

/** 이름/상호 마스킹 */
export function maskName(raw: string): string {
  const name = raw.trim();
  if (!name) return "익명";
  if (name === "익명" || name === "무명") return "익명";

  // 법인 접두사 분리
  let prefix = "";
  let body = name;
  for (const p of CORP_PREFIXES) {
    if (body.startsWith(p)) {
      prefix = p;
      body = body.slice(p.length);
      break;
    }
  }
  body = body.trim();
  if (body.length <= 1) return `${prefix}${body}*`;
  if (body.length === 2) return `${prefix}${body[0]}*`;
  // 3자 이상: 첫 글자와 마지막 글자만 남김
  const masked = body[0] + "*".repeat(Math.min(body.length - 2, 3)) + body[body.length - 1];
  return `${prefix}${masked}`;
}

export function toPublicDonation(d: DonationRecord): PublicDonation {
  return {
    id: d.id,
    campaignId: d.campaignId,
    donorCode: donorCodeOf(d.donorName, d.donorPhoneLast4),
    donorAlias: maskName(d.donorName),
    donorType: d.donorType,
    amount: d.amount,
    donatedAt: d.donatedAt,
    method: d.method,
    message: d.message,
  };
}

export function toPublicExpense(e: ExpenseRecord): PublicExpense {
  const { recipient, ...rest } = e;
  return {
    ...rest,
    recipientAlias: recipient ? maskName(recipient) : undefined,
  };
}
