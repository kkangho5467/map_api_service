// ─────────────────────────────────────────────────────────────
// 카카오 로컬 API로 행궁동 실제 장소를 검색해 SQL 파일로 만드는 스크립트
//
// 실행 방법 (프로젝트 폴더에서):
//   node --env-file=.env scripts/fetch-kakao-places.mjs
//
// 결과: supabase/03_seed_haenggung_places.sql 이 생성됩니다.
//       내용을 확인한 뒤 Supabase SQL Editor에서 실행하세요.
//
// ※ 브라우저가 아닌 '내 컴퓨터'에서만 도는 스크립트라서 REST API 키를 안전하게 쓸 수 있습니다.
//   (VITE_ 가 없는 환경변수는 Vite가 브라우저 코드에 넣지 않습니다)
// ─────────────────────────────────────────────────────────────
import { writeFile } from 'node:fs/promises';

const REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const OUTPUT_FILE = 'supabase/03_seed_haenggung_places.sql';

// 검색 중심: 행궁동(화성행궁 ~ 행리단길 사이), 반경 1km
const CENTER = { x: 127.0140, y: 37.2835 };
const RADIUS_M = 1000;

// ① 카테고리 검색: 중심 근처의 카페/음식점을 '정확도순'으로 가져옵니다.
//    category_group_code: CE7 = 카페, FD6 = 음식점 (카카오가 정한 코드)
const CATEGORY_SEARCHES = [
  { query: '행리단길 카페', groupCode: 'CE7', category: 'cafe', limit: 8 },
  { query: '행궁동 카페', groupCode: 'CE7', category: 'cafe', limit: 8 },
  { query: '행리단길 맛집', groupCode: 'FD6', category: 'restaurant', limit: 8 },
  { query: '행궁동 맛집', groupCode: 'FD6', category: 'restaurant', limit: 8 },
];

// ② 명소 검색: 이름으로 검색해서 이름이 일치하는 첫 번째 결과 1개만 씁니다.
const LANDMARKS = [
  '화성행궁', '방화수류정', '화홍문', '장안문', '화서문', '팔달문',
  '수원화성박물관', '수원시립미술관', '행궁동 벽화마을',
];

