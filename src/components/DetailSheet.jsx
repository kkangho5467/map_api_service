import { useState } from 'react';
import BottomSheet from './BottomSheet.jsx';
import { getCategoryName, getPlaceInsight, getVisitNote } from '../lib/placeInfo.js';

// 장소 상세 모달입니다. 시트의 '틀'(열기/닫기/스와이프)은 BottomSheet가 맡고,
// 이 컴포넌트는 '내용'(장소 정보, 공유/길찾기 버튼)만 신경 씁니다.
// props:
//  - place: 보여줄 장소 (null이면 빈 시트)
//  - open: 열림 여부
//  - onClose: 닫아 달라고 부모에게 요청하는 함수
export default function DetailSheet({ place, open, onClose }) {
  // 공유 버튼 글자('공유하기' → '복사 완료' 등). 바뀌면 화면에 보여야 하므로 useState를 씁니다.
  const [shareLabel, setShareLabel] = useState('공유하기');

  // 버튼 글자를 잠깐 바꿨다가 1.4초 뒤 원래대로 돌립니다.
  const flashShareLabel = (text) => {
    setShareLabel(text);
    window.setTimeout(() => setShareLabel('공유하기'), 1400);
  };

  // 카카오맵을 새 탭으로 엽니다. noopener: 열린 페이지가 우리 페이지를 조작하지 못하게 막는 보안 옵션
  // place_url(카카오 장소 상세 페이지)이 있으면 그 가게로 바로, 없으면 이름으로 검색합니다.
  const handleRoute = () => {
    if (!place) return;
    const url = place.place_url ?? `https://map.kakao.com/?q=${encodeURIComponent(place.name)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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
    <BottomSheet
      open={open}
      onClose={onClose}
      labelledBy="detail-name"
      footer={(
        <>
          <button className="detail-action" type="button" onClick={handleShare}>{shareLabel}</button>
          <button className="detail-action primary" type="button" onClick={handleRoute}>길찾기</button>
        </>
      )}
    >
      {/* place가 있을 때만 내용을 그립니다. */}
      {place && (
        <>
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
        </>
      )}
    </BottomSheet>
  );
}
