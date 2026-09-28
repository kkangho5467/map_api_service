import { useEffect, useState } from 'react';
import BottomSheet from './BottomSheet.jsx';
import { getCategoryName, getPlaceInsight, getVisitNote } from '../lib/placeInfo.js';

// 장소 상세 모달입니다. 시트의 '틀'(열기/닫기/스와이프)은 BottomSheet가 맡고,
// 이 컴포넌트는 '내용'(장소 정보, 공유/길찾기 버튼)만 신경 씁니다.
// props:
//  - place: 보여줄 장소 (null이면 빈 시트)
//  - open: 열림 여부
//  - onClose: 닫아 달라고 부모에게 요청하는 함수
//  - liked: 이 장소를 내가 찜했는지 여부
//  - onToggleLike: ♡를 눌렀을 때 부모에게 알리는 함수 (실패하면 에러를 던짐)
export default function DetailSheet({ place, open, onClose, liked = false, onToggleLike }) {
  // 공유 버튼 글자('공유하기' → '복사 완료' 등). 바뀌면 화면에 보여야 하므로 useState를 씁니다.
  const [shareLabel, setShareLabel] = useState('공유하기');
  const [likeError, setLikeError] = useState(null); // 찜 저장 실패 문구
  const [isPopping, setIsPopping] = useState(false); // 버튼 하트 효과(튀기·고리·떠오르는 하트) 재생 중?

  // 다른 장소를 열면 이전 장소의 에러 문구는 지웁니다.
  useEffect(() => {
    setLikeError(null);
    setIsPopping(false);
  }, [place?.id]);

  // ♡ 버튼: 저장 요청은 부모(useLikes)가 하고, 여기서는 실패했을 때 안내 문구만 보여줍니다.
  const handleLike = async () => {
    if (!place) return;
    setLikeError(null);
    // 찜을 "새로 할 때"만 효과를 재생합니다. (취소할 때는 조용히)
    if (!liked) setIsPopping(true);
    try {
      await onToggleLike(place);
    } catch (error) {
      setLikeError(error.message);
    }
  };

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
          {/* aria-pressed: "켜짐/꺼짐" 버튼임을 스크린리더에 알려줍니다. 하트 모양만으로는 뜻을 모르니 aria-label도 붙입니다. */}
          <button
            className={`detail-action like${isPopping ? ' pop' : ''}`}
            type="button"
            aria-pressed={liked}
            aria-label={liked ? '찜 취소' : '찜하기'}
            onClick={handleLike}
            // 애니메이션이 끝나면 pop 클래스를 떼어 둡니다. 그래야 다음에 붙일 때 다시 재생돼요.
            // (안쪽 떠오르는 하트의 종료 신호도 버튼까지 올라오지만, 모든 효과가 0.6초로 같아서 문제없어요)
            onAnimationEnd={() => setIsPopping(false)}
          >
            {liked ? '♥' : '♡'}
            {/* 찜할 때 버튼에서 위로 떠오르는 하트. 장식이라 스크린리더는 읽지 않게 aria-hidden */}
            {isPopping && <span className="like-float" aria-hidden="true">♥</span>}
          </button>
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
          {likeError && <p className="auth-error" role="alert">{likeError}</p>}

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
