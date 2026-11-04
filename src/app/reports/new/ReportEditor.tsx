"use client";

import { useMemo, useState } from "react";
import { saveDrafts, useDrafts } from "../SavedDrafts";
import type { ReportDraft } from "@/lib/types";

interface CampaignOpt {
  id: string;
  title: string;
  lastDisclosedAt: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** 마지막 공개일 다음날 ~ 14일 */
function defaultPeriod(c?: CampaignOpt) {
  if (!c) return { from: "", to: "" };
  const from = new Date(new Date(c.lastDisclosedAt).getTime() + 86400000);
  const to = new Date(from.getTime() + 13 * 86400000);
  return { from: iso(from), to: iso(to) };
}

export function ReportEditor({ campaigns, initialCampaignId, draftId }: { campaigns: CampaignOpt[]; initialCampaignId?: string; draftId?: string }) {
  const drafts = useDrafts();
  const draft = useMemo(() => (draftId ? drafts.find((d) => d.id === draftId) ?? null : null), [drafts, draftId]);
  // 초안이 로드되면 key가 바뀌어 편집기가 그 값으로 다시 초기화됩니다.
  return <Editor key={draft?.id ?? "new"} campaigns={campaigns} initialCampaignId={initialCampaignId} draft={draft} />;
}

function Editor({ campaigns, initialCampaignId, draft }: { campaigns: CampaignOpt[]; initialCampaignId?: string; draft: ReportDraft | null }) {
  const firstId = draft?.campaignId ?? (initialCampaignId && campaigns.some((c) => c.id === initialCampaignId) ? initialCampaignId : campaigns[0]?.id ?? "");
  const [campaignId, setCampaignId] = useState(firstId);
  const [period, setPeriod] = useState(() => (draft ? { from: draft.periodFrom, to: draft.periodTo } : defaultPeriod(campaigns.find((c) => c.id === firstId))));
  const [title, setTitle] = useState(draft?.title ?? "");
  const [body, setBody] = useState(draft?.body ?? "");
  const [instruction, setInstruction] = useState("");
  const [generatedBy, setGeneratedBy] = useState<"template" | "llm">(draft?.generatedBy ?? "template");
  const [llmConfigured, setLlmConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draft?.id ?? null);

  function changeCampaign(id: string) {
    setCampaignId(id);
    setPeriod(defaultPeriod(campaigns.find((c) => c.id === id)));
  }

  async function generate(withInstruction: boolean) {
    if (!campaignId || !period.from || !period.to) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/reports/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, periodFrom: period.from, periodTo: period.to, instruction: withInstruction ? instruction : "" }),
      });
      const data = (await res.json()) as { title?: string; body?: string; generatedBy?: "template" | "llm"; llmConfigured?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "생성 실패");
      setTitle(data.title ?? "");
      setBody(data.body ?? "");
      setGeneratedBy(data.generatedBy ?? "template");
      setLlmConfigured(Boolean(data.llmConfigured));
      if (withInstruction && data.generatedBy !== "llm") setNotice("LLM이 설정되어 있지 않아 템플릿 초안을 표시합니다. .env에 LLM_BASE_URL · LLM_MODEL을 설정하면 문장 다듬기가 동작합니다.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "생성 중 오류");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    const id = currentDraftId ?? `draft-${Date.now()}`;
    const next: ReportDraft = { id, campaignId, periodFrom: period.from, periodTo: period.to, title, body, createdAt: new Date().toISOString(), generatedBy };
    const list = (() => {
      try {
        return JSON.parse(localStorage.getItem("donation-cctv:report-drafts") ?? "[]") as ReportDraft[];
      } catch {
        return [] as ReportDraft[];
      }
    })();
    const idx = list.findIndex((d) => d.id === id);
    if (idx >= 0) list[idx] = next;
    else list.unshift(next);
    saveDrafts(list);
    setCurrentDraftId(id);
    setNotice("이 브라우저에 초안을 저장했습니다. (DB 연결 후 서버 저장으로 전환)");
  }

  const inputCls = "rounded-lg border border-line bg-card px-3 py-2 text-sm";

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <section className="flex flex-col gap-4 rounded-xl border border-line bg-card p-5 no-print">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-semibold text-muted">모집건</span>
          <select value={campaignId} onChange={(e) => changeCampaign(e.target.value)} className={inputCls}>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold text-muted">기간 시작</span>
            <input type="date" value={period.from} onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold text-muted">기간 끝</span>
            <input type="date" value={period.to} onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))} className={inputCls} />
          </label>
        </div>
        <button type="button" onClick={() => generate(false)} disabled={busy} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#163BA3] disabled:opacity-60">
          {busy ? "생성 중…" : "원장에서 초안 생성"}
        </button>

        <div className="rounded-lg bg-[#F3F5F8] p-3">
          <div className="text-xs font-semibold text-muted">LLM에게 문장 다듬기 지시 (선택)</div>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={3}
            placeholder="예: 국민이 읽기 쉬운 말투로 요약 문단을 앞에 추가해줘. 수치는 그대로."
            className="mt-2 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => generate(true)} disabled={busy || !instruction.trim()} className="mt-2 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold hover:bg-white disabled:opacity-50">
            초안 생성 + LLM 다듬기
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            OpenAI 호환 API면 어떤 모델이든 연결됩니다(Gemma·EXAONE·HyperCLOVA X·GPT). LLM은 수치·판정을 바꾸지 못하고 문장만 다듬습니다.
            {llmConfigured === false && " 현재 미설정."}
          </p>
        </div>

        {notice && <p className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn">{notice}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={save} disabled={!body} className="flex-1 rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold hover:bg-[#F3F5F8] disabled:opacity-50">
            초안 저장
          </button>
          <button type="button" onClick={() => window.print()} disabled={!body} className="flex-1 rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold hover:bg-[#F3F5F8] disabled:opacity-50">
            인쇄 / PDF
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-line bg-card p-5">
        <div className="flex items-center gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="보고서 제목 (초안 생성 시 자동 입력)" className="flex-1 rounded-lg border border-line px-3 py-2 text-base font-bold" />
          <span className="rounded bg-[#F3F5F8] px-2 py-1 text-[11px] text-muted no-print">{generatedBy === "llm" ? "LLM 다듬음" : "템플릿"}</span>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={30}
          placeholder="왼쪽에서 모집건과 기간을 고르고 '원장에서 초안 생성'을 누르세요."
          className="min-h-[560px] w-full rounded-lg border border-line px-4 py-3 font-sans text-[14px] leading-relaxed"
        />
        <p className="text-xs text-muted no-print">게시 전 자동 점검: 수치는 원장과 일치하는지, 출처 없는 문장은 없는지, 개인정보(이름·연락처)가 들어가지 않았는지 확인합니다.</p>
      </section>
    </div>
  );
}
