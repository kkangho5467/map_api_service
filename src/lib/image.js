// 사진을 업로드하기 전에 브라우저에서 크기를 줄이는 도우미입니다.
//
// 왜 필요할까요?
// 휴대폰 사진은 3~10MB라서 업로드가 느리고, 저장소 제한(2MB)에도 걸립니다.
// 프로필 사진은 작게 보이므로 512px 정사각형 JPEG로 줄이면 보통 100KB 이하가 됩니다.
//
// 원리: 사진을 보이지 않는 <canvas>에 작게 다시 그린 뒤, 그 그림을 파일(Blob)로 뽑아냅니다.
export const resizeImageToSquare = async (file, size = 512) => {
  // createImageBitmap: 파일을 그림 데이터로 읽어 옵니다. (사진 회전 정보도 반영)
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  // 가운데를 기준으로 정사각형으로 잘라냅니다. (프로필 사진은 동그랗게 보이므로)
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  // drawImage(원본, 잘라낼 x, y, 너비, 높이, 그릴 x, y, 너비, 높이)
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close(); // 메모리 정리

  // toBlob은 콜백 방식이라 Promise로 감싸서 await 할 수 있게 만듭니다.
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('이미지를 변환하지 못했어요.'))),
      'image/jpeg',
      0.85, // 화질 85%: 눈으로는 차이가 거의 없고 용량은 크게 줄어듭니다.
    );
  });
};
