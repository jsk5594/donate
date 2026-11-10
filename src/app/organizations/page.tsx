import Link from "next/link";
import { AuditTabs } from "@/components/AuditTabs";
import { TrustGradeBadge } from "@/components/TrustGradeBadge";
import { computeOrgMetrics, gradeOf } from "@/lib/ai/org-audit";
import { pct, wonShort } from "@/lib/format";
import { ORGANIZATIONS } from "@/lib/org-data";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const overview = await getRepository().getOverview();
  const rows = await Promise.all(ORGANIZATIONS.map(async (org) => ({ org, m: await computeOrgMetrics(org, overview.campaigns) })));
  rows.sort((a, b) => b.m.indicatorScore - a.m.indicatorScore);

  return (
    <div className="flex flex-col gap-6">
      <AuditTabs active="org" />
      <div className="-mt-2">
        <p className="max-w-3xl text-sm text-muted">
          기부하기 전에 모집기관의 지난 5년을 확인하세요. 연도별 결산 공시, 외부감사 의견, 행정처분 이력, 현재 모집건 판정을 바탕으로 AI가 점검 의견을 냅니다.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ org, m }) => {
          const g = gradeOf(m.indicatorScore);
          return (
            <Link key={org.id} href={`/organizations/${org.id}`} className="flex flex-col gap-3 rounded-xl border border-line bg-card p-5 hover:border-primary">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-base font-bold">{org.name}</div>
                  <div className="text-xs text-muted">
                    {org.legalType} · {org.founded}년 설립 · {org.field}
                  </div>
                </div>
                <TrustGradeBadge grade={g} />
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center">
                <Stat label="5년 평균 사업비" value={pct(m.avgProgram, 0)} />
                <Stat label="최근 운영비" value={pct(m.latestAdmin)} />
                <Stat label="처분·지적" value={`${m.majorIssues + m.minorIssues}건`} />
              </dl>
              <div className="flex items-center justify-between text-xs text-muted">
                <span>5년 모금 {wonShort(m.totalReceived)} · 현재 모집건 {m.currentCampaigns.length}개</span>
                <span className="font-semibold text-primary">AI 점검 의견 보기 →</span>
              </div>
            </Link>
          );
        })}
      </div>
      <p className="text-xs text-muted">등급은 지표 점수로 정합니다. 80점 이상은 신뢰 가능, 60~79점은 주의 필요, 60점 미만은 추가 확인 권장입니다. 사업비는 수입 대비 비율입니다.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#F7F8FA] px-2 py-2">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="text-sm font-bold tnum">{value}</dd>
    </div>
  );
}
