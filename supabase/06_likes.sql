-- ─────────────────────────────────────────────────────────────
-- Pop-Pin 06: 개인 찜(likes) 테이블
-- Supabase 대시보드 → SQL Editor → 이 파일 전체를 붙여 넣고 Run 하세요.
-- 여러 번 실행해도 안전하도록(if not exists / drop if exists) 작성했습니다.
--
-- 이번 단계: "내 찜"만 저장·조회합니다. (나만 볼 수 있음)
-- 다음 단계: 연인 찜 보기·교집합은 select 정책을 하나 더 추가해서 확장합니다.
-- ─────────────────────────────────────────────────────────────


-- ═════════ 1. likes: 누가 어떤 장소를 찜했는지 ═════════
-- 찜 1개 = 1행. 찜을 취소하면 행을 지웁니다.
create table if not exists public.likes (
    -- 찜한 사람. default auth.uid() → 앱에서 user_id를 보내지 않아도 "지금 로그인한 사람"으로 자동 저장됩니다.
    user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
    -- 찜한 장소. 장소가 삭제되면 찜도 함께 지워집니다(cascade).
    place_id bigint not null references public.places(id) on delete cascade,
    created_at timestamptz not null default now(),
    -- (사람, 장소) 조합을 기본키로 → 같은 장소를 두 번 찜하는 것을 DB가 막아 줍니다.
    primary key (user_id, place_id)
);

-- "이 장소를 찜한 사람" 조회를 빠르게 하기 위한 색인 (나중에 교집합 계산에 사용)
-- user_id 쪽은 기본키 색인이 이미 있어서 따로 만들 필요가 없습니다.
create index if not exists likes_place_id_idx on public.likes(place_id);


-- ═════════ 2. RLS(행 단위 보안): 내 찜만 다룰 수 있게 ═════════
-- RLS를 켜면 아래 정책에 맞는 행만 조회·추가·삭제할 수 있습니다. (정책이 없으면 전부 차단)
alter table public.likes enable row level security;

-- 조회: 내 찜만 보입니다.
drop policy if exists "likes_select_own" on public.likes;
create policy "likes_select_own" on public.likes
    for select to authenticated
    using (user_id = (select auth.uid()));

-- 추가: 내 이름으로만 찜할 수 있습니다. (남의 user_id로 넣는 것을 막음)
drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own" on public.likes
    for insert to authenticated
    with check (user_id = (select auth.uid()));

-- 삭제(찜 취소): 내 찜만 지울 수 있습니다.
drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own" on public.likes
    for delete to authenticated
    using (user_id = (select auth.uid()));


-- ═════════ 3. 권한 정리 ═════════
-- 찜은 "추가/삭제"만 있으면 되고 수정할 일이 없으므로 update 권한을 아예 막습니다.
-- 로그인하지 않은 사용자(anon)는 찜 테이블에 접근할 수 없습니다.
revoke all on public.likes from anon;
revoke update on public.likes from authenticated;
grant select, insert, delete on public.likes to authenticated;
