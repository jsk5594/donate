import type { Metadata } from "next";
import "./globals.css";
import { ChatLauncher } from "@/components/ChatLauncher";
import { Header } from "@/components/Header";
import { engineInfo } from "@/lib/ai/config";
import { sampleDonorCodes } from "@/lib/repository";

export const metadata: Metadata = {
  title: "기부 돋보기 | 투명한 기부, 따뜻한 세상",
  description: "기부받은 돈 = 쓰인 돈 + 잔액. 기부금이 올바르게 쓰이는지 누구나 확인하는 대차대조표형 공개 플랫폼",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className="flex min-h-full flex-col overflow-x-clip">
        <Header />
        <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col">
          <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">{children}</main>
        </div>
        <footer className="border-t border-line bg-card px-5 py-4 text-center text-xs text-muted">
          기부 돋보기 · 투명한 기부, 따뜻한 세상 · 기부자와 수혜자 이름은 가명으로 표시합니다
        </footer>
        {/* 모든 페이지 오른쪽 아래에 떠 있는 기부 도우미 */}
        <ChatLauncher engine={engineInfo()} sampleCode={sampleDonorCodes()[0]?.code} />
      </body>
    </html>
  );
}
