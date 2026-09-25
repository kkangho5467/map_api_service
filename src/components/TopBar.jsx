import { FILTERS } from '../lib/placeInfo.js';

// 상단 바: 로고 + 현재 지역 + 카테고리 필터 칩 + 지도 상태 표시
// props:
//  - activeCategory: 지금 선택된 필터 값 ('all', 'cafe' 등)
//  - onChangeCategory: 필터를 눌렀을 때 부모에게 새 값을 알리는 함수
//  - statusText: 지도/데이터 로딩 상태 문구
export default function TopBar({ activeCategory, onChangeCategory, statusText }) {
  return (
    <header className="top-bar">
      <div className="top-row">
        {/* JSX에서는 class 대신 className을 씁니다. (class는 자바스크립트 예약어라서) */}
        <a className="brand" href="/">POP<span>·</span>PIN</a>
        <span className="area-chip">📍 수원 행궁동</span>
      </div>

      <div className="filters" role="tablist" aria-label="장소 카테고리">
        {/* FILTERS 배열을 map()으로 돌며 버튼을 하나씩 만듭니다.
            key는 React가 "어떤 버튼이 어떤 버튼인지" 구분하는 이름표로, 반복 요소에는 꼭 필요합니다. */}
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            className="filter"
            type="button"
            role="tab"
            aria-selected={activeCategory === filter.value}
            onClick={() => onChangeCategory(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <span className="map-status">{statusText}</span>
    </header>
  );
}
