import Link from "next/link";
import { notFound } from "next/navigation";
import { BalanceExplorer } from "@/components/BalanceExplorer";
import { HealthChecks } from "@/components/HealthChecks";
import { ScoreBadge, StatusBadge } from "@/components/HealthBadge";
import { fmtDate, pct, won } from "@/lib/format";
import { getRepository } from "@/lib/repository";
import { CHECK_COUNT, fundraisingCapLabel, goalRate, isStatutory, LEGAL_BASIS_INFO, legalFundraisingCap, registrationAuthority, STATUTE, usagePeriodEnd } from "@/lib/rules";
import { organizationByName, type Organization } from "@/lib/org-data";
import type { BalanceSheet, Campaign } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getRepository().getCampaignDetail(id);
  if (!detail) notFound();
  const { campaign, category, sheet, health } = detail;
  const t = sheet.inflow.total || 1;
  const ended = new Date(campaign.endDate) < new Date();
  const per10k = Math.round((sheet.outflow.program / t) * 10000);
  const cap = legalFundraisingCap(sheet.inflow.total);
  const org = organizationByName(campaign.organizer);

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-xs text-muted" aria-label="경로">
        <Link href="/" className="hover:text-primary">홈</Link> <span aria-hidden="true">›</span>{" "}
        <Link href={`/categories/${category.id}`} className="hover:text-primary">{category.name}</Link> <span aria-hidden="true">›</span> {campaign.title}
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <StatusBadge status={campaign.status} />
            <span className="rounded-full bg-[#E9EDF3] px-2 py-0.5 font-semibold text-foreground" title={LEGAL_BASIS_INFO[campaign.legalBasis].note}>
              근거법 {campaign.legalBasis}
            </span>
            <span>
              {isStatutory(campaign) ? "모집등록" : "관리번호"} {campaign.registrationNo}
            </span>
            <span>·</span>
            <span>{campaign.organizer}</span>
            <span>·</span>
            <span>{campaign.region}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{campaign.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-foreground/80">{campaign.purpose}</p>
          <p className="mt-1 text-xs text-muted">
            모집기간 {fmtDate(campaign.startDate)} ~ {fmtDate(campaign.endDate)}
            {campaign.completedAt && <> · 집행 완료 {fmtDate(campaign.completedAt)}</>} · 공개주기 {campaign.disclosureCycleDays}일 · 마지막 공개 {fmtDate(campaign.lastDisclosedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScoreBadge score={health.score} level={health.overall} size="md" />
          {org && (
            <Link href={`/organizations/${org.id}`} className="rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold hover:bg-[#F3F5F8]">
              AI 기관 살펴보기
            </Link>
          )}
          {campaign.status === "완료" && (
            <Link href={`/reports/${campaign.id}`} className="rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold hover:bg-[#F3F5F8]">
              AI 결산 보고서
            </Link>
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="기부받은 돈" value={won(sheet.inflow.total)} sub={`목표 대비 ${pct(goalRate(sheet, campaign.goal), 0)} · ${detail.donationCount}건`} />
        <Kpi label="기부됨 (사업수행비용)" value={won(sheet.outflow.program)} sub={`${pct(sheet.outflow.program / t)} · 1만원당 ${per10k.toLocaleString("ko-KR")}원`} accent="var(--out-program)" />
        <Kpi label="운영비 (일반관리비용)" value={won(sheet.outflow.admin)} sub={`${pct(sheet.outflow.admin / t)} · 세칙 한도 10%`} accent="var(--out-admin)" />
        <Kpi label="모금비용" value={won(sheet.outflow.fundraising)} sub={`${pct(sheet.outflow.fundraising / t)} · ${fundraisingCapLabel(campaign)} ${pct(cap, 0)}`} accent="var(--out-fundraising)" />
        <Kpi label="미집행 잔액" value={won(sheet.outflow.balance)} sub={campaign.status === "완료" ? "전액 집행 완료" : `${pct(sheet.outflow.balance / t)} · 계좌 잔액 일치`} accent="var(--out-balance)" />
      </section>

      <section className="rounded-xl border border-line bg-card p-5">
        <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-lg font-bold">이 모집건의 대차대조표</h2>
          <span className="text-sm text-muted">항목을 클릭하면 기부자·지출 카드가 펼쳐집니다.</span>
        </div>
        <BalanceExplorer sheet={sheet} donations={detail.donations} expenses={detail.expenses} campaignEnded={ended} height={400} />
      </section>

      {campaign.status === "예정" ? (
        <section className="rounded-xl border border-line bg-card p-5">
          <h2 className="text-lg font-bold">운영 세칙 판정</h2>
          <p className="mt-2 text-sm text-muted">진행 예정 모집건은 판정하지 않습니다. 모집이 시작되는 {fmtDate(campaign.startDate)}부터 {CHECK_COUNT}개 항목으로 판정합니다.</p>
        </section>
      ) : (
        <HealthChecks health={health} />
      )}

      <DonorNotice campaign={campaign} sheet={sheet} org={org} />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-line bg-card p-5">
          <h3 className="text-sm font-bold">최근 입금 5건</h3>
          <ul className="mt-3 divide-y divide-line text-sm">
            {detail.donations.slice(0, 5).map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2">
                <span>
                  <span className="font-semibold">{d.donorAlias}</span> <span className="text-xs text-muted">{d.donorType} · {fmtDate(d.donatedAt)}</span>
                </span>
                <span className="font-semibold tnum">{won(d.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-card p-5">
          <h3 className="text-sm font-bold">최근 지출 5건</h3>
          <ul className="mt-3 divide-y divide-line text-sm">
            {detail.expenses.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="font-semibold">{e.description}</span>{" "}
                  <span className="text-xs text-muted">
                    {e.type} · {e.statName} · {fmtDate(e.spentAt)} · {e.receiptId}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tnum">{won(e.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

/** 세제혜택 여부(세칙 제43조) — 고향사랑기부금은 세액공제, 그 외는 주관기관의 세제적격단체 지정 여부 */
function taxBenefitOf(campaign: Campaign, org: Organization | undefined): string {
  if (campaign.legalBasis === "고향사랑기부금법") return "있음(고향사랑기부금 세액공제, 조세특례제한법)";
  if (!org) return "모집기관에 문의(공익법인·공익단체 지정 여부 미등록)";
  return org.designated ? "있음(기획재정부 지정 공익법인·공익단체)" : "없음(세제적격단체 미지정, 영수증은 발급)";
}

/** 모집 고지 사항 — 기부금품법 제4조제6항·시행령 제5조의2의 9개 게시 항목(세칙 제41조) */
function DonorNotice({ campaign, sheet, org }: { campaign: Campaign; sheet: BalanceSheet; org: Organization | undefined }) {
  const statutory = isStatutory(campaign);
  const received = sheet.inflow.total;
  const cap = legalFundraisingCap(received);
  const frRatio = received ? sheet.outflow.fundraising / received : 0;
  const items: [string, string][] = [
    ["1. 모집자", org ? `${campaign.organizer} (${org.legalType})` : campaign.organizer],
    ["2. 등록청 · 등록번호", statutory ? `${registrationAuthority(campaign.goal)} · ${campaign.registrationNo}` : `모집등록 대상 아님(${campaign.legalBasis}) · 관리번호 ${campaign.registrationNo}`],
    ["3. 모집목적", campaign.purpose],
    ["4. 세제혜택 여부", taxBenefitOf(campaign, org)],
    ["5. 모집비용 충당비율", `${pct(frRatio)} 사용(${fundraisingCapLabel(campaign)} ${pct(cap, 0)}${frRatio > cap ? " 초과" : " 이내"})`],
    ["6. 결과 확인 방법", `이 페이지(${campaign.disclosureCycleDays}일마다 갱신)${statutory ? " · 1365기부포털 모집·사용 결과" : ""}`],
    ["7. 모집목표액", won(campaign.goal)],
    ["8. 모집기간", `${fmtDate(campaign.startDate)} ~ ${fmtDate(campaign.endDate)}`],
    ["9. 사용기간", statutory ? `${fmtDate(campaign.startDate)} ~ ${fmtDate(usagePeriodEnd(campaign.startDate))} (모집 기산일부터 2년 이내)` : `${LEGAL_BASIS_INFO[campaign.legalBasis].statute}에 따름`],
  ];
  const notes: string[] = [];
  if (statutory) {
    notes.push(
      received > STATUTE.auditOver
        ? "모집금액이 1억원을 넘어 사용완료 보고 때 회계감사보고서를 첨부합니다."
        : "모집금액이 1억원 이하라 사용완료 보고 때 회계감사보고서 대신 지출증빙서류를 첨부할 수 있습니다.",
    );
    notes.push(`모집 종료 후 ${STATUTE.completionReportDays}일 이내 모집완료 보고, 사용 완료 후 ${STATUTE.usageReportDays}일 이내 사용명세 보고를 합니다.`);
    if (campaign.goal >= STATUTE.inspectionFrom) notes.push("목표액이 50억원 이상이라 모집기간 중 등록청 검사를 받습니다.");
  } else {
    notes.push(LEGAL_BASIS_INFO[campaign.legalBasis].note);
  }
  return (
    <section className="rounded-xl border border-line bg-card p-5">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-lg font-bold">모집 고지 사항</h2>
        <span className="text-sm text-muted">기부하기 전에 알아야 할 9개 항목입니다.</span>
        <Link href="/rules/donor-notice" className="ml-auto text-xs text-primary hover:underline">
          세칙 제10장
        </Link>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[170px_1fr]">
        {items.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="min-w-0 font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-muted">
        {notes.map((n) => (
          <li key={n}>· {n}</li>
        ))}
        <li>· 기부금 영수증은 익명 기부이거나 기부자가 원하지 않는 경우를 빼고 발급되며, 모집·사용 결과는 공개됩니다.</li>
      </ul>
    </section>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted">
        {accent && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: accent }} aria-hidden="true" />}
        {label}
      </div>
      <div className="mt-1 text-lg font-bold tnum">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{sub}</div>
    </div>
  );
}
