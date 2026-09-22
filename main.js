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
  window.kakao.maps.load(() => {
    const seoulPosition = new window.kakao.maps.LatLng(37.5665, 126.9780);
    const map = new window.kakao.maps.Map(mapElement, {
      center: seoulPosition,
      level: 7,
    });

    // 첫 번째 장소를 표시해 지도와 마커 연결이 작동하는지 확인합니다.
    new window.kakao.maps.Marker({
      map,
      position: seoulPosition,
    });

    statusElement.textContent = 'SEOUL MAP READY';
  });
});

kakaoScript.addEventListener('error', () => {
  statusElement.textContent = 'MAP SDK ERROR';
  console.error('카카오 지도 SDK를 불러오지 못했습니다. 웹 플랫폼 도메인과 JavaScript 키를 확인하세요.');
});

document.head.appendChild(kakaoScript);