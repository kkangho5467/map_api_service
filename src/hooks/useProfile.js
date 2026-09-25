import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { resizeImageToSquare } from '../lib/image.js';

const AVATAR_BUCKET = 'avatars';
const PROFILE_COLUMNS = 'id, nickname, avatar_url, invite_code';

// 저장소 공개 주소에서 '버킷 안의 파일 경로'만 뽑아냅니다. (이전 사진을 지울 때 사용)
// 예) https://xxx.supabase.co/storage/v1/object/public/avatars/유저id/avatar-1.jpg → 유저id/avatar-1.jpg
// 카카오 프로필 사진처럼 우리 저장소 주소가 아니면 null을 돌려줘서 지우지 않습니다.
const getStoragePath = (url) => {
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const index = url?.indexOf(marker) ?? -1;
  return index === -1 ? null : url.slice(index + marker.length);
};

// 마이페이지에 필요한 데이터(내 프로필, 커플 정보)와 수정 함수들을 모아 둔 커스텀 훅입니다.
// 수정 함수들은 실패하면 에러를 던지고(throw), 화면 쪽에서 try/catch로 받아 문구를 보여줍니다.
export const useProfile = (user) => {
  const userId = user?.id;
  const [profile, setProfile] = useState(null);   // { id, nickname, avatar_url, invite_code }
  const [couple, setCouple] = useState(null);     // { id, createdAt, partner: { nickname, avatar_url } } 또는 null
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // 내 프로필과 커플 정보를 DB에서 다시 읽어 옵니다.
  const refresh = useCallback(async () => {
    // 로그아웃 상태면 모두 비웁니다.
    if (!userId) {
      setProfile(null);
      setCouple(null);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      // ① 내 프로필
      const { data: me, error: profileError } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', userId)
        .single(); // 딱 1행만 기대합니다. 없으면 에러.
      if (profileError) throw profileError;

      // ② 내가 속한 커플 (없으면 null). couples(created_at)는 연결된 테이블을 함께 가져오는 문법입니다.
      const { data: membership, error: memberError } = await supabase
        .from('couple_members')
        .select('couple_id, couples(created_at)')
        .eq('user_id', userId)
        .maybeSingle(); // 0행 또는 1행. 0행이면 에러 없이 null.
      if (memberError) throw memberError;

      // ③ 커플이 있으면 같은 커플의 '나 아닌 사람' = 연인 프로필
      let nextCouple = null;
      if (membership) {
        const { data: partnerRow, error: partnerError } = await supabase
          .from('couple_members')
          .select('user_id, profiles(nickname, avatar_url)')
          .eq('couple_id', membership.couple_id)
          .neq('user_id', userId)
          .maybeSingle();
        if (partnerError) throw partnerError;

        nextCouple = {
          id: membership.couple_id,
          createdAt: membership.couples?.created_at,
          partner: partnerRow?.profiles ?? null, // 연인이 탈퇴했다면 null
        };
      }

      setProfile(me);
      setCouple(nextCouple);
    } catch (error) {
      console.error('프로필 조회 실패:', error);
      setLoadError('프로필 정보를 불러오지 못했어요.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 로그인한 사용자가 바뀔 때마다(로그인/로그아웃) 다시 읽어 옵니다.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // 프로필 수정: 닉네임 + (선택) 새 사진 파일
  const updateProfile = useCallback(async ({ nickname, avatarFile }) => {
    let avatarUrl = profile?.avatar_url ?? null;
    let uploadedPath = null;

    try {
      // 새 사진을 골랐다면 → 줄이기 → 내 폴더에 업로드 → 공개 주소 얻기
      if (avatarFile) {
        const blob = await resizeImageToSquare(avatarFile);
        // 파일 이름에 시간을 붙여 매번 새 주소가 되게 합니다. (같은 이름이면 브라우저가 옛 사진을 캐시로 보여줌)
        uploadedPath = `${userId}/avatar-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(uploadedPath, blob, { contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;

        avatarUrl = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
      }

      // DB의 프로필 행을 수정하고, 수정된 결과를 바로 돌려받습니다.
      const { data, error } = await supabase
        .from('profiles')
        .update({ nickname, avatar_url: avatarUrl })
        .eq('id', userId)
        .select(PROFILE_COLUMNS)
        .single();
      if (error) throw error;

      // 새 사진으로 바꿨다면 예전 사진 파일은 지웁니다. (실패해도 치명적이지 않으니 로그만 남김)
      const oldPath = avatarFile && getStoragePath(profile?.avatar_url);
      if (oldPath) {
        const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);
        if (removeError) console.warn('이전 사진 삭제 실패:', removeError);
      }

      setProfile(data);
    } catch (error) {
      console.error('프로필 수정 실패:', error);
      // DB 저장이 실패했다면 방금 올린 사진은 쓸모없으니 정리합니다.
      if (uploadedPath) await supabase.storage.from(AVATAR_BUCKET).remove([uploadedPath]);
      throw new Error('프로필을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }, [profile, userId]);

  // 초대 코드로 커플 연결 (DB 함수 connect_couple 호출)
  const connectCouple = useCallback(async (code) => {
    const { error } = await supabase.rpc('connect_couple', { partner_code: code });
    if (error) {
      console.error('커플 연결 실패:', error);
      // DB 함수가 raise exception으로 보낸 한글 문구를 그대로 사용자에게 보여줍니다.
      throw new Error(error.message || '커플 연결에 실패했어요.');
    }
    await refresh();
  }, [refresh]);

  // 커플 연결 해제 (DB 함수 disconnect_couple 호출)
  const disconnectCouple = useCallback(async () => {
    const { error } = await supabase.rpc('disconnect_couple');
    if (error) {
      console.error('커플 해제 실패:', error);
      throw new Error(error.message || '연결을 해제하지 못했어요.');
    }
    await refresh();
  }, [refresh]);

  return { profile, couple, isLoading, loadError, refresh, updateProfile, connectCouple, disconnectCouple };
};
