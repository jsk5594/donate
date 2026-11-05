/**
 * 최신 기부 뉴스 — 네이버 뉴스 검색 API
 * - 키는 .env.local 의 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET (코드·깃에 넣지 않음)
 * - API는 썸네일을 주지 않아, 기사 페이지의 대표 이미지(og:image)를 읽어 씁니다. 없으면 null.
 * - 키가 없으면 가상 기사(DEMO_ARTICLES)를 돌려주며, 화면에 '가상 데이터'로 표시하고 사이트 안의 가상 기사 페이지로 연결합니다.
 * - 호출 한도와 메인 페이지 속도를 위해 서버 메모리에 30분 보관합니다.
 */

const API_URL = "https://openapi.naver.com/v1/search/news.json";
const QUERY = "기부금";
const FETCH_COUNT = 30;
const SHOW = 3;
const TIMEOUT_MS = 4_000;
const THUMB_TIMEOUT_MS = 3_000;
/** 대표 이미지는 <head>에 있으므로 페이지 앞부분만 읽음 */
const THUMB_READ_BYTES = 300_000;
const TTL_MS = 30 * 60_000;
const ERROR_TTL_MS = 60_000;

export interface NewsItem {
  title: string;
  summary: string;
  /** 기사 주소. 가상 기사는 사이트 안의 /news/[id] */
  link: string;
  external: boolean;
  thumbnail: string | null;
  /** 언론사 이름은 API가 주지 않아 기사 주소의 도메인으로 표시 */
  source: string;
  publishedAt: string;
}

export type NewsResult = { status: "ok" | "demo"; items: NewsItem[] } | { status: "error" };

interface NaverItem {
  title?: string;
  description?: string;
  originallink?: string;
  link?: string;
  pubDate?: string;
}

/** API 연결 전 화면 확인용 가상 기사 (실제 보도가 아님) */
const DEMO_ARTICLES = [
  {
    id: "demo-1",
    title: "연말 기부 시즌 앞두고 '사용처 공개' 요구 커져",
    summary: "기부자들이 얼마를 냈는지보다 어디에 쓰였는지를 먼저 묻기 시작했다. 모금 단체들도 집행 내역 공개 주기를 앞당기고 있다.",
    source: "가상일보",
    hoursAgo: 1,
    body: [
      "연말 기부 시즌을 앞두고 기부금의 사용처를 구체적으로 공개해 달라는 요구가 커지고 있다. 기부자들은 모금액뿐 아니라 운영비와 모금비용이 얼마나 들었는지까지 확인하려는 모습이다.",
      "일부 모금 단체는 집행 내역을 정기적으로 공개하고, 잔액이 얼마나 남았는지도 함께 알리는 방식으로 대응하고 있다.",
    ],
  },
  {
    id: "demo-2",
    title: "소액 정기기부 참여자 증가세…20~30대 비중 확대",
    summary: "한 번에 큰 금액을 내기보다 매달 조금씩 기부하는 방식이 젊은 층을 중심으로 퍼지고 있다.",
    source: "가상경제",
    hoursAgo: 8,
    body: [
      "매달 적은 금액을 자동으로 내는 정기기부가 젊은 층을 중심으로 늘고 있다. 모바일 결제로 참여가 쉬워지고, 기부 결과를 바로 확인할 수 있는 서비스가 많아진 영향이다.",
      "모금 단체들은 일회성 캠페인보다 정기 후원자와의 소통을 강화하는 쪽으로 운영 방식을 바꾸고 있다.",
    ],
  },
  {
    id: "demo-3",
    title: "지역 복지단체, 겨울 난방비 모금 목표 조기 달성",
    summary: "주민과 지역 기업이 함께 참여하면서 모금 목표를 예정보다 빨리 채웠다. 지원 대상과 집행 일정도 공개할 계획이다.",
    source: "가상지역신문",
    hoursAgo: 20,
    body: [
      "한 지역 복지단체가 진행한 겨울 난방비 모금이 예정보다 일찍 목표를 채웠다. 주민의 소액 기부와 지역 기업의 후원이 이어진 결과다.",
      "단체는 모금액을 취약계층 난방비로 쓰고, 지원 대상 규모와 집행 일정을 공개하겠다고 밝혔다.",
    ],
  },
];

