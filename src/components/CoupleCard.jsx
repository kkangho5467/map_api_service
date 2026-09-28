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
//  - 연결 전: 받은 요청(수락/거절) + 내 초대 코드 복사 + [상대 코드 입력 → 요청 보내기] 또는 [보낸 요청 대기·취소]
//  - 연결 후: 연인 프로필 + D+N + 연결 해제
// props:
//  - inviteCode: 내 초대 코드
//  - couple: 커플 정보 (없으면 null)
//  - requests: { incoming: 받은 요청 목록, outgoing: 내가 보낸 요청 또는 null }
//  - onSendRequest(code), onAcceptRequest(id), onRejectRequest(id), onCancelRequest(), onDisconnect()
//    : 모두 실패하면 에러를 던지는 함수
export default function CoupleCard({
  inviteCode, couple, requests,
  onSendRequest, onAcceptRequest, onRejectRequest, onCancelRequest, onDisconnect,
}) {
  const [codeInput, setCodeInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);      // 요청 중에는 버튼을 잠가 중복 클릭을 막습니다.
  const [message, setMessage] = useState(null);     // { type: 'error' | 'info', text }

  // 버튼 동작 공통 처리: 버튼 잠금 → 실행 → 실패하면 에러 문구 → 버튼 풀기
  // action이 성공 안내 문구(문자열)를 돌려주면 초록 안내로 보여줍니다.
  const runAction = async (action) => {
    setIsBusy(true);
    setMessage(null);
    try {
      const infoText = await action();
      if (infoText) setMessage({ type: 'info', text: infoText });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsBusy(false);
    }
  };

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

  const handleSendRequest = (event) => {
    event.preventDefault();
    const code = codeInput.trim().toUpperCase();
    if (code.length !== 6) {
      setMessage({ type: 'error', text: '6자리 초대 코드를 입력해 주세요.' });
      return;
    }

    runAction(async () => {
      const result = await onSendRequest(code);
      setCodeInput('');
      // 'connected'면 상대도 나에게 요청해 둔 상태라 바로 연결됨 → 카드가 연결 화면으로 바뀝니다.
      return result === 'sent' ? '요청을 보냈어요! 상대가 수락하면 연결돼요.' : null;
    });
  };

  const handleCancelRequest = () => {
    runAction(async () => {
      await onCancelRequest();
      return '요청을 취소했어요.';
    });
  };

  const handleDisconnect = () => {
    // 되돌릴 수 없는 동작이라 한 번 더 확인합니다.
    if (!window.confirm('정말 커플 연결을 해제할까요?\n다시 연결하려면 커플 요청을 새로 보내야 해요.')) return;
    runAction(async () => {
      await onDisconnect();
    });
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
  const { incoming, outgoing } = requests;

  return (
    <div className="card">
      {/* ① 받은 요청: 있을 때만 맨 위에 보여줍니다. */}
      {incoming.length > 0 && (
        <div className="request-list">
          <span className="field-label">💌 받은 커플 요청</span>
          {incoming.map((request) => (
            <div className="request-item" key={request.id}>
              <Avatar url={request.sender?.avatar_url} size={40} />
              <p className="request-text">
                <strong>{request.sender?.nickname ?? '알 수 없는 사용자'}</strong>님이 커플 요청을 보냈어요
              </p>
              <div className="request-actions">
                <button
                  className="chip-button primary"
                  type="button"
                  disabled={isBusy}
                  onClick={() => runAction(() => onAcceptRequest(request.id))}
                >
                  수락
                </button>
                <button
                  className="chip-button"
                  type="button"
                  disabled={isBusy}
                  onClick={() => runAction(() => onRejectRequest(request.id))}
                >
                  거절
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ② 내 초대 코드 */}
      <span className="field-label">내 초대 코드</span>
      <div className="invite-row">
        <strong className="invite-code">{inviteCode}</strong>
        <button className="chip-button" type="button" onClick={copyCode}>복사</button>
      </div>

      {/* ③ 보낸 요청이 있으면 '대기 중', 없으면 코드 입력 폼 */}
      {outgoing ? (
        <div className="connect-form">
          <span className="field-label">보낸 요청</span>
          <div className="request-item">
            <Avatar url={outgoing.receiver?.avatar_url} size={40} />
            <p className="request-text">
              <strong>{outgoing.receiver?.nickname ?? '알 수 없는 사용자'}</strong>님의 수락을 기다리는 중이에요
            </p>
            <button className="chip-button" type="button" disabled={isBusy} onClick={handleCancelRequest}>
              취소
            </button>
          </div>
        </div>
      ) : (
        <form className="connect-form" onSubmit={handleSendRequest}>
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
              {isBusy ? '보내는 중…' : '요청'}
            </button>
          </div>
        </form>
      )}
      {messageElement}
    </div>
  );
}
