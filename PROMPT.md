# Pop-Course 새 채팅 인수인계 프롬프트

아래 내용을 현재 VS Code workspace의 새 채팅에 그대로 붙여 넣고 작업을 이어가세요.

---

나는 `c:\Users\강호\Desktop\web_project`에서 Pop-Course 프로젝트를 개발 중이다. 이전 대화의 진행 상황을 이해하고, 기존 코드를 먼저 확인한 뒤 다음 작업을 이어서 진행해줘.

## 프로젝트 목표

- 개인 포트폴리오 제작을 최종 목표로 한다.
- 지도 기반 B2C/B2B 웹서비스의 구조와 사용자 경험을 참고한다.
- 단순히 장소를 지도에 표시하는 것을 넘어 사용자의 방문 판단을 돕는다.
- 핵심 사용자 가치:
  - 장소별 예상 혼잡도
  - 대중교통, 도보, 주차 등 교통 편의
  - 휠체어 접근성, 엘리베이터, 실내외 여부 등 접근성
  - 운영 기간, 태그, 최신 리뷰
  - 모바일에서도 편한 지도 조작과 장소 정보 확인
- 개발 판단 시 디자인보다 사용자의 편의성과 접근성을 우선한다.
- 세부 목표는 `PROJECT_GOALS.md`에 기록되어 있다.

## 기술 스택

- Frontend: HTML, CSS, Vanilla JavaScript, Vite
- 지도: Kakao Maps JavaScript SDK
- Database: Supabase PostgreSQL
- Data/API 예정: Naver Search API, Python FastAPI
- Deployment: Vercel

## 현재 구현 상태

- Git 저장소 초기화 및 GitHub `map_api_service` 연결 완료
- 기본 브랜치: `main`
- Vercel 운영 주소: `https://map-api-service.vercel.app`
- 카카오 지도 SDK 연결 및 Vercel 배포 완료
- 카카오 지도 서비스 활성화 문제를 해결함
- Supabase `places` 테이블에서 장소 데이터를 조회함
- Supabase 장소 데이터로 카카오 지도 마커를 생성함
- 장소가 모두 보이도록 지도 범위를 자동 조정함
- 데스크톱에서 마커에 마우스를 올리면 정보창 표시
- 모바일에서 마커를 탭하면 정보창 표시
- 모바일에서 한 손가락 드래그로 지도 이동
- 지도 확대 및 축소 지원
- 장소 조회 성공 시 `N PLACES READY` 상태 표시
- 현재 샘플 장소:
  - 성수 팝업 스튜디오
  - 홍대 거리 예술 축제
  - 서울숲 브런치 핫플
  - 버터스카이
- 버터스카이 정보:
  - 주소: 경기 수원시 영통구 매봉로49번길 51 1층
  - 카테고리: `hotplace`
  - 태그: 매탄동, 수원카페, 디저트카페, 수제디저트, 반려동물 동반, 주차 불가

## 주요 파일

- `index.html`: 서비스 화면과 지도 영역
- `main.js`: 카카오 지도 초기화, Supabase 장소 조회, 마커 및 정보창 이벤트
- `supabaseClient.js`: Supabase 클라이언트 생성
- `supabase/schema.sql`: 테이블 생성, RLS 전제, 중복 방지 샘플 장소 INSERT
- `PROJECT_GOALS.md`: 장기 목표와 사용자 가치
- `ROADMAP.md`: 주차별 개발 계획
- `PROGRESS_LOG.md`: 로컬 전용 진행 기록이며 GitHub에 올리지 않음
- `.env`: 로컬 비밀 설정이며 GitHub에 올리지 않음
- `.env.example`: 환경변수 이름과 예시

## 환경변수

로컬 `.env`에는 다음 이름이 사용된다. 실제 값은 절대 새 채팅이나 코드, GitHub에 출력하지 마라.

```env
VITE_KAKAO_MAP_API_KEY=카카오 JavaScript 키
VITE_SUPABASE_URL=https://프로젝트ref.supabase.co
VITE_SUPABASE_ANON_KEY=Supabase anon public 키
```

- `service_role` 키와 Supabase 데이터베이스 비밀번호는 절대 사용하지 않는다.
- Vercel에도 `VITE_KAKAO_MAP_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 등록해야 한다.
- Vercel 환경변수 수정 후에는 반드시 Redeploy한다.
- 카카오 JavaScript SDK 도메인은 로컬 주소와 Vercel 운영 주소가 등록되어 있어야 한다.

## 데이터베이스

- `places`: id, name, category, lat, lng, address, start_date, end_date, tags, image_url, created_at
- `reviews`: id, place_id 외래키, title, link, snippet, published_date, created_at
- `reviews.place_id`는 `places.id`를 참조하고 장소 삭제 시 리뷰도 삭제된다.
- `places`는 anon 사용자가 읽을 수 있도록 RLS SELECT 정책을 설정했다.
- `places` 조회가 0개이면 URL/ref 오타와 RLS 정책을 먼저 확인한다.
- 샘플 장소 INSERT는 같은 name과 category가 이미 있으면 다시 넣지 않도록 수정되어 있다.

## 최근 커밋 및 변경 상태

- 최근 커밋: `498d32f 모바일 오류 해결`
- 그 커밋에는 모바일 마커 탭 지원과 지도 드래그 설정이 포함되어 있다.
- 이후 `PROJECT_GOALS.md`, `README.md`, `supabase/schema.sql` 등에 로컬 변경이 있을 수 있으므로 작업 전 `git status`와 `git diff`를 확인한다.
- 사용자가 의도하지 않은 기존 변경사항은 되돌리지 않는다.
- `PROGRESS_LOG.md`, `.env`, `supabasepw.md`는 GitHub에 올리지 않는다.

## 다음 우선 작업

1. 현재 `git status`와 `git diff`를 확인한다.
2. Supabase SQL Editor에서 최신 `supabase/schema.sql`을 실행했는지 확인한다.
3. `places` 조회 결과가 4개인지 확인한다.
4. 로컬 또는 Vercel에서 장소 4개 마커가 보이는지 확인한다.
5. 카테고리 필터 UI를 구현한다: 전체, 팝업스토어, 축제, 핫플레이스.
6. 모바일에서 마커 탭과 지도 드래그를 테스트한다.
7. 이후 장소 상세 모달, 혼잡도, 교통 편의, 접근성 정보를 단계적으로 추가한다.

## 작업 규칙

- 코드 수정 전 동작 원리와 데이터 흐름을 한국어로 2~3줄 설명한다.
- 초보자가 이해할 수 있도록 주요 코드에 한국어 주석을 추가한다.
- API 키와 비밀번호는 환경변수로 관리한다.
- 오류 처리를 포함한다.
- 기존 구조와 스타일을 존중하고, 요청과 관련된 최소 범위만 수정한다.
- 편집 후에는 가능한 가장 좁은 검증을 먼저 실행한다.
- 일반적인 검증 명령:

```powershell
npm run build
git diff --check
git status --short --branch
```

- 사용자가 명시적으로 요청하지 않으면 커밋이나 push를 하지 않는다.
- 복습 퀴즈를 내지 않는다.
- 진행 로그는 로컬에서만 관리하고 GitHub에 올리지 않는다.

## 새 채팅의 첫 응답에서 할 일

1. 위 내용을 이해했다고 짧게 확인한다.
2. `git status`, 관련 파일, 사용자의 최신 요청을 확인한다.
3. 현재 작업을 한 문장으로 정리한다.
4. 가장 작은 다음 작업을 제안하고, 사용자가 요청하면 바로 실행한다.
