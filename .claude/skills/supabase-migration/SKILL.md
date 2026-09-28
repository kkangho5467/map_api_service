---
name: supabase-migration
description: Pop-Pin의 Supabase DB 변경(새 테이블, 컬럼, RLS 정책, RPC 함수, Storage 버킷)을 SQL 파일로 작성할 때 사용. 찜(likes), 코스, 아카이브 등 새 데이터 구조를 만들거나 기존 스키마를 바꿀 때 반드시 먼저 읽는다.
---

# Supabase 마이그레이션 작성 규칙

## 파일 규칙
- 위치: `supabase/NN_설명.sql` (현재 마지막 번호를 `ls supabase/`로 확인 후 +1)
- 기존 파일(`schema.sql`, `02_...`, `03_...`)은 수정하지 않는다. 변경은 항상 새 파일로.
- 파일 맨 위에 "무엇을 / 어디서 실행하는지(SQL Editor)" 주석을 쓴다.
- **여러 번 실행해도 안전하게**: `create table if not exists`, `add column if not exists`,
  `create or replace function`, `drop policy if exists` → `create policy`, `drop trigger if exists`, `on conflict do nothing`.
- 모든 SQL 블록에 초보자용 한글 주석(왜 필요한지)을 단다.

## 보안 체크리스트 (모두 충족해야 완료)
1. 새 테이블마다 `alter table ... enable row level security;`
2. 정책은 역할을 명시한다: `to authenticated`. 사용자 비교는 `(select auth.uid())` 형태로 쓴다(성능).
3. 커플 데이터는 기존 도우미 `public.my_couple_id()`를 재사용한다. 같은 테이블을 정책 안에서 다시 조회하면 무한 재귀가 나므로 security definer 도우미를 쓴다.
4. 사용자가 바꾸면 안 되는 칸은 컬럼 권한으로 막는다: `revoke update ... ; grant update (허용 칸) ...`
5. 여러 행을 함께 바꾸거나 검증이 필요한 쓰기는 RPC 함수로만 허용하고, 테이블 insert/delete 권한은 revoke 한다.
6. `security definer` 함수에는 반드시 `set search_path = ''`, 모든 이름은 `public.` 스키마를 붙인다.
7. 함수 실행 권한: `revoke execute ... from public, anon;` → `grant execute ... to authenticated;`
8. 함수 안 에러는 사용자에게 그대로 보일 한글 문구로 `raise exception '...'`.
9. Storage: 경로 첫 폴더를 `auth.uid()`로 제한 (`(storage.foldername(name))[1] = (select auth.uid())::text`), 버킷에 용량·MIME 제한.
10. `places.category`는 check 제약으로 `restaurant`/`cafe`/`spot`만 허용됨을 기억한다.

## 작성 후
- Supabase MCP가 연결돼 있으면 **읽기 전용**으로 현재 스키마/정책을 조회해 충돌 여부를 확인한다 (쓰기는 하지 않는다).
- 사용자에게 실행 방법을 안내한다: Supabase → SQL Editor → 파일 전체 붙여넣기 → Run.
- 실행 완료가 확인되면 `PROGRESS_LOG.md`의 "Supabase SQL 실행 순서"에 새 파일을 추가한다.
- 프론트 코드는 실패 시 `error`를 확인해 `throw` 하고, 화면에서 try/catch로 한글 안내를 보여준다.
