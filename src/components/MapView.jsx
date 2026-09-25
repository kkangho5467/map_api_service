import { useEffect, useRef, useState } from 'react';
import { loadKakaoMap } from '../lib/kakaoLoader.js';
import { getCategoryName } from '../lib/placeInfo.js';

// 수원 행궁동 근처를 지도 첫 중심으로 사용합니다.
const DEFAULT_CENTER = { lat: 37.2819, lng: 127.0147 };

// 카테고리별 마커 아이콘(SVG 선 그림). 이모지는 기기마다 모양이 달라서 SVG로 통일합니다.
// stroke="currentColor" → CSS의 color(흰색)로 선이 그려집니다.
const svgIcon = (paths) => `
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const MARKER_ICONS = {
  // 포크 + 나이프
  restaurant: svgIcon('<path d="M7 3v7a2 2 0 0 0 2 2M7 3v18M4 3v7a2 2 0 0 0 2 2h2"/><path d="M18 21V3c-2 1.5-3 4-3 7h3"/>'),
  // 커피잔 + 김
  cafe: svgIcon('<path d="M4 10h12v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 11.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5v3M12 3.5v3"/>'),
  // 카메라
  spot: svgIcon('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>'),
};
// 표에 없는 카테고리가 들어와도 깨지지 않도록 기본 아이콘(점)을 둡니다.
const DEFAULT_ICON = svgIcon('<circle cx="12" cy="12" r="4"/>');

// 지도에 마커를 찍는 컴포넌트입니다.
// props(부모 App이 넘겨주는 값):
//  - places: 지도에 표시할 장소 배열
//  - selectedPlace: 현재 선택된 장소 (없으면 null)
//  - onSelectPlace: 마커를 눌렀을 때 부모에게 "이 장소 골랐어요"라고 알리는 함수
//  - onError: 지도 로드 실패를 부모에게 알리는 함수
export default function MapView({ places, selectedPlace, onSelectPlace, onError }) {
  // useRef로 실제 <div> 요소를 붙잡아 둡니다. 카카오 SDK는 이 div 안에 지도를 그립니다.
  const containerRef = useRef(null);
  // 만들어진 지도 객체. useState에 담아야 "지도가 준비됐다"는 변화에 따라 아래 effect들이 다시 실행됩니다.
  const [map, setMap] = useState(null);
  // 장소 id → { overlay, element, position } 기록. 화면에 그릴 값이 아니므로 useRef에 보관합니다.
  const markersRef = useRef(new Map());

  // ① 처음 한 번: SDK를 불러와 지도를 만듭니다.
  // useEffect(함수, [])  → 빈 배열은 "컴포넌트가 처음 화면에 나타났을 때 한 번만 실행"이라는 뜻입니다.
  useEffect(() => {
    // 개발 모드(StrictMode)에서는 effect가 두 번 실행될 수 있습니다.
    // 첫 번째 실행이 정리(cleanup)되면 cancelled를 true로 바꿔 지도를 중복 생성하지 않게 합니다.
    let cancelled = false;

    loadKakaoMap()
      .then((kakao) => {
        if (cancelled) return;
        const newMap = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: 5,
        });
        newMap.setDraggable(true); // 모바일에서 손가락으로 지도 이동 허용
        setMap(newMap);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
        onError?.(error);
      });

    // return 함수 = 정리(cleanup) 함수. 컴포넌트가 사라지거나 effect가 다시 실행되기 직전에 호출됩니다.
    return () => {
      cancelled = true;
    };
    // onError는 처음 한 번만 쓰면 되므로 의존성에서 일부러 뺐습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ② 화면 크기가 바뀌면(회전, 주소창 변화) 지도에게 크기를 다시 계산하라고 알려줍니다.
  useEffect(() => {
    if (!map) return;
    const handleResize = () => map.relayout();
    window.addEventListener('resize', handleResize);
    // 정리할 때 리스너를 꼭 제거해야 메모리 누수가 생기지 않습니다.
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);

  // ③ places가 바뀔 때마다(필터 변경 등) 마커를 전부 지우고 새로 찍습니다.
  // [map, places, onSelectPlace] → 이 값 중 하나라도 바뀌면 이 effect가 다시 실행됩니다.
  useEffect(() => {
    if (!map) return;
    const { kakao } = window;
    const records = markersRef.current;
    const bounds = new kakao.maps.LatLngBounds();

    places.forEach((place) => {
      const position = new kakao.maps.LatLng(place.lat, place.lng);

      // 카테고리 마커를 DOM 요소로 직접 만듭니다.
      // <button class="place-marker is-cafe"> + <span 핀(아이콘)> + <span 이름표> 구조이고,
      // 색·모양은 index.css의 .place-marker / .is-카테고리 클래스가 담당합니다.
      const element = document.createElement('button');
      element.type = 'button';
      element.className = `place-marker is-${place.category}`;
      element.setAttribute('aria-label', `${place.name} (${getCategoryName(place.category)})`);

      const pin = document.createElement('span');
      pin.className = 'marker-pin';
      // 우리가 직접 쓴 고정 SVG 문자열이라 innerHTML이어도 안전합니다.
      pin.innerHTML = MARKER_ICONS[place.category] ?? DEFAULT_ICON;

      // 이름은 textContent로 넣어야 DB 값에 HTML이 섞여 있어도 글자로만 보입니다(XSS 방지).
      const label = document.createElement('span');
      label.className = 'marker-label';
      label.textContent = place.name;
      element.append(pin, label);

      // 마커 클릭 → 부모(App)에게 선택 사실을 알립니다. 실제 화면 변화는 App의 state가 결정합니다.
      element.addEventListener('click', () => onSelectPlace(place));

      // CustomOverlay: 우리가 만든 요소를 지도 좌표 위에 띄워 줍니다.
      //  - yAnchor: 1 → 요소의 '아래 끝'이 좌표를 가리키게 (핀처럼)
      //  - clickable: true → 마커를 눌러도 지도가 클릭/드래그로 착각하지 않게
      const overlay = new kakao.maps.CustomOverlay({
        map,
        position,
        content: element,
        yAnchor: 1,
        clickable: true,
      });

      records.set(place.id, { overlay, element, position });
      bounds.extend(position);
    });

    if (places.length > 0) {
      // setBounds(범위, 위, 오른쪽, 아래, 왼쪽 여백 px)
      // 상단 바와 아래 목록 시트에 마커가 가려지지 않게 여백을 둡니다.
      map.setBounds(bounds, 140, 40, 240, 40);
    }

    // 정리 함수: 다음 실행 전에 이전 마커들을 지도에서 제거합니다.
    return () => {
      records.forEach(({ overlay }) => overlay.setMap(null));
      records.clear();
    };
  }, [map, places, onSelectPlace]);

  // ④ 선택된 장소가 바뀌면: 해당 마커만 강조(is-selected) → 그 위치로 부드럽게 이동
  useEffect(() => {
    if (!map) return;

    // 모든 마커를 돌면서 선택된 것만 is-selected 클래스를 붙이고 나머지는 뗍니다.
    markersRef.current.forEach(({ overlay, element }, id) => {
      const isSelected = id === selectedPlace?.id;
      element.classList.toggle('is-selected', isSelected);
      // 선택된 마커가 다른 마커에 가려지지 않도록 맨 위로 올립니다.
      overlay.setZIndex(isSelected ? 10 : 1);
    });

    const record = selectedPlace && markersRef.current.get(selectedPlace.id);
    if (record) map.panTo(record.position); // 필터로 숨겨진 장소면 이동하지 않습니다.
  }, [map, places, selectedPlace]);

  return <div id="map" ref={containerRef} aria-label="장소 지도" />;
}
