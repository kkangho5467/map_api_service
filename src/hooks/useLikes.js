import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

// 내 찜 목록을 관리하는 커스텀 훅입니다.
// likedIds: 찜한 장소 id들을 담은 Set (Set = 중복 없는 모음. has()로 "들어 있나?"를 빠르게 확인할 수 있어요)
// toggleLike: 찜 추가/취소. 실패하면 화면을 원래대로 돌리고 에러를 던집니다(throw) → 화면 쪽에서 try/catch로 안내.
export const useLikes = (user) => {
  const userId = user?.id;
  const [likedIds, setLikedIds] = useState(() => new Set());

  // 로그인 사용자가 바뀔 때마다(로그인/로그아웃) 내 찜 목록을 다시 불러옵니다.
  useEffect(() => {
    // 로그아웃 상태면 찜 목록을 비웁니다.
    if (!userId) {
      setLikedIds(new Set());
      return undefined;
    }

    // 응답이 늦게 도착했을 때 이미 다른 계정으로 바뀌었다면 무시하기 위한 표시입니다.
    let ignore = false;
    const fetchLikes = async () => {
      try {
        // RLS 덕분에 조건을 안 붙여도 "내 찜"만 옵니다. 그래도 의도를 분명히 하려고 eq로 한 번 더 거릅니다.
        const { data, error } = await supabase
          .from('likes')
          .select('place_id')
          .eq('user_id', userId);
        if (error) throw error;
        if (!ignore) setLikedIds(new Set(data.map((row) => row.place_id)));
      } catch (error) {
        console.error('찜 목록 조회 실패:', error);
      }
    };
    fetchLikes();

    // 정리 함수: 사용자가 바뀌면 이전 요청의 결과는 버립니다.
    return () => { ignore = true; };
  }, [userId]);

  const toggleLike = useCallback(async (placeId) => {
    if (!userId) throw new Error('로그인이 필요해요.');

    const wasLiked = likedIds.has(placeId);

    // Set은 직접 고치면 React가 바뀐 줄 모르므로, 항상 새 Set을 만들어 넘깁니다.
    const applyLike = (liked) => {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (liked) next.add(placeId);
        else next.delete(placeId);
        return next;
      });
    };

    // ① 화면을 먼저 바꿔서 누르자마자 반응하게 합니다. (낙관적 업데이트)
    applyLike(!wasLiked);

    try {
      // ② DB에 반영합니다. user_id는 DB 기본값(auth.uid())이 채워 주므로 place_id만 보냅니다.
      const { error } = wasLiked
        ? await supabase.from('likes').delete().eq('user_id', userId).eq('place_id', placeId)
        : await supabase.from('likes').insert({ place_id: placeId });
      if (error) throw error;
    } catch (error) {
      // ③ 실패하면 화면을 원래 상태로 되돌리고 에러를 알립니다.
      console.error('찜 변경 실패:', error);
      applyLike(wasLiked);
      throw new Error('찜을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }, [userId, likedIds]);

  return { likedIds, toggleLike };
};
