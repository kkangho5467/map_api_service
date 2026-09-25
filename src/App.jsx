import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import TopBar from './components/TopBar.jsx';
import MapView from './components/MapView.jsx';
import ListSheet from './components/ListSheet.jsx';
import DetailSheet from './components/DetailSheet.jsx';
import TabBar from './components/TabBar.jsx';

// App = 앱 전체의 '지휘자' 컴포넌트입니다.
// 모든 상태(state)를 여기서 관리하고, 필요한 값과 함수를 자식 컴포넌트에 props로 나눠 줍니다.
// 흐름: 데이터는 위(App) → 아래(자식)로, 사용자 동작은 아래(자식) → 위(App)로 함수 호출로 전달됩니다.
export default function App() {
  // useState(초기값) → [현재값, 값을 바꾸는 함수]
  // 값을 바꾸는 함수를 호출하면 React가 알아서 화면을 다시 그립니다.
  const [places, setPlaces] = useState([]);                 // Supabase에서 받은 전체 장소
  const [isLoading, setIsLoading] = useState(true);         // 데이터 불러오는 중?
  const [loadError, setLoadError] = useState(null);         // 데이터 조회 에러
  const [mapError, setMapError] = useState(null);           // 지도 SDK 에러
  const [activeCategory, setActiveCategory] = useState('all'); // 선택된 필터
  const [selectedPlace, setSelectedPlace] = useState(null); // 선택된 장소
  const [isListExpanded, setIsListExpanded] = useState(false); // 목록 시트 펼침?
  const [isDetailOpen, setIsDetailOpen] = useState(false);  // 상세 모달 열림?

  // 처음 화면이 뜰 때 한 번, Supabase places 테이블에서 장소를 가져옵니다.
  useEffect(() => {
    // effect 함수 자체는 async로 만들 수 없어서, 안에 async 함수를 만들어 바로 호출합니다.
    const fetchPlaces = async () => {
      try {
        const { data, error } = await supabase.from('places').select('*');
        // Supabase는 실패해도 예외를 던지지 않고 error에 담아 주므로 직접 확인해서 던집니다.
        if (error) throw error;
        setPlaces(data ?? []);
      } catch (error) {
        // 네트워크 끊김 등 예상 못 한 에러도 여기서 한꺼번에 처리됩니다.
        console.error('장소 데이터 조회 실패:', error);
        setLoadError(error);
      } finally {
        // 성공하든 실패하든 로딩은 끝났다고 표시합니다.
        setIsLoading(false);
      }
    };
    fetchPlaces();
  }, []);

  // useMemo: places나 activeCategory가 바뀔 때만 필터링을 다시 계산합니다.
  // 매번 새 배열을 만들면 MapView가 "장소가 바뀌었다"고 착각해 마커를 계속 다시 찍기 때문입니다.
  const visiblePlaces = useMemo(
    () => (activeCategory === 'all'
      ? places
      : places.filter((place) => place.category === activeCategory)),
    [places, activeCategory],
  );

  // useCallback: 함수를 '기억'해 두고 재사용합니다. (위 useMemo와 같은 이유로 MapView 재실행 방지)
  // 장소를 고르면 → 선택 저장 + 목록 시트 접기 + 상세 모달 열기
  const handleSelectPlace = useCallback((place) => {
    setSelectedPlace(place);
    setIsListExpanded(false);
    setIsDetailOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => setIsDetailOpen(false), []);

  // 상단 상태 알약에 보여줄 문구 (우선순위: 지도 에러 → 로딩 → 데이터 에러 → 결과)
  let statusText;
  if (mapError) statusText = 'MAP SDK ERROR';
  else if (isLoading) statusText = 'LOADING';
  else if (loadError) statusText = 'PLACES LOAD ERROR';
  else if (visiblePlaces.length === 0) statusText = 'NO PLACES FOUND';
  else statusText = `${visiblePlaces.length} PLACES READY`;

  // 목록 시트 제목 옆 문구
  let countText;
  if (isLoading) countText = '불러오는 중';
  else if (loadError) countText = '장소를 불러오지 못했어요';
  else countText = `${visiblePlaces.length}곳`;

  return (
    <div className="app">
      <MapView
        places={visiblePlaces}
        selectedPlace={selectedPlace}
        onSelectPlace={handleSelectPlace}
        onError={setMapError}
      />
      <TopBar
        activeCategory={activeCategory}
        onChangeCategory={setActiveCategory}
        statusText={statusText}
      />
      <ListSheet
        places={visiblePlaces}
        countText={countText}
        selectedId={selectedPlace?.id}
        expanded={isListExpanded}
        onExpandChange={setIsListExpanded}
        onSelectPlace={handleSelectPlace}
      />
      <DetailSheet
        place={selectedPlace}
        open={isDetailOpen}
        onClose={handleCloseDetail}
      />
      <TabBar />
    </div>
  );
}
