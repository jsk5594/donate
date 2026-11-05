# 기부CCTV — 투명한 기부금 모니터링 (Next.js)

기부받은 돈(좌변) = 쓰인 돈(사업수행비용·일반관리비용·모금비용) + 미집행 잔액(우변).
모든 모집건을 **대차대조표 형식**으로 공개하고, 운영 세칙(국내 법령 + 해외 기준)으로 자동 판정하는 서비스입니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Node 22.13+ 필요(내장 `node:sqlite` 사용). 현재는 **가상 데이터**로 동작하며 외부 서비스 없이 바로 실행됩니다.

```bash
npm run db:seed    # 5개년 가상 데이터를 data/donation-cctv.db(SQLite)로 다시 생성
```

앱은 이 DB 파일을 읽고, 파일이 없으면 생성기(`mock-data.ts`)로 대체합니다.

## 화면 구성

| 경로 | 내용 |
|---|---|
| `/` | 총 기부받은 금액·총 기부된 금액(큰 숫자+도넛), 전체 대차대조표(항목 클릭 → 카드), 최근 기부 전광판(오른쪽→왼쪽으로 흐르는 띠), 기부 지도(시·도별 모집건, 지역을 누르면 접힌 상세, 경계는 `scripts/build-korea-map.mjs`로 생성), 확인 필요 모집건, 항목별 카드 |
| `/categories/[id]` | 항목(재난·고향사랑·복지·교육·환경) 합산 대차대조표 |
| `/campaigns/[id]` | 세부 항목(거제도 홍수 등) 대차대조표, 운영 세칙 6개 항목 판정, 최근 입출금 |
| `/status` | 기부 현황 조회(연도·항목·진행상황 체크, 나열형/폴더형) |
| `/status?tab=risk` | 기부 위기 감지: 위반·주의 모집건 표(연도·진행상황 조회, 머리글 클릭 정렬) |
| `/rules`, `/rules/[slug]` | 기부금 운영 세칙 게시판(8개 장) |
| `/` (챗봇) | **기부 도우미** — 기부코드·모집건·기관을 질문에서 찾아 원장을 조회하고 AI가 그 데이터로만 답변 |
| `/organizations`, `/organizations/[id]` | **주관기관 AI 감사** — 5년 결산 공시·외부감사·처분 이력·현재 판정을 AI가 해석해 신뢰 등급·근거·권고 제시 |
| `/reports`, `/reports/[id]` | **AI 결산 보고서** — 기부 완료 건을 AI가 자동 작성, 금액·비율 원장 대조 검증 통과 시 완료 7일 후 자동 게시 |
| `/donations` | 기부내역: 함께 만든 결과, 나의 기부내역(기부코드 D-XXXXXXXX 조회, 비례 배분, 나눔 단계, `?code=`로 바로 조회), 우수기부자(구분·항목·기간), 꾸준한 동행, 기부자들이 남긴 말 |
| `/donations/messages` | 기부자들이 남긴 말 모아보기(항목별) |
| `/api/live`, `/api/my`, `/api/campaigns/[id]`, `/api/chat`, `/api/organizations/[id]/audit` | 티커·본인조회·오픈API·챗봇·기관 감사 |

## 구조

