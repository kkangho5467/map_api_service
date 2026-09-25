import { useEffect, useState } from 'react';
import Avatar from './Avatar.jsx';

const MAX_NICKNAME = 20;                   // DB 규칙(1~20자)과 똑같이 맞춥니다.
const MAX_FILE_SIZE = 15 * 1024 * 1024;    // 원본 15MB까지 허용 (업로드 전에 작게 줄이므로)

// 프로필 수정 화면: 사진 바꾸기 + 닉네임 바꾸기
// props:
//  - profile: 현재 프로필 (초기값으로 사용)
//  - onSave: 저장 함수 ({ nickname, avatarFile }) → 실패 시 에러를 던짐
//  - onDone: 저장 완료 또는 취소 후 메인 화면으로 돌아가는 함수
export default function ProfileEditor({ profile, onSave, onDone }) {
  // 입력창 값은 state로 관리합니다. (React의 '제어 컴포넌트' 방식: 화면 값 = state 값)
  const [nickname, setNickname] = useState(profile.nickname);
  const [avatarFile, setAvatarFile] = useState(null);  // 새로 고른 사진 파일
  const [previewUrl, setPreviewUrl] = useState(null);  // 새 사진 미리보기 주소
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);        // 에러 안내 문구

  // 새 사진을 고르면 미리보기용 임시 주소를 만들고, 필요 없어지면 해제합니다. (메모리 누수 방지)
  useEffect(() => {
    if (!avatarFile) return undefined;
    const url = URL.createObjectURL(avatarFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // 같은 파일을 다시 골라도 change 이벤트가 오도록 초기화
    if (!file) return;

    // 업로드 전에 브라우저에서 먼저 검사합니다. (서버에서도 한 번 더 검사함)
    if (!file.type.startsWith('image/')) {
      setMessage('이미지 파일만 올릴 수 있어요.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage('15MB 이하의 사진을 골라 주세요.');
      return;
    }
    setMessage(null);
    setAvatarFile(file);
  };

  // form의 onSubmit: 저장 버튼 클릭과 키보드 엔터를 한 번에 처리합니다.
  const handleSubmit = async (event) => {
    event.preventDefault(); // 기본 동작(페이지 새로고침)을 막습니다.
    const trimmed = nickname.trim();
    if (trimmed.length === 0) {
      setMessage('닉네임을 입력해 주세요.');
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await onSave({ nickname: trimmed, avatarFile });
      onDone();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="profile-editor" onSubmit={handleSubmit}>
      <p className="detail-kicker">EDIT PROFILE</p>
      <h2 id="account-title">프로필 수정</h2>

      {/* label로 감싸면 사진(또는 글자)을 눌러도 숨겨진 파일 선택창이 열립니다. */}
      <label className="avatar-picker">
        <Avatar url={previewUrl ?? profile.avatar_url} size={96} />
        <span className="avatar-picker-text">사진 변경</span>
        {/* accept: 사진 파일만 고를 수 있게 합니다. 모바일에선 카메라/앨범 선택창이 뜹니다. */}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} hidden />
      </label>

      <label className="field">
        <span className="field-label">닉네임</span>
        <input
          className="text-input"
          type="text"
          value={nickname}
          maxLength={MAX_NICKNAME}
          onChange={(event) => setNickname(event.target.value)}
          autoComplete="nickname"
        />
        <span className="field-hint">{nickname.trim().length}/{MAX_NICKNAME}</span>
      </label>

      {message && <p className="auth-error" role="alert">{message}</p>}

      <div className="form-actions">
        <button className="detail-action" type="button" onClick={onDone} disabled={isSaving}>취소</button>
        <button className="detail-action primary" type="submit" disabled={isSaving}>
          {isSaving ? '저장 중…' : '저장'}
        </button>
      </div>
    </form>
  );
}
