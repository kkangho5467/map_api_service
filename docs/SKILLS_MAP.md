# 스킬 지도 — 어디에 있고, 무슨 역할을 하나요?

> 현재 Claude Code에서 쓸 수 있는 스킬을 **위치(어디서 왔는지)** 별로 정리했습니다.
> 프로젝트 스킬의 자세한 설명은 [SKILLS_GUIDE.md](SKILLS_GUIDE.md)를 보세요.
> 기준일: 2026-09-28

---

## 한눈에 보기: 스킬은 3곳에서 옵니다

```
┌─ ① 프로젝트 스킬 ─────────────────────────────┐
│  web_project/.claude/skills/                    │  ← 이 프로젝트에서만 사용
│  git에 올라감 → 다른 PC에서도 동일              │     (Pop-Pin 전용 규칙)
└────────────────────────────────────────────────┘
┌─ ② 사용자 전역 플러그인 ───────────────────────┐
│  C:\Users\강호\.claude\plugins\                 │  ← 내 PC의 모든 프로젝트에서 사용
│  ~/.claude/settings.json 에서 켜고 끔           │
└────────────────────────────────────────────────┘
┌─ ③ 기본 제공 스킬 ────────────────────────────┐
│  Claude Code 내장 + Anthropic 계정 제공         │  ← 설치 없이 항상 있음
└────────────────────────────────────────────────┘
```

**우선순위:** 같은 일을 하는 스킬이 여러 개면 **프로젝트 스킬이 가장 구체적**이라 먼저 쓰입니다.

---

## ① 프로젝트 스킬 (Pop-Pin 전용) ⭐ 가장 자주 씀

| 스킬 | 파일 위치 | 역할 | 언제 자동으로 쓰이나 |
|---|---|---|---|
| `feature-kickoff` | `.claude/skills/feature-kickoff/SKILL.md` | 새 기능 시작 시 정책을 선택지로 묻고 스킬·MCP 포함 계획 수립 | "○○ 만들자", "다음 작업 진행하자" |
| `supabase-migration` | `.claude/skills/supabase-migration/SKILL.md` | DB 변경을 안전한 SQL 파일로 작성 (RLS 필수) | 테이블·정책·함수 추가/변경 |
| `security-checklist` | `.claude/skills/security-checklist/SKILL.md` | 키 노출·XSS·RLS·에러 처리 점검 | "보안 점검", "커밋 전", "배포해도 돼?" |
| `verify-app` | `.claude/skills/verify-app/SKILL.md` | 빌드 + 5173 포트 + 모바일 화면 확인 | "확인해줘", "화면 봐줘", 화면 수정 후 |
| `progress-log` | `.claude/skills/progress-log/SKILL.md` | `PROGRESS_LOG.md` 작업 일지 + `docs/features/` 설명 노트 | "기록해줘", 새 채팅 시작 시 |

---

## ② 사용자 전역 플러그인

| 스킬 | 위치 | 역할 |
|---|---|---|
| `andrej-karpathy-skills:karpathy-guidelines` | `~/.claude/plugins/cache/karpathy-skills/` (GitHub `multica-ai/andrej-karpathy-skills`) | **코드 작성 태도 가이드.** 과하게 복잡하게 만들지 않기, 요청한 부분만 정확히 고치기, 가정은 먼저 밝히기, "완료" 기준을 확인 가능하게 정하기 |

- 코드를 작성·리뷰·리팩터링할 때 참고됩니다.
- 끄려면 `~/.claude/settings.json`의 `enabledPlugins`에서 `false`로 바꾸면 됩니다.

---

## ③ 기본 제공 스킬 (필요할 때 `/이름`으로 호출)

### 이 프로젝트에서 쓸 만한 것
| 스킬 | 역할 | Pop-Pin에서 쓰는 상황 |
|---|---|---|
| `/code-review` | 변경된 코드의 버그 찾기 | 큰 기능(찜, 코스 추천) 완성 후 |
| `/security-review` | 더 깊은 보안 검토 | `security-checklist`로 부족할 때 |
| `/simplify` | 코드 중복·복잡도 정리 | 기능이 동작한 뒤 코드 다듬기 |
| `run` | 앱 실행해서 확인 | `verify-app`이 있으면 그걸 우선 사용 |
| `init` | CLAUDE.md 자동 생성 | 이미 있으므로 거의 안 씀 |

### Claude Code 설정 관련
| 스킬 | 역할 |
|---|---|
| `update-config` | `settings.json` 설정 변경 (권한 허용, 자동 실행 훅 등) |
| `fewer-permission-prompts` | 자주 쓰는 읽기 명령을 허용 목록에 추가해 확인창 줄이기 |
| `keybindings-help` | 단축키 변경 |
| `loop` / `schedule` | 반복 작업·예약 작업 |

### 문서·결과물 관련 (이 프로젝트와는 거의 무관)
`docx`, `pptx`, `xlsx`, `pdf`(파일 만들기), `docs`, `artifact-*`(웹 페이지 결과물), `dataviz`(차트), `claude-api`(Claude API 사용 시) 등

---

## 스킬은 아니지만 함께 쓰는 도구: MCP

**MCP = Claude가 외부 서비스에 직접 접속하는 연결 통로**입니다. 스킬이 "매뉴얼"이라면 MCP는 "출입증"이에요.

| MCP | 범위 | 역할 | 함께 쓰는 스킬 |
|---|---|---|---|
| Supabase | claude.ai 커넥터 | 실제 DB 테이블·정책 조회, SQL 실행 | `supabase-migration` (작성 후 충돌 확인) |
| Playwright | user (모든 프로젝트) | 브라우저를 띄워 클릭·화면 캡처·콘솔 확인 | `verify-app` (화면 확인) |
| Context7 | user (모든 프로젝트) | 라이브러리 최신 공식 문서 검색 | `supabase-migration`, 코드 작성 전반 |

- 현재 연결된 Supabase 프로젝트: `flmaxtnszpvivuahwxqs` (서울)
- 연결 상태 확인: 채팅창에 `/mcp`
- ⚠️ Karpathy Skills는 이름에 "Skills"가 있지만 MCP가 아니라 **② 플러그인 스킬**입니다. 반대로 Playwright·Context7은 이름과 상관없이 **스킬이 아닌 MCP**입니다.

---

## 작업 끝에 "사용한 스킬" 알림

`CLAUDE.md`에 규칙을 추가해 두었습니다. 이제 작업이 끝나면 Claude가 답변 마지막에 이렇게 알려줍니다:

```
🧰 사용한 스킬
- supabase-migration — likes 테이블 SQL 작성 규칙 적용
- verify-app — 빌드·화면 확인
```

사용한 스킬이 없으면 "없음"이라고 표시합니다.
