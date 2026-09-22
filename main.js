import { supabase } from './supabaseClient.js';

// Vite가 .env에서 VITE_ 접두사가 붙은 환경변수를 읽어옵니다.
const kakaoAppKey = import.meta.env.VITE_KAKAO_MAP_API_KEY;
const mapElement = document.querySelector('#map');
const statusElement = document.querySelector('#map-status');
const placeListElement = document.querySelector('#place-list');
const placeCountElement = document.querySelector('#place-count');
const filterButtons = document.querySelectorAll('.filter');
const detailNameElement = document.querySelector('#detail-name');
const detailAddressElement = document.querySelector('#detail-address');
const detailTagsElement = document.querySelector('#detail-tags');
const detailCrowdElement = document.querySelector('#detail-crowd');
const detailTransportElement = document.querySelector('#detail-transport');
const detailAccessElement = document.querySelector('#detail-access');
const detailReviewTitleElement = document.querySelector('#detail-review-title');
const detailReviewElement = document.querySelector('#detail-review');
const detailRouteButton = document.querySelector('#detail-route');
const detailShareButton = document.querySelector('#detail-share');

// 키가 비어 있으면 SDK 요청 자체를 보내지 않아 원인을 쉽게 확인할 수 있게 합니다.
if (!kakaoAppKey) {
  statusElement.textContent = 'KAKAO KEY NOT FOUND';
  throw new Error('VITE_KAKAO_MAP_API_KEY가 .env에 설정되지 않았습니다.');
}

