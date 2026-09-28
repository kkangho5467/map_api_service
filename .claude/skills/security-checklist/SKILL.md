---
name: security-checklist
description: Pop-Pin 코드를 커밋·배포하기 전, 또는 로그인·DB·Storage·외부 API 키를 다루는 코드를 작성/수정한 뒤 보안 점검을 할 때 사용. 사용자가 "보안 점검", "커밋 전 확인", "배포해도 돼?"라고 할 때도 사용.
---

# Pop-Pin 보안 점검 체크리스트

변경된 파일(`git status`, `git diff`)을 기준으로 아래를 순서대로 확인하고, 문제마다 파일:줄 위치와 고치는 방법을 보고한다.

## 1. 비밀 키 노출
- `.env` 값이나 키 문자열이 코드·SQL·md 파일에 하드코딩되지 않았는가 (`.env` 파일 자체는 열어서 값을 읽지 않는다. 이름 확인은 `grep -o "^[A-Z_]*=" .env`)
- `VITE_` 접두사는 **브라우저에 공개돼도 되는 값만**: Supabase URL, anon 키, 카카오 JavaScript 키
- 비밀 값은 `VITE_` 금지: `KAKAO_REST_API_KEY`, `NAVER_*`, service_role 키, AI API 키, 카카오 Client Secret(Supabase 대시보드에만)
- `.gitignore`에 `.env`, `supabasepw.md`, `PROGRESS_LOG.md` 유지

## 2. XSS
- DB·사용자 입력 값을 `innerHTML`, `dangerouslySetInnerHTML`에 넣지 않는다. JSX `{값}` 또는 `textContent` 사용
- 지도 CustomOverlay 등 DOM 직접 생성 시에도 이름·주소는 `textContent`
- `window.open`은 `'noopener,noreferrer'`

## 3. Supabase
- 새 테이블 RLS 활성화 + 정책 존재 (`supabase-migration` 스킬 기준)
- 프론트에서 다른 사용자 id를 조건으로 쓰는 쿼리는 RLS가 막아주는지 확인 (프론트 조건은 보안이 아니다)
- Storage 업로드 경로가 `${userId}/...` 형태인지

## 4. 에러 처리
- 모든 `await supabase...` 결과의 `error`를 확인하는가
- 네트워크/권한 실패 시 try/catch로 사용자에게 한글 안내, 콘솔에는 원본 에러
- 사용자가 취소한 동작(공유 AbortError 등)은 에러로 표시하지 않는다

## 5. 인증 흐름
- Supabase Redirect URLs에 새 도메인(프리뷰 등)이 필요한 변경인지
- 로그아웃 상태에서 로그인 전용 기능이 호출되지 않는가

## 마무리
- 더 깊은 점검이 필요하면 내장 `/security-review` 실행을 제안한다.
- 결과는 "문제 없음 / 수정 필요(목록)"로 짧게 보고한다.
