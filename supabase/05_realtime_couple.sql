-- ─────────────────────────────────────────────────────────────
-- Pop-Pin 05: 커플 요청·연결을 실시간(Realtime)으로 알리기
-- Supabase 대시보드 → SQL Editor → 이 파일 전체를 붙여 넣고 Run 하세요.
-- 여러 번 실행해도 안전합니다. (이미 추가된 테이블은 건너뜀)
--
-- 원리:
--   Supabase Realtime은 'supabase_realtime'이라는 발행(publication) 목록에 들어 있는 테이블의
--   변경(INSERT/UPDATE/DELETE)을 구독 중인 앱에 즉시 전달합니다.
--   목록에 없으면 앱이 구독해도 아무 알림이 오지 않습니다.
--
-- 보안:
--   - INSERT 알림은 RLS가 적용됩니다 → 내가 조회할 수 있는 행(내 요청, 내 커플)만 전달됩니다.
--   - DELETE 알림은 RLS가 적용되지 않지만 '기본키 값만' 전달됩니다.
--     couple_requests의 기본키는 숫자 id라 개인정보가 없습니다.
--     (couple_members는 기본키가 user_id라서, 앱에서는 DELETE를 구독하지 않고 INSERT만 구독합니다)
--   - replica identity full(삭제 전 전체 값 전달)은 켜지 않습니다. 필요 없는 정보가 퍼지지 않게 하기 위해서입니다.
-- ─────────────────────────────────────────────────────────────

-- do $$ ... $$ : 조건(if)을 쓰기 위한 일회용 코드 블록입니다.
do $$
begin
    -- couple_requests: 새 요청이 오거나, 요청이 거절·취소되면 알림
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'couple_requests'
    ) then
        alter publication supabase_realtime add table public.couple_requests;
    end if;

    -- couple_members: 상대가 내 요청을 수락해서 커플이 생기면 알림
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'couple_members'
    ) then
        alter publication supabase_realtime add table public.couple_members;
    end if;
end;
$$;