const thumbnailOf = (id: string) => `/news/${id}.svg`;
const publishedAtOf = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3_600_000).toISOString();

function demoNews(): NewsResult {
  return {
    status: "demo",
    items: DEMO_ARTICLES.map((a) => ({ title: a.title, summary: a.summary, link: `/news/${a.id}`, external: false, thumbnail: thumbnailOf(a.id), source: a.source, publishedAt: publishedAtOf(a.hoursAgo) })),
  };
}

export function getDemoArticle(id: string) {
  const a = DEMO_ARTICLES.find((x) => x.id === id);
  return a ? { title: a.title, source: a.source, body: a.body, thumbnail: thumbnailOf(a.id), publishedAt: publishedAtOf(a.hoursAgo) } : null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(s: string): string {
  return s.replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (whole, code: string) => {
    if (code[0] !== "#") return ENTITIES[code.toLowerCase()] ?? whole;
    const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
  });
}

/** API 문구의 <b> 강조 태그와 HTML 엔티티 제거 */
const cleanText = (s: string) => decodeEntities(s.replace(/<[^>]*>/g, "")).trim();

/** http(s) 주소만 허용 */
function safeUrl(raw: string | undefined): URL | null {
  try {
    const u = new URL(raw ?? "");
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

export function parseNaverNews(items: NaverItem[]): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const it of items) {
    const title = cleanText(it.title ?? "");
    const url = safeUrl(it.originallink) ?? safeUrl(it.link);
    const time = new Date(it.pubDate ?? "").getTime();
    // 같은 기사가 여러 매체에 실리면 첫 건만
    if (!title || !url || Number.isNaN(time) || seen.has(title)) continue;
    seen.add(title);
    out.push({ title, summary: cleanText(it.description ?? ""), link: url.href, external: true, thumbnail: null, source: url.hostname.replace(/^www\./, ""), publishedAt: new Date(time).toISOString() });
    if (out.length === SHOW) break;
  }
  return out;
}

/** HTML에서 대표 이미지 주소 추출. https만 허용(http 이미지는 브라우저가 막음) */
export function extractOgImage(html: string, pageUrl: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!/(?:property|name)\s*=\s*["']og:image(?::url)?["']/i.test(tag)) continue;
    const content = tag.match(/content\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const raw = decodeEntities(content?.[1] ?? content?.[2] ?? "").trim();
    if (!raw) continue;
    try {
      const u = new URL(raw, pageUrl);
      if (u.protocol === "https:") return u.href;
    } catch {
      // 잘못된 주소는 건너뜀
    }
  }
  return null;
}

/** 기사 페이지 앞부분만 읽어 대표 이미지를 찾음. 실패하면 썸네일 없이 표시 */
export async function fetchThumbnail(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, { signal: AbortSignal.timeout(THUMB_TIMEOUT_MS), cache: "no-store", headers: { Accept: "text/html" } });
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    let read = 0;
    while (read < THUMB_READ_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      read += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    await reader.cancel();
    return extractOgImage(html, res.url || pageUrl);
  } catch {
    return null;
  }
}

let cached: { result: NewsResult; expires: number } | null = null;

export async function getDonationNews(): Promise<NewsResult> {
  const id = (process.env.NAVER_CLIENT_ID ?? "").trim();
  const secret = (process.env.NAVER_CLIENT_SECRET ?? "").trim();
  if (!id || !secret) return demoNews();
  if (cached && cached.expires > Date.now()) return cached.result;

  let result: NewsResult;
  try {
    const url = `${API_URL}?query=${encodeURIComponent(QUERY)}&display=${FETCH_COUNT}&sort=date`;
    const res = await fetch(url, {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { items?: NaverItem[] };
    const items = parseNaverNews(body.items ?? []);
    const thumbnails = await Promise.all(items.map((n) => fetchThumbnail(n.link)));
    result = { status: "ok", items: items.map((n, i) => ({ ...n, thumbnail: thumbnails[i] })) };
  } catch (e) {
    console.error("뉴스 API 호출 실패:", e instanceof Error ? e.message : e);
    result = { status: "error" };
  }
  cached = { result, expires: Date.now() + (result.status === "ok" ? TTL_MS : ERROR_TTL_MS) };
  return result;
}
