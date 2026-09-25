import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

// 로그인 상태를 관리하는 커스텀 훅입니다.
// 어느 컴포넌트에서든 const { user, signInWithKakao } = useAuth(); 처럼 꺼내 쓸 수 있습니다.
//
// 카카오 로그인 흐름 (OAuth):
//  ① signInWithKakao() → 카카오 동의 화면으로 페이지 이동
//  ② 사용자 동의 → 카카오가 Supabase 서버로 결과 전달
//  ③ Supabase가 세션(로그인 증표)을 만들어 우리 사이트로 되돌려 보냄
//  ④ supabase-js가 주소창의 세션 정보를 읽어 저장 → onAuthStateChange가 알려줌 → user 갱신
export const useAuth = () => {
  const [user, setUser] = useState(null);                   // 로그인한 사용자 (없으면 null)
  const [isAuthLoading, setIsAuthLoading] = useState(true); // 로그인 여부 확인 중?
  const [authError, setAuthError] = useState(null);         // 사용자에게 보여줄 에러 문구

  useEffect(() => {
    // 카카오/Supabase 쪽에서 실패하면 주소 뒤에 ?error_description=... 형태로 돌아옵니다.
    // (예: 동의 항목 설정 오류) 그 내용을 읽어 화면에 보여주고, 주소창은 깨끗이 정리합니다.
    const params = new URLSearchParams(window.location.search || window.location.hash.slice(1));
    const redirectError = params.get('error_description');
    if (redirectError) {
      setAuthError(`로그인 실패: ${redirectError}`);
      window.history.replaceState(null, '', window.location.pathname);
    }

    // ① 새로고침해도 로그인이 유지되도록, 저장된 세션이 있는지 먼저 확인합니다.
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        setUser(data.session?.user ?? null);
      })
      .catch((error) => {
        console.error('세션 확인 실패:', error);
        setAuthError('로그인 상태를 확인하지 못했어요.');
      })
      .finally(() => setIsAuthLoading(false));

    // ② 이후 로그인/로그아웃이 일어날 때마다 자동으로 user를 갱신합니다. (구독)
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // 컴포넌트가 사라질 때 구독을 해제합니다. (메모리 누수 방지)
    return () => data.subscription.unsubscribe();
  }, []);

  // 카카오 로그인 시작 → 카카오 동의 화면으로 이동합니다.
  const signInWithKakao = useCallback(async () => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        // 로그인이 끝나면 돌아올 주소. 지금 접속한 주소(로컬이면 localhost, 배포면 vercel)를 그대로 씁니다.
        // ※ 이 주소는 Supabase 대시보드의 Redirect URLs 목록에 등록돼 있어야 합니다.
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      console.error('카카오 로그인 실패:', error);
      setAuthError('카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('로그아웃 실패:', error);
      setAuthError('로그아웃하지 못했어요.');
    }
  }, []);

  return { user, isAuthLoading, authError, signInWithKakao, signOut };
};