// 카카오 로컬 '키워드로 장소 검색' API 호출
const searchKeyword = async (params) => {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json');
  Object.entries({
    x: CENTER.x,
    y: CENTER.y,
    radius: RADIUS_M,
    sort: 'accuracy',
    size: 15,
    ...params,
  }).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${REST_API_KEY}` },
  });

  // 실패하면 카카오가 보낸 에러 내용을 그대로 보여줘서 원인(키 오류, 권한 등)을 바로 알 수 있게 합니다.
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`카카오 API 오류 (${response.status}): ${body}`);
  }
  const data = await response.json();
  return data.documents;
};

// 카카오 결과 1개 → 우리 places 테이블 형식으로 변환
const toPlace = (doc, category) => {
  // category_name 예: "음식점 > 카페 > 커피전문점" → 마지막 칸 "커피전문점"을 태그로 사용
  const subCategory = doc.category_name.split('>').pop().trim();
  return {
    kakaoPlaceId: doc.id,
    name: doc.place_name,
    category,
    lat: Number(doc.y),
    lng: Number(doc.x),
    address: doc.road_address_name || doc.address_name,
    placeUrl: doc.place_url,
    tags: ['행궁동', subCategory].filter(Boolean),
  };
};

// SQL 문자열 안의 작은따옴표(')는 두 개('')로 바꿔야 문법 오류/SQL 인젝션이 생기지 않습니다.
const sqlText = (value) => (value == null ? 'null' : `'${String(value).replaceAll("'", "''")}'`);
const sqlArray = (values) => `array[${values.map(sqlText).join(', ')}]::text[]`;

const buildSql = (places) => {
  const rows = places.map((p) => (
    `    (${sqlText(p.kakaoPlaceId)}, ${sqlText(p.name)}, ${sqlText(p.category)}, ${p.lat}, ${p.lng}, `
    + `${sqlText(p.address)}, ${sqlText(p.placeUrl)}, ${sqlArray(p.tags)})`
  ));

  return `-- ─────────────────────────────────────────────────────────────
-- Pop-Pin 03: 행궁동 실제 장소 데이터 (카카오 로컬 API 검색 결과)
-- 생성 시각: ${new Date().toISOString()}
-- scripts/fetch-kakao-places.mjs 로 자동 생성된 파일입니다.
-- Supabase SQL Editor에서 전체 실행하세요. 여러 번 실행해도 중복되지 않습니다.
-- ─────────────────────────────────────────────────────────────

-- 카카오 장소 id(중복 방지용)와 카카오맵 상세 페이지 주소를 저장할 칸을 추가합니다.
alter table public.places add column if not exists kakao_place_id text;
alter table public.places add column if not exists place_url text;
create unique index if not exists places_kakao_place_id_key on public.places(kakao_place_id);

-- 초기 샘플 장소(카카오 id 없음)와 맛집·카페·명소가 아닌 장소(축제 등)를 지웁니다.
-- reviews 테이블은 on delete cascade라서 지워진 장소의 리뷰도 함께 정리됩니다.
delete from public.places
where kakao_place_id is null
   or category not in ('restaurant', 'cafe', 'spot');

-- 앞으로는 이 세 카테고리만 저장되도록 DB 규칙(check 제약)을 겁니다.
alter table public.places drop constraint if exists places_category_check;
alter table public.places add constraint places_category_check
    check (category in ('restaurant', 'cafe', 'spot'));

insert into public.places (kakao_place_id, name, category, lat, lng, address, place_url, tags)
select *
from (
  values
${rows.join(',\n')}
) as new_place(kakao_place_id, name, category, lat, lng, address, place_url, tags)
-- 이미 같은 이름으로 들어가 있는 장소(초기 샘플 등)는 건너뜁니다.
where not exists (
  select 1 from public.places as existing where existing.name = new_place.name
)
on conflict (kakao_place_id) do nothing;
`;
};

const main = async () => {
  if (!REST_API_KEY) {
    throw new Error('.env에 KAKAO_REST_API_KEY가 없습니다. 카카오 디벨로퍼스의 REST API 키를 추가하세요.');
  }

  // 같은 장소가 여러 검색에 나올 수 있으므로 카카오 id 기준으로 중복을 제거합니다.
  const placesById = new Map();

  for (const search of CATEGORY_SEARCHES) {
    const docs = await searchKeyword({ query: search.query, category_group_code: search.groupCode });
    let added = 0;
    for (const doc of docs) {
      if (added >= search.limit) break;
      if (placesById.has(doc.id)) continue;
      placesById.set(doc.id, toPlace(doc, search.category));
      added += 1;
    }
    console.log(`✔ ${search.query}: ${added}곳`);
  }

  for (const name of LANDMARKS) {
    const docs = await searchKeyword({ query: name });
    // 공백을 빼고 비교: '행궁동 벽화마을' ↔ '행궁동벽화마을' 같은 표기 차이를 허용합니다.
    const normalized = name.replaceAll(' ', '');
    const match = docs.find((doc) => doc.place_name.replaceAll(' ', '').includes(normalized));
    if (!match) {
      console.warn(`✘ ${name}: 일치하는 결과 없음 (건너뜀)`);
      continue;
    }
    if (!placesById.has(match.id)) placesById.set(match.id, toPlace(match, 'spot'));
    console.log(`✔ ${name} → ${match.place_name}`);
  }

  const places = [...placesById.values()];
  await writeFile(OUTPUT_FILE, buildSql(places), 'utf8');
  console.log(`\n총 ${places.length}곳 → ${OUTPUT_FILE} 저장 완료`);
};

main().catch((error) => {
  console.error('❌', error.message);
  process.exitCode = 1;
});
