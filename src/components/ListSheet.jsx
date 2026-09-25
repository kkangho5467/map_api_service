import { useSwipe } from '../hooks/useSwipe.js';
import { getCategoryName, getTrafficBadge, getVisitSignal } from '../lib/placeInfo.js';

// 목록 바텀 시트: 평소엔 접혀 있고, 손잡이를 탭하거나 위로 쓸면 펼쳐집니다.
// props:
//  - places: 보여줄 장소 배열
//  - countText: 제목 옆 개수/상태 문구
//  - selectedId: 선택된 장소 id (해당 카드를 강조)
//  - expanded: 펼침 여부 (true/false)
//  - onExpandChange: 펼침 상태를 바꿔 달라고 부모에게 요청하는 함수
//  - onSelectPlace: 카드를 눌렀을 때 호출
export default function ListSheet({ places, countText, selectedId, expanded, onExpandChange, onSelectPlace }) {
  // 손잡이 제스처: 탭 → 토글, 위로 → 펼침, 아래로 → 접힘
  const swipeHandlers = useSwipe({
    onTap: () => onExpandChange(!expanded),
    onSwipeUp: () => onExpandChange(true),
    onSwipeDown: () => onExpandChange(false),
  });

  // 키보드 사용자(엔터/스페이스)용. 기본 click 동작은 막고 직접 토글합니다.
  // (클릭 이벤트까지 쓰면 터치 한 번에 pointer + click 이 둘 다 실행되어 두 번 토글되기 때문)
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onExpandChange(!expanded);
    }
  };

  return (
    // 템플릿 문자열로 조건부 클래스를 붙입니다. expanded가 true면 'list-sheet is-expanded'가 됩니다.
    <section className={`list-sheet ${expanded ? 'is-expanded' : ''}`} aria-label="장소 목록">
      <button
        className="sheet-handle"
        type="button"
        aria-expanded={expanded}
        aria-controls="place-list"
        onKeyDown={handleKeyDown}
        {...swipeHandlers}
      >
        <span className="sheet-title">
          <strong className="sheet-heading">오늘의 데이트 큐레이션</strong>
          <span className="sheet-count">{countText}</span>
        </span>
      </button>

      <div id="place-list" className="place-list" aria-live="polite">
        {places.map((place) => (
          <button
            key={place.id}
            type="button"
            className={`place-card ${place.id === selectedId ? 'is-active' : ''}`}
            onClick={() => onSelectPlace(place)}
          >
            {/* {place.name}처럼 중괄호로 넣은 값은 React가 자동으로 안전하게 처리합니다(XSS 방지).
                예전 innerHTML 방식과 가장 큰 차이점입니다. */}
            <span>
              <strong>{place.name}</strong>
              <span className="address">{place.address}</span>
              <span className="tagline">
                {getVisitSignal(place)} · {getCategoryName(place.category)}
              </span>
            </span>
            <span className="traffic">{getTrafficBadge(place)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
