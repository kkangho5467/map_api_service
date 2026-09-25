// 동그란 프로필 사진. 사진 주소가 없으면 기본 이모지를 보여줍니다.
// 여러 곳(내 프로필, 연인 프로필, 수정 화면)에서 똑같이 쓰므로 작은 컴포넌트로 분리했습니다.
// props:
//  - url: 사진 주소 (없어도 됨)
//  - size: 지름(px), 기본 56
export default function Avatar({ url, size = 56 }) {
  // style에 객체를 넘기면 해당 요소에만 적용되는 인라인 스타일이 됩니다.
  const style = { width: size, height: size, fontSize: size * 0.45 };

  return url
    // referrerPolicy: 사진 서버(카카오 등)에 우리 사이트 주소를 보내지 않게 합니다.
    ? <img className="avatar" src={url} alt="" style={style} referrerPolicy="no-referrer" />
    : <span className="avatar" style={style} aria-hidden="true">☺</span>;
}
