# 기부CCTV — 투명한 기부금 모니터링 (Next.js)

기부받은 돈(좌변) = 쓰인 돈(사업수행비용·일반관리비용·모금비용) + 미집행 잔액(우변).
모든 모집건을 **대차대조표 형식**으로 공개하고, 운영 세칙(국내 법령 + 해외 기준)으로 자동 판정하는 서비스입니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Node 20+ 권장. 현재는 **가상 데이터**로 동작하며 외부 서비스 없이 바로 실행됩니다.

## 화면 구성

| 경로 | 내용 |
|---|---|
| `/` | 총 기부받은 금액·총 기부된 금액(큰 숫자+도넛), 전체 대차대조표(항목 클릭 → 카드), 실시간 기부 티커, 확인 필요 모집건, 항목별 카드 |
| `/categories/[id]` | 항목(재난·고향사랑·복지·교육·환경) 합산 대차대조표 |
| `/campaigns/[id]` | 세부 항목(거제도 홍수 등) 대차대조표, 운영 세칙 6개 항목 판정, 최근 입출금 |
| `/monitor` | 전체 모집건 판정 표(위반·주의·양호) |
| `/rules`, `/rules/[slug]` | 기부금 운영 세칙 게시판(8개 장) |
| `/reports`, `/reports/[id]`, `/reports/new` | 공개보고서 목록·열람·작성(원장 기반 초안 + 선택적 LLM 다듬기) |
| `/my` | 나의 기부내역(기부코드 D-XXXX 조회, 내 기부금의 비례 배분) |
| `/api/live`, `/api/my`, `/api/campaigns/[id]`, `/api/reports/draft` | 티커·본인조회·오픈API·보고서 초안 |

## 구조

```
src/lib/types.ts         도메인 타입 (DB 매핑 기준)
src/lib/mock-data.ts     가상 데이터 생성기(시드 고정) — DB 연결 후 제거
src/lib/repository.ts    저장소 인터페이스 + MockRepository. 페이지는 이 모듈만 호출
src/lib/pseudonymize.ts  가명처리(김*성, ㈜한*전자) + 기부코드(D-XXXX) 생성
src/lib/rules.ts         판정 규칙(법정 모금비용 한도, 운영비 10%, 사업비 65%, 잔액, 공개주기)
src/lib/rules-content.ts 운영 세칙 게시판 본문
src/lib/report.ts        보고서 초안(개조식) 생성
src/lib/ai.ts            OpenAI 호환 LLM 연결(선택) — 문장 다듬기만, 수치 변경 불가
src/components/          BalanceSheetChart(대차대조표), BalanceExplorer(클릭→카드), LiveDonationTicker, Sidebar ...
```

## DB로 교체하기

1. `src/lib/types.ts`의 `DonationRecord`, `ExpenseRecord`, `Campaign`, `Category` 구조로 테이블을 설계합니다.
2. `src/lib/repository.ts`에 `DbRepository implements Repository`를 추가하고 `getRepository()`에서 반환합니다.
3. **가명처리는 반드시 저장소 계층에서** `toPublicDonation` / `toPublicExpense`를 거쳐 내보냅니다. 원본 이름·연락처는 API 응답과 React 컴포넌트에 전달되지 않습니다.
4. 실시간 티커는 `getLiveDonations()`를 "최근 N건 DESC" 쿼리로 바꾸면 됩니다(폴링 5초, 필요 시 SSE).
5. 보고서 초안 저장은 현재 브라우저(localStorage)이며, DB 연결 후 서버 저장으로 전환합니다.

## 운영 세칙 근거

- 「기부금품의 모집ㆍ사용 및 기부문화 활성화에 관한 법률」 제12조(목적 외 사용 금지·사용기간 2년), 제13조(모집비용 15% 이내에서 시행령 비율), 제14조(공개의무·감사보고서)
- 같은 법 시행령의 모집금액 구간별 모집비용 비율(10억 이하 15% / ~100억 13% / ~200억 12% / 200억 초과 10%) — 제출 전 국가법령정보센터에서 최신 조문 재확인
- 공익법인회계기준(기획재정부 고시) 운영성과표의 비용 3분류: 사업수행비용 / 일반관리비용 / 모금비용
- BBB Wise Giving Alliance Standards for Charity Accountability: 총지출의 65% 이상 프로그램, 모금비용 35% 이하, 적립금 3배 한도

## LLM 연결(선택)

`.env.example`을 `.env.local`로 복사하고 `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`를 설정하면 보고서 작성 화면의 "LLM 다듬기"가 동작합니다. Ollama(Gemma·EXAONE)·HyperCLOVA X·OpenAI 등 OpenAI 호환 API면 교체 가능합니다.

## 모의데이터 안내

- 모집건 17개(진행중 9개 + 진행 예정 3개 + 기부 완료 5개), 입금 약 5,600건, 지출 약 570건. 사이드바·홈·항목 페이지는 이 3단계(`phaseOf()` in `types.ts`)로 나눠 나열합니다.
- 진행 예정(`status: "예정"`) 모집건은 모집등록만 마친 상태라 입출금이 0건이며, 판정은 '모집 시작 전 입출금 0원' 한 항목만 봅니다.
- 기부 완료(`status: "완료"`) 모집건은 항목마다 1개씩 있습니다. 지출은 집행 완료일(`completedAt`)까지만 발생하고, 기부금과 이자수익을 전부 집행해 잔액은 0원입니다. 공개 판정은 공개주기 대신 '집행 완료 후 최종 결산 공개' 기준을 씁니다. 이름은 모두 가상이며 시드가 고정되어 매번 같은 데이터가 생성됩니다.
- 의도적으로 심은 이상 사례: 남해안 해양쓰레기 수거(모금비용 17.2% — 법정 한도 초과), 독거어르신 겨울나기(운영비 12.4% — 세칙 한도 초과, 공개 지연), 강원 산불 이재민 주거 지원(모집 종료 후 잔액 46%), 영양군 청년 정착 지원(사업비 비중 낮음 — 주의).
