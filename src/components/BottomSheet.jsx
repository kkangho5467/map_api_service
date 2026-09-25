import { useEffect } from 'react';
import { useSwipe } from '../hooks/useSwipe.js';

// 아래에서 올라오는 모달 '틀'만 담당하는 공통 컴포넌트입니다.
// 상세 모달, MY(계정) 화면처럼 모양이 같은 시트를 여러 개 만들 때 이 틀을 재사용합니다.
// → 닫기 버튼, 스와이프 닫기, ESC 닫기, 배경 탭 닫기를 한 곳에서만 관리하면 됩니다.
//
// props:
//  - open: 열림 여부
//  - onClose: 닫아 달라고 부모에게 요청하는 함수
//  - labelledBy: 스크린리더가 시트 제목으로 읽을 요소의 id
//  - children: 시트 본문 (<BottomSheet>여기 들어가는 내용</BottomSheet>)
//  - footer: 하단 고정 버튼 영역 (없으면 생략)
export default function BottomSheet({ open, onClose, labelledBy, children, footer }) {
  // 머리 부분을 아래로 쓸면 닫힙니다.
  const swipeHandlers = useSwipe({ onSwipeDown: onClose });

  // 열려 있는 동안만 ESC 키로 닫을 수 있게 키보드 리스너를 붙입니다.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    // 닫히거나 사라질 때 리스너를 제거합니다. (안 하면 닫힌 시트도 ESC에 반응)
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    // 프래그먼트(<>...</>): 여러 요소를 불필요한 div 없이 한 번에 돌려줄 때 씁니다.
    <>
      <div className={`backdrop ${open ? 'is-open' : ''}`} onClick={onClose} />

      <section
        className={`detail-sheet ${open ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        <div className="detail-head" {...swipeHandlers}>
          <button className="detail-close" type="button" aria-label="닫기" onClick={onClose}>✕</button>
        </div>

        <div className="detail-body">{children}</div>

        {/* footer가 있을 때만 하단 버튼 영역을 그립니다. */}
        {footer && <div className="detail-actions">{footer}</div>}
      </section>
    </>
  );
}
