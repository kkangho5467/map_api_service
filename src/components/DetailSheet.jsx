import { useEffect, useState } from 'react';
import { useSwipe } from '../hooks/useSwipe.js';
import { getCategoryName, getPlaceInsight, getVisitNote } from '../lib/placeInfo.js';

// 상세 모달(바텀 시트): 장소를 선택하면 아래에서 올라옵니다.
// props:
//  - place: 보여줄 장소 (null이면 내용 없이 빈 시트)
//  - open: 열림 여부
//  - onClose: 닫아 달라고 부모에게 요청하는 함수
export default function DetailSheet({ place, open, onClose }) {
  // 공유 버튼 글자('공유하기' → '복사 완료' 등). 바뀌면 화면에 보여야 하므로 useState를 씁니다.
  const [shareLabel, setShareLabel] = useState('공유하기');

  // 머리 부분을 아래로 쓸면 닫힙니다.
  const swipeHandlers = useSwipe({ onSwipeDown: onClose });

  // 모달이 열려 있는 동안만 ESC 키로 닫을 수 있게 키보드 리스너를 붙입니다.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // 버튼 글자를 잠깐 바꿨다가 1.4초 뒤 원래대로 돌립니다.
  const flashShareLabel = (text) => {
    setShareLabel(text);
    window.setTimeout(() => setShareLabel('공유하기'), 1400);
  };

  // 카카오맵 검색 결과를 새 탭으로 엽니다. noopener: 열린 페이지가 우리 페이지를 조작하지 못하게 막는 보안 옵션
  const handleRoute = () => {
    if (!place) return;
    const query = encodeURIComponent(place.name);
    window.open(`https://map.kakao.com/?q=${query}`, '_blank', 'noopener,noreferrer');
  };

  const handleShare = async () => {
    if (!place) return;
    const title = `${place.name} · Pop-Pin`;
    try {
      if (navigator.share) {
        // 모바일: 기기의 공유 창(카카오톡, 메시지 등)을 띄웁니다.
        await navigator.share({ title, text: place.address });
      } else {
        // PC 등 공유 창이 없는 환경: 클립보드에 복사합니다.
        await navigator.clipboard.writeText(`${title}\n${place.address}`);
        flashShareLabel('복사 완료');
      }
    } catch (error) {
      // 사용자가 공유 창을 그냥 닫으면 AbortError가 납니다. 정상 동작이므로 무시합니다.
      if (error.name === 'AbortError') return;
      console.error('공유 실패:', error);
      flashShareLabel('공유 실패');
    }
  };

  // place가 있을 때만 계산합니다. (&& 는 "앞이 참이면 뒤를 실행"하는 짧은 조건문)
  const insight = place && getPlaceInsight(place);

  return (
    // 프래그먼트(<>...</>): 여러 요소를 불필요한 div 없이 한 번에 돌려줄 때 씁니다.
    <>
      <div className={`backdrop ${open ? 'is-open' : ''}`} onClick={onClose} />

      <section
        className={`detail-sheet ${open ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-name"
      >
        <div className="detail-head" {...swipeHandlers}>
          <button className="detail-close" type="button" aria-label="닫기" onClick={onClose}>✕</button>
        </div>

        {/* place가 있을 때만 내용을 그립니다. */}
        {place && (
          <div className="detail-body">
            <p className="detail-kicker">PLACE BRIEF</p>
            <h2 id="detail-name">{place.name}</h2>
            <p className="detail-address">{place.address}</p>

            <div className="detail-tags">
              {(place.tags ?? []).map((tag) => (
                <span key={tag} className="detail-tag">#{tag}</span>
              ))}
            </div>

            <div className="insight-grid">
              <div className="insight">
                <span className="insight-label">예상 혼잡도</span>
                <strong className="insight-value">{insight.crowd}</strong>
              </div>
              <div className="insight">
                <span className="insight-label">교통·주차</span>
                <strong className="insight-value">{insight.transport}</strong>
              </div>
              <div className="insight">
                <span className="insight-label">접근성</span>
                <strong className="insight-value">{insight.access}</strong>
              </div>
            </div>

            <div className="detail-note">
              <h3>{getCategoryName(place.category)} 방문 노트</h3>
              <p>{getVisitNote(place)}</p>
            </div>
          </div>
        )}

        <div className="detail-actions">
          <button className="detail-action" type="button" onClick={handleShare}>{shareLabel}</button>
          <button className="detail-action primary" type="button" onClick={handleRoute}>길찾기</button>
        </div>
      </section>
    </>
  );
}
