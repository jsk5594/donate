import { MyDonations } from "./MyDonations";
import { getRepository, sampleDonorCodes } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function MyPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const samples = sampleDonorCodes();
  const initialCode = code && /^D-?[0-9A-Fa-f]{4}$/.test(code) ? code.toUpperCase() : undefined;
  const initialResult = initialCode ? await getRepository().findMyDonations(initialCode) : undefined;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">나의 기부내역</h1>
        <p className="mt-1 text-sm text-muted">기부 시 받은 기부코드(D-XXXX)를 입력하세요. 이름·연락처는 조회에 쓰이지 않고, 화면에도 가명으로만 표시됩니다.</p>
      </header>
      <MyDonations samples={samples} initialCode={initialCode} initialResult={initialResult} />
    </div>
  );
}
