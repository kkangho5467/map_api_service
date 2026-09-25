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
