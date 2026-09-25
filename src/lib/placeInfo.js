// 장소 데이터(place)를 화면에 보여줄 문구로 바꿔 주는 '순수 함수' 모음입니다.
// 순수 함수 = 같은 입력이면 항상 같은 결과를 돌려주고, 화면이나 외부 상태를 건드리지 않는 함수.
// 이렇게 화면(컴포넌트)과 계산 로직을 분리해 두면 테스트하기 쉽고 여러 곳에서 재사용할 수 있습니다.

// DB에 저장된 영어 카테고리 값을 한글 이름으로 바꾸는 표
export const CATEGORY_NAMES = {
  restaurant: '맛집',
  festival: '축제',
  cafe: '카페',
};

// 상단 필터 칩 목록. 배열로 두면 JSX에서 map()으로 반복해서 버튼을 그릴 수 있습니다.
export const FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'restaurant', label: '🍽 맛집' },
  { value: 'festival', label: '🎉 축제' },
  { value: 'cafe', label: '☕ 카페' },
];

// 카테고리 한글 이름 (표에 없으면 원래 값을 그대로 보여줍니다)
export const getCategoryName = (category) => CATEGORY_NAMES[category] ?? category;

// tags가 배열이 아닐 때(null 등)도 안전하게 검사하는 도우미
const hasTag = (place, tag) => Array.isArray(place.tags) && place.tags.includes(tag);

// 목록 카드에 보여줄 한 줄 방문 신호
export const getVisitSignal = (place) => {
  if (hasTag(place, '주차 불가')) return '대중교통 추천';
  if (hasTag(place, '주차 가능')) return '주차 가능';
  if (hasTag(place, '접근성')) return '접근성 확인';
  return '방문 정보 확인';
};

// 상세 모달의 혼잡도·교통·접근성 3칸 정보
// 아직 수집하지 않은 데이터는 추정값처럼 보이지 않도록 '준비 중'으로 표시합니다.
export const getPlaceInsight = (place) => ({
  crowd: hasTag(place, '주차 혼잡 예상') ? '주말 혼잡 예상' : '데이터 준비 중',
  transport: hasTag(place, '주차 불가')
    ? '주차 불가 · 공영주차장'
    : hasTag(place, '주차 가능')
      ? '무료 주차 가능'
      : '이동 정보 준비 중',
  access: hasTag(place, '접근성') ? '접근성 정보 확인' : '정보 준비 중',
});

// 상세 모달 하단의 방문 노트 문구
export const getVisitNote = (place) => (
  place.category === 'festival'
    ? '행사 당일 주변 교통과 혼잡도 데이터가 연결되면 방문 시간대를 추천할 예정입니다.'
    : '최신 후기와 운영시간을 연결하면 방문 전 판단에 필요한 정보를 한곳에서 확인할 수 있습니다.'
);

// 카드 오른쪽 작은 배지 문구
export const getTrafficBadge = (place) => (hasTag(place, '주차 불가') ? 'PARKING △' : 'ACCESS +');
