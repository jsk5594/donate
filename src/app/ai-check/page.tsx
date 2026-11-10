import { redirect } from "next/navigation";

/** 예전 'AI 지출 점검' 입구 주소 — 탭에서 바로 고르도록 입구 페이지를 없애고 첫 점검으로 보냄 */
export default function AiCheckIndex() {
  redirect("/ai-check/purpose");
}
