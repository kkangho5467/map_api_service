import { useEffect, useState } from 'react';
import BottomSheet from './BottomSheet.jsx';
import Avatar from './Avatar.jsx';
import ProfileEditor from './ProfileEditor.jsx';
import CoupleCard from './CoupleCard.jsx';
import { useProfile } from '../hooks/useProfile.js';

// 하단 탭의 'MY'를 누르면 열리는 마이페이지입니다.
//  - 로그인 전: 카카오 로그인 버튼
//  - 로그인 후: [메인] 프로필 줄 · 커플 카드 · 로그아웃  ↔  [수정] 프로필 수정 화면
// props:
//  - open, onClose: 시트 열림 여부와 닫기 함수
//  - user: 로그인한 사용자 (없으면 null)
//  - isAuthLoading: 로그인 여부 확인 중인지
//  - authError: 로그인 관련 에러 문구
//  - onLogin, onLogout: 로그인/로그아웃 함수
export default function AccountSheet({ open, onClose, user, isAuthLoading, authError, onLogin, onLogout }) {
  // 프로필·커플 데이터와 수정 함수는 useProfile 훅에서 가져옵니다.
  const { profile, couple, isLoading, loadError, refresh, updateProfile, connectCouple, disconnectCouple } = useProfile(user);

  // 지금 보여줄 화면: 'main'(메인) 또는 'edit'(프로필 수정)
  const [view, setView] = useState('main');

  // 시트를 닫으면 다음에 열 때 메인 화면부터 보이도록 되돌립니다.
  // 시트를 열 때마다 최신 정보(예: 연인이 방금 연결함)를 다시 불러옵니다.
  useEffect(() => {
    if (open) refresh();
    else setView('main');
  }, [open, refresh]);

  // 화면 내용을 상황별로 고르는 함수. (if 문을 쓰기 위해 JSX 밖으로 뺐습니다)
  const renderContent = () => {
    if (isAuthLoading) return <h2 id="account-title">확인 중…</h2>;

    // ─── 로그인 전 ───
    if (!user) {
      return (
        <>
          <p className="detail-kicker">MY PAGE</p>
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
      );
    }

    // ─── 로그인 후: 프로필을 아직 못 불러온 경우 ───
    if (!profile) {
      return (
        <>
          <h2 id="account-title">{isLoading ? '불러오는 중…' : '프로필이 없어요'}</h2>
          {loadError && (
            <>
              <p className="auth-error" role="alert">{loadError}</p>
              <button className="detail-action account-button" type="button" onClick={refresh}>다시 시도</button>
            </>
          )}
          <button className="text-button" type="button" onClick={onLogout}>로그아웃</button>
        </>
      );
    }

    // ─── 로그인 후: 프로필 수정 화면 ───
    if (view === 'edit') {
      return <ProfileEditor profile={profile} onSave={updateProfile} onDone={() => setView('main')} />;
    }

    // ─── 로그인 후: 메인 화면 ───
    return (
      <>
        <p className="detail-kicker">MY PAGE</p>

        {/* 프로필 줄 전체가 버튼: 누르면 수정 화면으로 이동 */}
        <button className="profile-row" type="button" onClick={() => setView('edit')}>
          <Avatar url={profile.avatar_url} size={56} />
          <span className="profile-row-text">
            <strong id="account-title">{profile.nickname}님</strong>
            <span>프로필 수정</span>
          </span>
          <span className="chevron" aria-hidden="true">›</span>
        </button>

        <h3 className="section-title">커플</h3>
        <CoupleCard
          inviteCode={profile.invite_code}
          couple={couple}
          onConnect={connectCouple}
          onDisconnect={disconnectCouple}
        />

        <h3 className="section-title">계정</h3>
        <div className="menu-list">
          <button className="menu-item" type="button" onClick={onLogout}>로그아웃</button>
        </div>
      </>
    );
  };

  return (
    <BottomSheet open={open} onClose={onClose} labelledBy="account-title">
      {renderContent()}
      {/* role="alert": 에러가 생기면 스크린리더가 바로 읽어 줍니다. */}
      {authError && <p className="auth-error" role="alert">{authError}</p>}
    </BottomSheet>
  );
}
