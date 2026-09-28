// 서비스 워커: 브라우저가 이 사이트를 "설치 가능한 앱"으로 인정하게 해 주는 백그라운드 스크립트입니다.
// 일부러 아무것도 저장(캐시)하지 않습니다.
// → 로그인 상태·찜 목록 같은 데이터가 옛날 값으로 보이거나, 배포 후에도 예전 화면이 뜨는 문제를 막기 위해서입니다.
// (오프라인 지원은 지도·DB가 모두 온라인이라 의미가 없어 넣지 않았습니다)

// 새 버전이 설치되면 기다리지 않고 바로 적용합니다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// 모든 요청은 평소처럼 네트워크로 보냅니다. (가로채서 바꾸는 일 없음)
self.addEventListener('fetch', () => {});
