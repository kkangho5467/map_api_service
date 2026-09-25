import { useRef } from 'react';

// 커스텀 훅(Custom Hook): 여러 컴포넌트에서 반복되는 동작을 'use'로 시작하는 함수로 묶은 것입니다.
// 이 훅은 손가락을 누른 Y좌표와 뗀 Y좌표의 차이로 탭/위로 스와이프/아래로 스와이프를 구분합니다.
//
// 사용법: <div {...useSwipe({ onTap, onSwipeUp, onSwipeDown })}>
// → 돌려받은 이벤트 핸들러들을 요소에 펼쳐(...) 붙이면 됩니다.
export const useSwipe = ({ onTap, onSwipeUp, onSwipeDown }) => {
  // useRef: 값이 바뀌어도 화면을 다시 그리지 않는 '메모장'입니다.
  // 누른 위치는 화면에 보여줄 값이 아니므로 useState 대신 useRef를 씁니다.
  const startY = useRef(null);

  return {
    onPointerDown: (event) => {
      startY.current = event.clientY;
    },
    onPointerUp: (event) => {
      if (startY.current === null) return;
      const deltaY = event.clientY - startY.current; // 음수 = 위로, 양수 = 아래로
      startY.current = null;

      if (Math.abs(deltaY) < 10) onTap?.(); // 거의 안 움직임 → 탭
      else if (deltaY < 0) onSwipeUp?.();
      else onSwipeDown?.();
    },
    // 손가락이 화면 밖으로 나가는 등 동작이 취소되면 기록을 지웁니다.
    onPointerCancel: () => {
      startY.current = null;
    },
  };
};
