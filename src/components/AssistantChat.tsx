"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AiEngineBadge } from "./AiEngineBadge";
import type { ChatLink } from "@/lib/ai/assistant";
import type { EngineInfo } from "@/lib/ai/config";

interface Msg {
  role: "user" | "assistant";
  content: string;
  links?: ChatLink[];
}

const GREETING: Msg = {
  role: "assistant",
  content: "안녕하세요, 기부 도우미입니다. 내 기부금이 어디에 쓰였는지, 어떤 모집건에 문제가 있는지, 기관을 믿어도 되는지 물어보세요.",
};

/** floating: 떠 있는 대화창용(테두리 없이 부모 높이를 채우고 대화 영역이 남는 높이를 차지) */
export function AssistantChat({ engine, sampleCode, floating = false, onClose }: { engine: EngineInfo; sampleCode?: string; floating?: boolean; onClose?: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [eng, setEng] = useState(engine);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  const suggestions = [
    "나의 기부내역 확인",
    ...(sampleCode ? [`${sampleCode} 기부내역 알려줘`] : []),
    "지금 문제 있는 모집건은?",
    "따뜻한이웃복지회 믿을 만해?",
    "운영비는 몇 %까지 괜찮아?",
  ];

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 첫 인사말은 모델에 보내지 않음
        body: JSON.stringify({ messages: next.slice(1).map(({ role, content }) => ({ role, content })) }),
      });
      const data = (await res.json()) as { reply?: string; links?: ChatLink[]; engine?: EngineInfo; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error ?? "답변을 받지 못했습니다.");
      if (data.engine) setEng(data.engine);
      setMsgs((m) => [...m, { role: "assistant", content: data.reply!, links: data.links }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: e instanceof Error ? e.message : "오류가 발생했습니다." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`flex h-full flex-col bg-card ${floating ? "" : "rounded-xl border border-line"}`} aria-label="기부 도우미 챗봇">
      <header className={`flex flex-wrap items-center gap-2 border-b border-line px-5 py-3 ${floating ? "bg-[#15202B] text-white [&_.text-muted]:text-[#B9C4D3]" : ""}`}>
        <h2 className="text-base font-bold">기부 도우미</h2>
        <span className="text-xs text-muted">원장 데이터로만 답합니다</span>
        <span className="ml-auto">
          <AiEngineBadge engine={eng} />
        </span>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="대화창 닫기" className="-mr-2 flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-[#F3F5F8] hover:text-foreground">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </header>

      <div ref={listRef} className={`flex flex-col gap-3 overflow-y-auto px-5 py-4 ${floating ? "min-h-0 flex-1" : "h-80"}`} aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-primary text-white" : "bg-[#F3F5F8] text-foreground"}`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.links && m.links.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.links.map((l) => (
                    <Link key={l.href} href={l.href} className="rounded-md border border-line bg-card px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-soft">
                      {l.label} →
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-[#F3F5F8] px-4 py-2.5 text-sm text-muted">원장을 조회하고 답변을 작성하는 중…</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-line px-5 pt-3">
        {suggestions.map((s) => (
          <button key={s} type="button" disabled={busy} onClick={() => send(s)} className="rounded-full border border-line px-3 py-1 text-xs hover:border-primary hover:text-primary disabled:opacity-50">
            {s}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2 px-5 pb-4 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label htmlFor={`chat-input${floating ? "-floating" : ""}`} className="sr-only">
          질문 입력
        </label>
        <input
          id={`chat-input${floating ? "-floating" : ""}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="예: D-1A2B3C4D 내 기부금 어디에 쓰였어?"
          maxLength={500}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-line px-4 py-2.5 text-sm"
        />
        <button type="submit" disabled={busy || !input.trim()} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#163BA3] disabled:opacity-60">
          보내기
        </button>
      </form>
    </section>
  );
}
