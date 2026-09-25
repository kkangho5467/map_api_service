import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 설정 파일입니다.
// react() 플러그인은 브라우저가 이해하지 못하는 JSX(<div>처럼 JS 안에 쓰는 HTML) 문법을
// 일반 자바스크립트로 바꿔 주고, 코드를 저장하면 새로고침 없이 화면에 즉시 반영(HMR)해 줍니다.
export default defineConfig({
  plugins: [react()],
});
