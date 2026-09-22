import { supabase } from './supabaseClient.js';

// Vite가 .env에서 VITE_ 접두사가 붙은 환경변수를 읽어옵니다.
const kakaoAppKey = import.meta.env.VITE_KAKAO_MAP_API_KEY;
const mapElement = document.querySelector('#map');
const statusElement = document.querySelector('#map-status');

// 키가 비어 있으면 SDK 요청 자체를 보내지 않아 원인을 쉽게 확인할 수 있게 합니다.
if (!kakaoAppKey) {
  statusElement.textContent = 'KAKAO KEY NOT FOUND';
  throw new Error('VITE_KAKAO_MAP_API_KEY가 .env에 설정되지 않았습니다.');
}

// 카카오 지도 SDK를 동적으로 불러오면 키를 코드 곳곳에 반복해서 적지 않아도 됩니다.
const kakaoScript = document.createElement('script');
kakaoScript.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(kakaoAppKey)}&autoload=false`;
kakaoScript.async = true;

kakaoScript.addEventListener('load', () => {
  // SDK가 준비된 뒤 지도 객체를 생성해야 kakao.maps를 안전하게 사용할 수 있습니다.
  window.kakao.maps.load(async () => {
    const seoulPosition = new window.kakao.maps.LatLng(37.5665, 126.9780);
    const map = new window.kakao.maps.Map(mapElement, {
      center: seoulPosition,
      level: 7,
    });

    // 모바일에서도 손가락으로 지도를 상하좌우 이동할 수 있도록 드래그를 명시적으로 켭니다.
    map.setDraggable(true);

    // Supabase places 테이블에서 지도에 표시할 장소 목록을 조회합니다.
    const { data: places, error } = await supabase
      .from('places')
      .select('*');

    if (error) {
      console.error('장소 데이터 조회 실패:', error);
      statusElement.textContent = 'PLACES LOAD ERROR';
    } else {
      console.log('조회된 장소:', places);

      // 여러 장소가 모두 보이도록 지도 영역을 자동으로 계산합니다.
      const bounds = new window.kakao.maps.LatLngBounds();
      const categoryNames = {
        popup: '팝업스토어',
        festival: '축제',
        hotplace: '핫플레이스',
      };

      places.forEach((place) => {
        const position = new window.kakao.maps.LatLng(place.lat, place.lng);
        const marker = new window.kakao.maps.Marker({
          map,
          position,
        });
        const infoWindow = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:8px 12px; white-space:nowrap;">${place.name}<br><small>${categoryNames[place.category] ?? place.category}</small></div>`,
        });
        let isInfoWindowOpen = false;

        // 마커에 마우스를 올리면 장소 이름과 카테고리를 표시합니다.
        window.kakao.maps.event.addListener(marker, 'mouseover', () => {
          infoWindow.open(map, marker);
          isInfoWindowOpen = true;
        });

        // 마우스가 마커를 벗어나면 정보창을 닫습니다.
        window.kakao.maps.event.addListener(marker, 'mouseout', () => {
          infoWindow.close();
          isInfoWindowOpen = false;
        });

        // 모바일처럼 호버가 없는 환경에서는 마커를 탭해 장소 정보를 표시합니다.
        window.kakao.maps.event.addListener(marker, 'click', () => {
          if (isInfoWindowOpen) {
            infoWindow.close();
            isInfoWindowOpen = false;
          } else {
            infoWindow.open(map, marker);
            isInfoWindowOpen = true;
          }
        });

        bounds.extend(position);
      });

      if (places.length > 0) {
        map.setBounds(bounds);
        statusElement.textContent = `${places.length} PLACES READY`;
      } else {
        statusElement.textContent = 'NO PLACES FOUND';
      }
    }
  });
});

kakaoScript.addEventListener('error', () => {
  statusElement.textContent = 'MAP SDK ERROR';
  console.error('카카오 지도 SDK를 불러오지 못했습니다. 웹 플랫폼 도메인과 JavaScript 키를 확인하세요.');
});

document.head.appendChild(kakaoScript);