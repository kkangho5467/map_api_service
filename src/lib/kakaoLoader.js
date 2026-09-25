// 카카오 지도 SDK를 '딱 한 번만' 불러오는 도우미입니다.
//
// 왜 필요할까요?
// React 컴포넌트는 화면이 다시 그려질 때마다 여러 번 실행될 수 있습니다.
// 그때마다 <script>를 새로 붙이면 SDK가 중복으로 로드되어 오류가 납니다.
// 그래서 첫 호출 때 만든 Promise(약속)를 변수에 저장해 두고, 이후엔 그것을 그대로 돌려줍니다.

let kakaoPromise = null;

export const loadKakaoMap = () => {
  // 이미 불러오는 중이거나 불러왔다면 같은 Promise를 재사용합니다.
  if (kakaoPromise) return kakaoPromise;

  kakaoPromise = new Promise((resolve, reject) => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_API_KEY;

    // 키가 없으면 SDK 요청을 보내지 않고 바로 실패 처리합니다.
    if (!appKey) {
      reject(new Error('VITE_KAKAO_MAP_API_KEY가 .env에 설정되지 않았습니다.'));
      return;
    }

    const script = document.createElement('script');
    // autoload=false: SDK 파일만 받고, 실제 지도 기능은 아래 kakao.maps.load()로 준비합니다.
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.async = true;

    // SDK 파일 로드 완료 → 지도 기능 준비 → resolve로 kakao 객체를 넘겨줍니다.
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao));

    script.onerror = () => {
      // 실패하면 다음 호출 때 다시 시도할 수 있도록 저장된 Promise를 비웁니다.
      kakaoPromise = null;
      reject(new Error('카카오 지도 SDK를 불러오지 못했습니다. 웹 플랫폼 도메인과 JavaScript 키를 확인하세요.'));
    };

    document.head.appendChild(script);
  });

  return kakaoPromise;
};
