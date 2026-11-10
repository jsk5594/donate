import { TERMS, type TermKey } from "@/lib/terms";

/** 쉬운 말을 보여 주고, 마우스를 올리면 원래 용어를 보여 줌(점선 밑줄) */
export function Term({ k, children }: { k: TermKey; children?: React.ReactNode }) {
  const t = TERMS[k];
  return (
    <abbr title={`원래 용어: ${t.orig}`} className="cursor-help underline decoration-dotted decoration-[#9AA6B5] underline-offset-[3px]">
      {children ?? t.label}
    </abbr>
  );
}
