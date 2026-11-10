import Link from "next/link";
import { AiEngineBadge } from "@/components/AiEngineBadge";
import { AuditTabs } from "@/components/AuditTabs";
import { scanAnomalies } from "@/lib/ai/anomaly-audit";
import { engineInfo } from "@/lib/ai/config";
import { scanPurpose } from "@/lib/ai/purpose-audit";
import { wonShort } from "@/lib/format";

export const dynamic = "force-dynamic";

/** AI 지출 점검 — 모집 목적 부합 점검 · 지출 패턴 점검 두 기능의 입구 */
export default async function AiAuditPage() {
  const [purpose, anomaly] = await Promise.all([scanPurpose(), scanAnomalies()]);
  const engine = engineInfo();
  const high = anomaly.findings.filter((f) => f.severity === "높음").length;
  const flagged = purpose.rows.reduce((s, r) => s + r.flagged, 0);
  const flaggedCampaigns = purpose.rows.filter((r) => r.flagged > 0).length;
  const anomalyCampaigns = new Set(anomaly.findings.map((f) => f.campaignId)).size;
  const anomalyAmount = anomaly.findings.reduce((s, f) => s + f.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <AuditTabs active="spend" />
      <div className="-mt-2">
        <AiEngineBadge engine={engine} />
        <p className="mt-2 max-w-3xl text-sm text-muted">비용 비율만으로는 지출 한 건 한 건이 제대로 쓰였는지 알 수 없습니다. 지출의 적요, 거래처, 금액, 처리 시각을 읽고 확인이 필요한 지출을 골라냅니다.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/ai-check/purpose" className="group rounded-xl border border-line bg-card p-5 hover:border-primary/50">
          <h2 className="text-lg font-bold group-hover:text-primary">모집 목적 부합 점검</h2>
          <p className="mt-1 text-sm text-muted">모집 목적과 맞지 않는 지출, 운영비나 모금비용을 사업비로 잡은 지출을 찾습니다.</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="검토한 사업비 지출" value={`${purpose.totalProgram.toLocaleString("ko-KR")}건`} />
            <Stat label="확인 필요 지출" value={`${flagged}건`} />
            <Stat label="해당 모집건" value={`${flaggedCampaigns}건`} />
          </div>
        </Link>
        <Link href="/ai-check/anomaly" className="group rounded-xl border border-line bg-card p-5 hover:border-primary/50">
          <h2 className="text-lg font-bold group-hover:text-primary">지출 패턴 점검</h2>
          <p className="mt-1 text-sm text-muted">분할 결제, 증빙번호 중복, 같은 금액 반복 지급 같은 거래 패턴을 찾아 기관에 확인할 내용을 정리합니다.</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="확인 신호(높음)" value={`${anomaly.findings.length}건 (${high})`} />
            <Stat label="해당 모집건" value={`${anomalyCampaigns}건`} />
            <Stat label="관련 금액" value={wonShort(anomalyAmount)} />
          </div>
        </Link>
      </section>

      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="text-base font-bold">판단 순서</h2>
        <ol className="mt-3 grid gap-3 text-sm md:grid-cols-3">
          <li className="rounded-lg bg-[#F7F8FA] p-3">
            <div className="font-semibold">1. 후보 선별</div>
            <p className="mt-1 text-muted">전체 지출을 거래 패턴과 비용 성격 기준으로 훑어 확인할 후보를 고릅니다.</p>
          </li>
          <li className="rounded-lg bg-[#F7F8FA] p-3">
            <div className="font-semibold">2. 내용 검토</div>
            <p className="mt-1 text-muted">모집 목적과 지출 내용을 함께 보고, 확인이 필요한 이유와 정상일 수 있는 경우, 기관에 물어볼 질문을 정리합니다.</p>
          </li>
          <li className="rounded-lg bg-[#F7F8FA] p-3">
            <div className="font-semibold">3. 설명과 확인</div>
            <p className="mt-1 text-muted">위법 판정이 아닙니다. 모집기관 설명과 등록청 확인을 거쳐 최종 판단합니다(운영 세칙 제28조).</p>
          </li>
        </ol>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#F7F8FA] px-2 py-2">
      <div className="text-base font-bold tnum">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