```
src/lib/types.ts         도메인 타입 (DB 매핑 기준)
src/lib/mock-data.ts     가상 데이터 생성기(시드 고정, 2022~2026)
src/lib/db.ts            임시 DB 읽기(data/donation-cctv.db, node:sqlite)
src/lib/index-trend.ts   완료 모집건 기부투명도지수 시점별 재판정(월별·연별 추이)
scripts/seed-db.mjs      생성기 → SQLite 저장(npm run db:seed)
src/lib/repository.ts    저장소 인터페이스 + MockRepository. 페이지는 이 모듈만 호출
src/lib/pseudonymize.ts  가명처리(김*성, ㈜한*전자) + 기부코드(D-XXXXXXXX) 생성
src/lib/rules.ts         판정 규칙(법정 모금비용 한도, 운영비 10%, 사업비 65%, 잔액, 공개주기)
src/lib/rules-content.ts 운영 세칙 게시판 본문
src/lib/report.ts        결산 보고서 '사실 블록'(원장 수치) + 검증용 허용 금액 집합
src/lib/org-data.ts      주관기관 5년 이력(가상) — 결산·감사의견·처분
src/lib/ai/config.ts     AI 제공자 선택(.env.local) — 키 없으면 데모 모드
src/lib/ai/client.ts     OpenAI·Gemini·Claude 공통 호출(fetch, SDK 없음)
src/lib/ai/org-audit.ts  기능1 주관기관 감사(지표 계산 → AI 감사의견 JSON → 형식 검증)
src/lib/ai/assistant.ts  기능2 챗봇(질문에서 조회 대상 추출 → 원장 조회 → AI 답변)
src/lib/ai/report-writer.ts 기능3 결산 보고서 자동 생성·검증·게시
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

## AI 연결

`.env.local`(깃 제외, 양식은 `.env.example`)에 키를 넣고 개발 서버를 다시 시작하면 세 기능이 실제 모델로 동작합니다.

- `OPENAI_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` 중 하나 이상, 필요하면 `*_MODEL`
- `AI_PROVIDER`로 제공자 고정(비우면 키가 있는 첫 제공자). `OPENAI_BASE_URL`로 Ollama 등 OpenAI 호환 서버 연결 가능
- 키가 없으면 **데모 모드**: 같은 원장 지표로 규칙 기반 응답을 만들어 흐름을 시연하고, 화면에 "데모 모드(AI 미연결)"로 표시
- 신뢰 장치: AI에는 원장에서 조회한 데이터만 전달 · 감사의견은 JSON 형식 검증 · 결산 보고서는 본문 금액·비율을 원장과 대조해 불일치 시 게시하지 않음

## 뉴스 연결

메인 페이지 '최신 기부 뉴스' 카드는 [네이버 뉴스 검색 API](https://developers.naver.com/apps)를 씁니다. 애플리케이션을 등록(사용 API: 검색)한 뒤 `.env.local`의 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`에 넣고 개발 서버를 다시 시작하세요. 최신 기사 3건을 보여 주고, 누르면 언론사 원문으로 이동합니다. API가 썸네일을 주지 않아 기사 페이지의 대표 이미지(og:image)를 읽어 쓰며, 없으면 회색 칸으로 표시합니다. 키가 없으면 가상 기사를 '가상 데이터'로 표시하고 사이트 안의 가상 기사 페이지(`/news/[id]`)로 연결합니다. 응답은 서버 메모리에 30분 보관합니다.

## 모의데이터 안내

- 2022~2026년 5개년: 모집건 52개(진행중 9개 + 진행 예정 3개 + 기부 완료 40개), 입금 약 12,000건, 지출 약 2,200건. 과거 완료건의 기관별 성향은 주관기관 감사 데이터와 맞췄습니다(푸른바다=모금비용 높음, 따뜻한이웃=운영비 높음).
- 실시간 합성 기부는 일시 중지 상태입니다(`LiveDonationTicker.tsx`의 `LIVE_PAUSED`). 지금은 DB의 최근 기부를 보여줍니다.
- 진행 예정(`status: "예정"`) 모집건은 모집등록만 마친 상태라 입출금이 0건이며, 판정은 '모집 시작 전 입출금 0원' 한 항목만 봅니다.
- 기부 완료(`status: "완료"`) 모집건은 항목마다 1개씩 있습니다. 지출은 집행 완료일(`completedAt`)까지만 발생하고, 기부금과 이자수익을 전부 집행해 잔액은 0원입니다. 공개 판정은 공개주기 대신 '집행 완료 후 최종 결산 공개' 기준을 씁니다. 이름은 모두 가상이며 시드가 고정되어 매번 같은 데이터가 생성됩니다.
- 의도적으로 심은 이상 사례: 남해안 해양쓰레기 수거(모금비용 17.2% — 법정 한도 초과), 독거어르신 겨울나기(운영비 12.4% — 세칙 한도 초과, 공개 지연), 강원 산불 이재민 주거 지원(모집 종료 후 잔액 46%), 영양군 청년 정착 지원(사업비 비중 낮음 — 주의).