// 카카오 지도 SDK를 동적으로 불러오면 키를 코드 곳곳에 반복해서 적지 않아도 됩니다.
const kakaoScript = document.createElement('script');
kakaoScript.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(kakaoAppKey)}&autoload=false`;
kakaoScript.async = true;

kakaoScript.addEventListener('load', () => {
  // SDK가 준비된 뒤 지도 객체를 생성해야 kakao.maps를 안전하게 사용할 수 있습니다.
  window.kakao.maps.load(async () => {
    const seoulPosition = new window.kakao.maps.LatLng(37.5665, 126.9780);
    const map = new window.kakao.maps.Map(mapElement, {
      center: seoulPosition,
      level: 7,
    });

    // 모바일에서도 손가락으로 지도를 상하좌우 이동할 수 있도록 드래그를 명시적으로 켭니다.
    map.setDraggable(true);

    // Supabase places 테이블에서 지도에 표시할 장소 목록을 조회합니다.
    const { data: places, error } = await supabase
      .from('places')
      .select('*');

    if (error) {
      console.error('장소 데이터 조회 실패:', error);
      statusElement.textContent = 'PLACES LOAD ERROR';
      placeCountElement.textContent = '장소를 불러오지 못했습니다';
    } else {
      console.log('조회된 장소:', places);

      const categoryNames = {
        restaurant: '맛집',
        festival: '축제',
        cafe: '카페',
      };
      let activeCategory = 'all';
      let activeInfoWindow = null;
      const markerRecords = [];

      // 실제 데이터의 태그를 활용해 장소 카드에 방문 판단 정보를 요약합니다.
      const getVisitSignal = (place) => {
        if (place.tags?.includes('주차 불가')) return '대중교통 추천';
        if (place.tags?.includes('주차 가능')) return '주차 가능';
        if (place.tags?.includes('접근성')) return '접근성 확인';
        return '방문 정보 확인';
      };

      // 아직 수집하지 않은 데이터는 추정값처럼 보이지 않도록 준비 상태로 표시합니다.
      const getPlaceInsight = (place) => ({
        crowd: place.tags?.includes('주차 혼잡 예상') ? '주말 혼잡 예상' : '데이터 준비 중',
        transport: place.tags?.includes('주차 불가')
          ? '주차 불가 · 공영주차장'
          : place.tags?.includes('주차 가능')
            ? '무료 주차 가능'
            : '이동 정보 준비 중',
        access: place.tags?.includes('접근성') ? '접근성 정보 확인' : '정보 준비 중',
      });

      const selectPlace = (place, record = null) => {
        const insight = getPlaceInsight(place);
        detailNameElement.textContent = place.name;
        detailAddressElement.textContent = place.address;
        detailTagsElement.innerHTML = (place.tags ?? [])
          .map((tag) => `<span class="detail-tag">#${tag}</span>`)
          .join('');
        detailCrowdElement.textContent = insight.crowd;
        detailTransportElement.textContent = insight.transport;
        detailAccessElement.textContent = insight.access;
        detailReviewTitleElement.textContent = `${categoryNames[place.category] ?? place.category} 방문 노트`;
        detailReviewElement.textContent = place.category === 'festival'
          ? '행사 당일 주변 교통과 혼잡도 데이터가 연결되면 방문 시간대를 추천할 예정입니다.'
          : '최신 후기와 운영시간을 연결하면 방문 전 판단에 필요한 정보를 한곳에서 확인할 수 있습니다.';

        if (record) {
          if (activeInfoWindow) activeInfoWindow.close();
          map.setCenter(record.position);
          record.infoWindow.open(map, record.marker);
          activeInfoWindow = record.infoWindow;
        }

        document.querySelectorAll('.place-card').forEach((item) => {
          item.classList.toggle('is-active', item.dataset.placeId === String(place.id));
        });
      };

      const renderPlaceList = (visiblePlaces) => {
        placeListElement.innerHTML = '';
        placeCountElement.textContent = `${visiblePlaces.length}곳의 장소를 탐색 중`;

        visiblePlaces.forEach((place) => {
          const card = document.createElement('button');
          card.type = 'button';
          card.className = 'place-card';
          card.dataset.placeId = place.id;
          card.innerHTML = `
            <span>
              <strong>${place.name}</strong>
              <span class="address">${place.address}</span>
              <span class="tagline">${getVisitSignal(place)} · ${categoryNames[place.category] ?? place.category}</span>
            </span>
            <span class="traffic">${place.tags?.includes('주차 불가') ? 'PARKING △' : 'ACCESS +'}</span>
          `;

          card.addEventListener('click', () => {
            const record = markerRecords.find((item) => item.place.id === place.id);
            if (!record) return;
            selectPlace(place, record);
          });

          placeListElement.appendChild(card);
        });
      };

      const renderMapMarkers = () => {
        markerRecords.forEach((record) => {
          record.marker.setMap(null);
          record.infoWindow.close();
        });
        markerRecords.length = 0;

        const visiblePlaces = activeCategory === 'all'
          ? places
          : places.filter((place) => place.category === activeCategory);
        const bounds = new window.kakao.maps.LatLngBounds();

        visiblePlaces.forEach((place) => {
          const position = new window.kakao.maps.LatLng(place.lat, place.lng);
          const marker = new window.kakao.maps.Marker({ map, position });
          const infoWindow = new window.kakao.maps.InfoWindow({
            content: `<div style="padding:8px 12px; white-space:nowrap;">${place.name}<br><small>${categoryNames[place.category] ?? place.category}</small></div>`,
          });
          const record = { place, marker, infoWindow, position };
          markerRecords.push(record);

          window.kakao.maps.event.addListener(marker, 'mouseover', () => infoWindow.open(map, marker));
          window.kakao.maps.event.addListener(marker, 'mouseout', () => infoWindow.close());
          window.kakao.maps.event.addListener(marker, 'click', () => {
            selectPlace(place, record);
          });

          bounds.extend(position);
        });

        renderPlaceList(visiblePlaces);
        if (visiblePlaces.length > 0) {
          map.setBounds(bounds);
          statusElement.textContent = `${visiblePlaces.length} PLACES READY`;
        } else {
          statusElement.textContent = 'NO PLACES FOUND';
        }
      };

      filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
          activeCategory = button.dataset.category;
          filterButtons.forEach((item) => item.setAttribute('aria-selected', String(item === button)));
          renderMapMarkers();
        });
      });

      detailRouteButton.addEventListener('click', () => {
        if (!detailNameElement.textContent || detailNameElement.textContent === '장소를 선택해보세요') return;
        const query = encodeURIComponent(detailNameElement.textContent);
        window.open(`https://map.kakao.com/?q=${query}`, '_blank', 'noopener,noreferrer');
      });

      detailShareButton.addEventListener('click', async () => {
        const shareText = `${detailNameElement.textContent} · Pop-Course`;
        if (navigator.share) {
          await navigator.share({ title: shareText, text: detailAddressElement.textContent });
        } else {
          await navigator.clipboard.writeText(`${shareText}\n${detailAddressElement.textContent}`);
          detailShareButton.textContent = '복사 완료';
          window.setTimeout(() => { detailShareButton.textContent = '공유하기'; }, 1400);
        }
      });

      if (places.length > 0) {
        renderMapMarkers();
      } else {
        statusElement.textContent = 'NO PLACES FOUND';
        placeCountElement.textContent = '등록된 장소가 없습니다';
      }
    }
  });
});

kakaoScript.addEventListener('error', () => {
  statusElement.textContent = 'MAP SDK ERROR';
  console.error('카카오 지도 SDK를 불러오지 못했습니다. 웹 플랫폼 도메인과 JavaScript 키를 확인하세요.');
});

document.head.appendChild(kakaoScript);