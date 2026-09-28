import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { resizeImageToSquare } from '../lib/image.js';

const AVATAR_BUCKET = 'avatars';
const PROFILE_COLUMNS = 'id, nickname, avatar_url, invite_code';

// 커플 요청 조회용 컬럼
// sender:profiles!couple_requests_sender_id_fkey(...) = "sender_id 외래키로 연결된 profiles 행을 sender라는 이름으로 함께 가져와"
// (couple_requests가 profiles를 두 번 참조해서, 어떤 외래키로 연결할지 이름으로 지정해야 합니다)
const REQUEST_COLUMNS = `
  id, sender_id, receiver_id, created_at,
  sender:profiles!couple_requests_sender_id_fkey(nickname, avatar_url),
  receiver:profiles!couple_requests_receiver_id_fkey(nickname, avatar_url)
`;

// 요청이 없을 때의 기본값 (incoming: 받은 요청 목록, outgoing: 내가 보낸 요청 1개 또는 null)
const EMPTY_REQUESTS = { incoming: [], outgoing: null };

// DB 함수(rpc)를 호출하고, 실패하면 DB가 보낸 한글 문구로 에러를 던지는 공통 함수입니다.
const callRpc = async (name, params, fallbackMessage) => {
  const { data, error } = await supabase.rpc(name, params);
  if (error) {
    console.error(`${name} 실패:`, error);
    // DB 함수가 raise exception으로 보낸 한글 문구를 그대로 사용자에게 보여줍니다.
    throw new Error(error.message || fallbackMessage);
  }
  return data;
};

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
  const [requests, setRequests] = useState(EMPTY_REQUESTS); // 대기 중인 커플 요청
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // 내 프로필과 커플 정보를 DB에서 다시 읽어 옵니다.
  const refresh = useCallback(async () => {
    // 로그아웃 상태면 모두 비웁니다.
    if (!userId) {
      setProfile(null);
      setCouple(null);
      setRequests(EMPTY_REQUESTS);
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

      // ④ 커플이 아직 없으면 대기 중인 요청(받은 것·보낸 것)을 가져옵니다.
      //    RLS 덕분에 '내가 보냈거나 받은 요청'만 돌아옵니다. (커플이 되면 DB가 요청을 모두 지움)
      let nextRequests = EMPTY_REQUESTS;
      if (!membership) {
        const { data: requestRows, error: requestError } = await supabase
          .from('couple_requests')
          .select(REQUEST_COLUMNS)
          .order('created_at', { ascending: false }); // 최신 요청이 위로
        if (requestError) throw requestError;

        nextRequests = {
          incoming: requestRows.filter((row) => row.receiver_id === userId),
          outgoing: requestRows.find((row) => row.sender_id === userId) ?? null,
        };
      }

      setProfile(me);
      setCouple(nextCouple);
      setRequests(nextRequests);
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

  // 다른 앱을 보다가 돌아왔을 때(탭이 다시 보일 때) 새 요청이 왔는지 다시 확인합니다.
  // 실시간 알림 대신 쓰는 간단한 방법입니다. (탭 바의 빨간 점이 최신 상태가 되도록)
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', handleVisible);
    // 컴포넌트가 사라질 때 이벤트 연결을 해제합니다. (메모리 누수 방지)
    return () => document.removeEventListener('visibilitychange', handleVisible);
  }, [refresh]);

  // 지금 화면에 있는 요청 id 목록. 실시간 삭제 알림이 '내 요청'인지 확인할 때 씁니다.
  // useRef: 값이 바뀌어도 화면을 다시 그리지 않고, 구독을 다시 만들지 않아도 최신 값을 읽을 수 있는 상자입니다.
  const myRequestIdsRef = useRef(new Set());
  useEffect(() => {
    const ids = requests.incoming.map((request) => request.id);
    if (requests.outgoing) ids.push(requests.outgoing.id);
    myRequestIdsRef.current = new Set(ids);
  }, [requests]);

  // 실시간 구독 (Supabase Realtime): DB가 바뀌는 순간 서버가 알려주면 refresh()로 다시 읽어 옵니다.
  // ※ supabase/05_realtime_couple.sql 로 두 테이블을 발행 목록에 추가해야 알림이 옵니다.
  useEffect(() => {
    if (!userId) return undefined;

    const channel = supabase
      .channel(`couple-updates-${userId}`)
      // ① 누군가 나에게 요청을 보냄 → 받은 요청 + 빨간 점
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'couple_requests', filter: `receiver_id=eq.${userId}` },
        () => refresh(),
      )
      // ② 요청이 삭제됨(거절·취소·수락 후 정리)
      //    삭제 알림은 RLS가 적용되지 않아 모든 구독자에게 오고, 기본 설정에서는 지워진 행의 값(old)이 비어서 옵니다.
      //    그래서 '대기 중인 요청이 있을 때만' 다시 읽고, id가 들어 있으면 내 요청인지 한 번 더 확인합니다.
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'couple_requests' },
        (payload) => {
          const myIds = myRequestIdsRef.current;
          if (myIds.size === 0) return;          // 대기 중인 요청이 없으면 나와 무관
          const deletedId = payload.old?.id;
          if (deletedId === undefined || myIds.has(deletedId)) refresh();
        },
      )
      // ③ 내가 커플 멤버로 추가됨(상대가 내 요청을 수락) → 연결 화면으로 전환
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'couple_members', filter: `user_id=eq.${userId}` },
        () => refresh(),
      )
      .subscribe((status, error) => {
        // 연결 실패해도 앱은 동작합니다. (마이페이지를 열거나 앱으로 돌아오면 다시 조회하므로)
        if (error) console.warn('실시간 연결 실패:', status, error);
      });

    // 로그아웃하거나 사용자가 바뀌면 구독을 해제합니다. (메모리 누수·중복 알림 방지)
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

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

  // 초대 코드로 커플 요청 보내기 (DB 함수 send_couple_request 호출)
  // 돌려주는 값: 'sent'(요청 보냄) 또는 'connected'(상대도 나에게 요청해 둬서 바로 연결됨)
  const sendRequest = useCallback(async (code) => {
    const result = await callRpc('send_couple_request', { partner_code: code }, '요청을 보내지 못했어요.');
    await refresh();
    return result;
  }, [refresh]);

  // 받은 요청 수락 → 커플 성립
  const acceptRequest = useCallback(async (requestId) => {
    await callRpc('accept_couple_request', { request_id: requestId }, '요청을 수락하지 못했어요.');
    await refresh();
  }, [refresh]);

  // 받은 요청 거절 → 요청이 조용히 사라짐
  const rejectRequest = useCallback(async (requestId) => {
    await callRpc('reject_couple_request', { request_id: requestId }, '요청을 거절하지 못했어요.');
    await refresh();
  }, [refresh]);

  // 내가 보낸 요청 취소
  const cancelRequest = useCallback(async () => {
    await callRpc('cancel_couple_request', {}, '요청을 취소하지 못했어요.');
    await refresh();
  }, [refresh]);

  // 커플 연결 해제 (DB 함수 disconnect_couple 호출)
  const disconnectCouple = useCallback(async () => {
    await callRpc('disconnect_couple', {}, '연결을 해제하지 못했어요.');
    await refresh();
  }, [refresh]);

  return {
    profile, couple, requests, isLoading, loadError, refresh, updateProfile,
    sendRequest, acceptRequest, rejectRequest, cancelRequest, disconnectCouple,
  };
};
