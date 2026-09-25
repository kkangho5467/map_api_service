import { useState } from 'react';
import Avatar from './Avatar.jsx';

// 연결된 날부터 오늘까지 며칠째인지 계산합니다. (연결한 당일 = D+1)
const getDaysTogether = (createdAt) => {
  if (!createdAt) return null;
  const start = new Date(createdAt);
  start.setHours(0, 0, 0, 0); // 시간은 무시하고 날짜만 비교
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ONE_DAY = 24 * 60 * 60 * 1000;
  return Math.floor((today - start) / ONE_DAY) + 1;
};

// 마이페이지의 커플 영역
//  - 연결 전: 내 초대 코드 복사 + 상대 코드 입력 → 연결
//  - 연결 후: 연인 프로필 + D+N + 연결 해제
// props:
//  - inviteCode: 내 초대 코드
//  - couple: 커플 정보 (없으면 null)
//  - onConnect(code), onDisconnect(): 실패 시 에러를 던지는 함수
export default function CoupleCard({ inviteCode, couple, onConnect, onDisconnect }) {
  const [codeInput, setCodeInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);      // 요청 중에는 버튼을 잠가 중복 클릭을 막습니다.
  const [message, setMessage] = useState(null);     // { type: 'error' | 'info', text }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setMessage({ type: 'info', text: '초대 코드를 복사했어요. 연인에게 보내 주세요!' });
    } catch (error) {
      // 일부 브라우저는 클립보드 권한이 없으면 실패합니다.
      console.error('복사 실패:', error);
      setMessage({ type: 'error', text: '복사하지 못했어요. 코드를 직접 알려 주세요.' });
    }
  };

  const handleConnect = async (event) => {
    event.preventDefault();
    const code = codeInput.trim().toUpperCase();
    if (code.length !== 6) {
      setMessage({ type: 'error', text: '6자리 초대 코드를 입력해 주세요.' });
      return;
    }

    setIsBusy(true);
    setMessage(null);
    try {
      await onConnect(code);
      setCodeInput('');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleDisconnect = async () => {
    // 되돌릴 수 없는 동작이라 한 번 더 확인합니다.
    if (!window.confirm('정말 커플 연결을 해제할까요?\n다시 연결하려면 초대 코드를 새로 입력해야 해요.')) return;

    setIsBusy(true);
    setMessage(null);
    try {
      await onDisconnect();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsBusy(false);
    }
  };

  // 공통: 안내/에러 문구
  const messageElement = message && (
    <p className={message.type === 'error' ? 'auth-error' : 'form-info'} role={message.type === 'error' ? 'alert' : 'status'}>
      {message.text}
    </p>
  );

  // ─── 연결된 상태 ───
  if (couple) {
    const days = getDaysTogether(couple.createdAt);
    return (
      <div className="card">
        <div className="partner">
          <Avatar url={couple.partner?.avatar_url} size={48} />
          <div>
            <strong>{couple.partner?.nickname ?? '알 수 없는 사용자'}</strong>
            {days && <span className="partner-days">함께한 지 D+{days}</span>}
          </div>
        </div>
        {messageElement}
        <button className="text-button danger" type="button" onClick={handleDisconnect} disabled={isBusy}>
          커플 연결 해제
        </button>
      </div>
    );
  }

  // ─── 연결 전 상태 ───
  return (
    <div className="card">
      <span className="field-label">내 초대 코드</span>
      <div className="invite-row">
        <strong className="invite-code">{inviteCode}</strong>
        <button className="chip-button" type="button" onClick={copyCode}>복사</button>
      </div>

      <form className="connect-form" onSubmit={handleConnect}>
        <label className="field-label" htmlFor="partner-code">연인의 초대 코드</label>
        <div className="invite-row">
          <input
            id="partner-code"
            className="text-input code-input"
            type="text"
            inputMode="text"
            autoCapitalize="characters"   // 모바일 키보드를 대문자로 시작
            autoComplete="off"
            maxLength={6}
            placeholder="ABC123"
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
          />
          <button className="chip-button primary" type="submit" disabled={isBusy}>
            {isBusy ? '연결 중…' : '연결'}
          </button>
        </div>
      </form>
      {messageElement}
    </div>
  );
}
