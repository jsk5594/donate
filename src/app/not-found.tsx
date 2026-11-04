import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3 py-10">
      <h1 className="text-xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-muted">모집건이 종료·삭제되었거나 주소가 잘못되었습니다.</p>
      <Link href="/" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
        홈으로
      </Link>
    </div>
  );
}
