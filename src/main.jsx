import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Vite는 JS에서 CSS를 import 하면 자동으로 페이지에 적용해 줍니다.

// 앱의 시작점입니다. index.html의 <div id="root"> 안에 App 컴포넌트를 그려 넣습니다.
// StrictMode: 개발 중에만 동작하는 '검사 모드'로, 실수(정리 안 한 effect 등)를 일찍 발견하게 도와줍니다.
//             그래서 개발 모드에선 effect가 일부러 두 번 실행되기도 합니다. (배포 버전에선 한 번)
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 서비스 워커 등록 (앱 설치용). 배포 버전(PROD)에서만 등록합니다.
// 개발 중(npm run dev)에 등록하면 코드 수정이 바로 안 보이는 등 헷갈릴 수 있기 때문입니다.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // 화면이 다 뜬 뒤(load) 등록해서 첫 화면 로딩을 늦추지 않습니다.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      // 등록에 실패해도 웹사이트 사용에는 문제가 없으므로 콘솔에만 남깁니다.
      console.error('서비스 워커 등록 실패:', error);
    });
  });
}
