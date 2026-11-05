"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AssistantChat } from "./AssistantChat";
import type { EngineInfo } from "@/lib/ai/config";

/**
 * 오른쪽 아래에 떠 있는 기부 도우미 말풍선.
 * 누르면 화면 위에 대화창이 열림. 대화창은 닫아도 언마운트하지 않아 대화 내용이 유지됨.
 */
export function ChatLauncher({ engine, sampleCode }: { engine: EngineInfo; sampleCode?: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Esc로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const ease = "duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";

  return (
    <>
      <div
        id={panelId}
        role="dialog"
        aria-label="기부 도우미 대화창"
        inert={!open}
        className={`fixed bottom-24 right-4 z-50 h-[min(620px,calc(100vh-8rem))] w-[min(400px,calc(100vw-2rem))] origin-bottom-right overflow-hidden rounded-2xl shadow-2xl transition-[transform,opacity] sm:right-6 ${ease} ${open ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0"}`}
      >
        <AssistantChat engine={engine} sampleCode={sampleCode} floating onClose={() => setOpen(false)} />
      </div>

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "기부 도우미 닫기" : "기부 도우미 열기"}
        className={`fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-[#163BA3] sm:right-6 ${open ? "" : "bubble-float"}`}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M6 6l10 10M16 6L6 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <path d="M4 6.5A3.5 3.5 0 017.5 3h11A3.5 3.5 0 0122 6.5v7a3.5 3.5 0 01-3.5 3.5H12l-5 4.5V17h0A3 3 0 014 14V6.5z" fill="currentColor" />
            <circle cx="9" cy="10" r="1.4" fill="#1F4FD8" />
            <circle cx="13" cy="10" r="1.4" fill="#1F4FD8" />
            <circle cx="17" cy="10" r="1.4" fill="#1F4FD8" />
          </svg>
        )}
      </button>
    </>
  );
}
