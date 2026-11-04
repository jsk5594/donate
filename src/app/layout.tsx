import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Sidebar, type SidebarCategory, type SidebarGroup } from "@/components/Sidebar";
import { getRepository } from "@/lib/repository";
import { PHASES, phaseOf } from "@/lib/types";

export const metadata: Metadata = {
  title: "기부CCTV — 투명한 기부금 모니터링",
  description: "기부받은 돈 = 쓰인 돈 + 잔액. 기부금이 올바르게 쓰이는지 누구나 확인하는 대차대조표형 공개 플랫폼",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const overview = await getRepository().getOverview();
  // 사이드바: 진행중 / 진행 예정 / 완료 3개 그룹 → 그룹 안에서 항목별로 나열
  const groups: SidebarGroup[] = PHASES.map((phase) => {
    const categories: SidebarCategory[] = overview.categories
      .map((c) => {
        const list = c.campaigns.filter((s) => phaseOf(s.campaign.status) === phase);
        if (phase === "진행 예정") list.sort((a, b) => a.campaign.startDate.localeCompare(b.campaign.startDate));
        return {
          id: c.category.id,
          name: c.category.name,
          received: list.reduce((a, s) => a + s.sheet.inflow.total, 0),
          campaigns: list.map((s) => ({
            id: s.campaign.id,
            title: s.campaign.title,
            region: s.campaign.region,
            status: s.campaign.status,
            startDate: s.campaign.startDate,
            health: s.health.overall,
            received: s.sheet.inflow.total,
          })),
        };
      })
      .filter((c) => c.campaigns.length > 0);
    return { phase, count: categories.reduce((a, c) => a + c.campaigns.length, 0), categories };
  });

  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className="flex min-h-full flex-col">
        <Header />
        <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:flex-row">
          <Sidebar groups={groups} />
          <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">{children}</main>
        </div>
        <footer className="border-t border-line bg-card px-5 py-4 text-center text-xs text-muted">
          기부CCTV · 모든 수치는 가상 데이터입니다 · 기부자·수혜자 이름은 가명처리되어 표시됩니다
        </footer>
      </body>
    </html>
  );
}
