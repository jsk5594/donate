/**
 * 시·도 경계 GeoJSON을 화면용 SVG 경로로 바꿉니다 → src/lib/korea-map.json
 *
 * 광주·전남은 전남광주통합특별시(2026. 7. 1. 출범) 한 구역으로 합칩니다(아래 merged).
 * 원본: 통계청 센서스 경계 2018 (southkorea/southkorea-maps, kostat/2018/json/skorea-provinces-2018-geo.json)
 * 이 스크립트 전에 경계를 공유한 채 단순화합니다:
 *   npx mapshaper@0.6.102 provinces.json -simplify 4% keep-shapes -filter-islands min-area=8km2 -clean \
 *     -o simple.json format=geojson precision=0.0005
 *
 * 실행: node scripts/build-korea-map.mjs simple.json
 */
import { readFileSync, writeFileSync } from "node:fs";

const SCALE = 130;
const LON0 = 124.45;
const LAT0 = 38.75;
const LON_K = Math.cos((36.2 * Math.PI) / 180);
const project = ([lon, lat]) => [(lon - LON0) * LON_K * SCALE, (LAT0 - lat) * SCALE];
const r1 = (v) => Math.round(v * 10) / 10;

/** 코드 → 약칭, 현재 공식 명칭, 라벨 위치(경도, 위도) */
const REGIONS = {
  11: ["서울", "서울특별시", 126.98, 37.56],
  21: ["부산", "부산광역시", 129.13, 35.2],
  22: ["대구", "대구광역시", 128.58, 35.84],
  23: ["인천", "인천광역시", 126.5, 37.47],
  24: ["광주", "광주광역시", 126.84, 35.16],
  25: ["대전", "대전광역시", 127.42, 36.3],
  26: ["울산", "울산광역시", 129.27, 35.6],
  29: ["세종", "세종특별자치시", 127.22, 36.63],
  31: ["경기", "경기도", 127.38, 37.8],
  32: ["강원", "강원특별자치도", 128.3, 37.7],
  33: ["충북", "충청북도", 127.75, 36.85],
  34: ["충남", "충청남도", 126.8, 36.5],
  35: ["전북", "전북특별자치도", 127.15, 35.72],
  36: ["전남", "전라남도", 126.95, 34.75],
  37: ["경북", "경상북도", 128.8, 36.4],
  38: ["경남", "경상남도", 128.25, 35.3],
  39: ["제주", "제주특별자치도", 126.55, 33.38],
};

/** 내륙 동서 끝(태안 126.12 ~ 호미곶 129.58)의 가운데. 이 경도가 지도 가운데에 오도록 폭을 정함 */
const MAINLAND_CENTER_LON = 127.85;
/** 울릉도·독도는 실제 위치에 그리면 지도가 옆으로 길어져 경북 오른쪽 네모칸에 따로 표시 */
const INSET_FROM_LON = 130;
const INSET = { x: 552, y: 232, width: 118, height: 84 };
const ULLEUNG_CENTER = [130.865, 37.5];
const ULLEUNG_AT = { x: INSET.x + 36, y: INSET.y + 34 };
const ULLEUNG_ZOOM = 2.6;
const DOKDO_AT = { x: INSET.x + 92, y: INSET.y + 34 };
/** 독도는 작은 섬을 지우는 단계에서 빠지므로 경북 경로에 점으로 더함 */
const DOKDO_RADIUS = 5;

/** 울릉도를 네모칸 안으로 옮김 */
function projectInset(c) {
  const [x, y] = project(c);
  const [cx, cy] = project(ULLEUNG_CENTER);
  return [ULLEUNG_AT.x + (x - cx) * ULLEUNG_ZOOM, ULLEUNG_AT.y + (y - cy) * ULLEUNG_ZOOM];
}

function ringPath(ring, toXY = project) {
  const pts = [];
  for (const c of ring) {
    const [x, y] = toXY(c).map(r1);
    const last = pts.at(-1);
    if (!last || last[0] !== x || last[1] !== y) pts.push([x, y]);
  }
  if (pts.length < 3) return "";
  return `M${pts.map((p) => p.join(",")).join("L")}Z`;
}

const file = process.argv[2];
if (!file) throw new Error("사용법: node scripts/build-korea-map.mjs simple.json");
const geo = JSON.parse(readFileSync(file, "utf8"));

const regions = geo.features.map((f) => {
  const meta = REGIONS[f.properties.code];
  if (!meta) throw new Error(`알 수 없는 코드: ${f.properties.code}`);
  const [id, name, lon, lat] = meta;
  const polygons = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  let path = polygons.flatMap((poly) => poly.map((ring) => ringPath(ring, ring[0][0] > INSET_FROM_LON ? projectInset : project))).join("");
  if (id === "경북") {
    const { x, y } = DOKDO_AT;
    const r = DOKDO_RADIUS;
    path += `M${x - r},${y}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0Z`;
  }
  const [labelX, labelY] = project([lon, lat]).map(r1);
  return { id, name, path, labelX, labelY, code: f.properties.code };
});

/**
 * 전남광주통합특별시(2026. 7. 1. 출범, 「전남광주통합특별시 설치를 위한 특별법」) — 광주(24)와 전남(36)을 한 구역으로.
 * 2018년 경계 원본에서 광주는 전남 안의 구멍(안쪽 고리)이므로, 전남의 바깥 고리만 남기면 두 지역을 합친 모양이 됩니다.
 * 화면 약칭은 '전남광주'(법률상 약칭 '광주특별시'는 옛 광주광역시와 헷갈려 쓰지 않음).
 */
const jeonnam = geo.features.find((f) => f.properties.code === "36");
const jeonnamPolys = jeonnam.geometry.type === "Polygon" ? [jeonnam.geometry.coordinates] : jeonnam.geometry.coordinates;
const [mergedX, mergedY] = project([126.95, 34.75]).map(r1);
const merged = { id: "전남광주", name: "전남광주통합특별시", path: jeonnamPolys.map((poly) => ringPath(poly[0])).join(""), labelX: mergedX, labelY: mergedY };
const regionsOut = regions.filter((r) => r.code !== "24").map(({ code, ...r }) => (code === "36" ? merged : r));

const out = {
  width: Math.round(project([MAINLAND_CENTER_LON, LAT0])[0] * 2),
  height: Math.ceil(project([LON0, 32.95])[1]),
  inset: { ...INSET, labels: [{ name: "울릉도", x: ULLEUNG_AT.x, y: INSET.y + 74 }, { name: "독도", x: DOKDO_AT.x, y: INSET.y + 74 }] },
  regions: regionsOut,
};
writeFileSync("src/lib/korea-map.json", `${JSON.stringify(out)}\n`);
console.log(`src/lib/korea-map.json · ${regionsOut.length}개 시·도 · ${out.width}x${out.height} · ${Math.round(JSON.stringify(out).length / 1024)}KB`);
