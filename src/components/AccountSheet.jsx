import BottomSheet from './BottomSheet.jsx';

// 하단 탭의 'MY'를 누르면 열리는 계정 시트입니다.
// 로그인 전 → 카카오 로그인 버튼 / 로그인 후 → 프로필 + 로그아웃 버튼
// props:
//  - open, onClose: 시트 열림 여부와 닫기 함수
//  - user: 로그인한 사용자 (없으면 null)
//  - isAuthLoading: 로그인 여부 확인 중인지
//  - authError: 보여줄 에러 문구
//  - onLogin, onLogout: 로그인/로그아웃 함수
export default function AccountSheet({ open, onClose, user, isAuthLoading, authError, onLogin, onLogout }) {
  // 카카오 로그인 시 Supabase가 user_metadata에 닉네임·프로필 사진을 담아 줍니다.
  // ?. 와 ?? 로 값이 없을 때도 에러 없이 기본값을 쓰도록 합니다.
  const meta = user?.user_metadata ?? {};
  const nickname = meta.full_name ?? meta.name ?? meta.user_name ?? '카카오 사용자';
  const avatarUrl = meta.avatar_url ?? meta.picture;

  return (
    <BottomSheet open={open} onClose={onClose} labelledBy="account-title">
      <p className="detail-kicker">MY PAGE</p>

      {/* 삼항 연산자를 이어 붙여 3가지 상태(확인 중 / 로그인됨 / 로그아웃됨)를 나눠 그립니다. */}
      {isAuthLoading ? (
        <h2 id="account-title">확인 중…</h2>
      ) : user ? (
        <>
          <div className="profile">
            {avatarUrl
              // referrerPolicy: 카카오 이미지 서버에 우리 사이트 주소를 보내지 않게 합니다.
              ? <img className="profile-avatar" src={avatarUrl} alt="" referrerPolicy="no-referrer" />
              : <span className="profile-avatar" aria-hidden="true">☺</span>}
            <div>
              <h2 id="account-title">{nickname}님</h2>
              {user.email && <p className="detail-address">{user.email}</p>}
            </div>
          </div>
          <button className="detail-action account-button" type="button" onClick={onLogout}>로그아웃</button>
        </>
      ) : (
        <>
          <h2 id="account-title">로그인하고<br />데이트 코스를 함께 찜해요</h2>
          <p className="detail-address">연인과 찜 목록을 맞춰 보고, 다녀온 곳을 인증해 기록할 수 있어요.</p>
          {/* 카카오 디자인 가이드: 노란 배경(#FEE500) + 말풍선 심볼 + '카카오 로그인' 문구 */}
          <button className="kakao-login" type="button" onClick={onLogin}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="#000" d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.2 4.7 6.6l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.5 10-7.9S17.5 3 12 3z" />
            </svg>
            카카오 로그인
          </button>
        </>
      )}

      {/* role="alert": 에러가 생기면 스크린리더가 바로 읽어 줍니다. */}
      {authError && <p className="auth-error" role="alert">{authError}</p>}
    </BottomSheet>
  );
}
