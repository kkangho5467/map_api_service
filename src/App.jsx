import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import TopBar from './components/TopBar.jsx';
import MapView from './components/MapView.jsx';
import ListSheet from './components/ListSheet.jsx';
import DetailSheet from './components/DetailSheet.jsx';
import TabBar from './components/TabBar.jsx';
import AccountSheet from './components/AccountSheet.jsx';
import { useAuth } from './hooks/useAuth.js';
import { useProfile } from './hooks/useProfile.js';
import { useLikes } from './hooks/useLikes.js';

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
  const [isAccountOpen, setIsAccountOpen] = useState(false); // MY(계정) 시트 열림?

  // 로그인 관련 상태와 함수는 useAuth 훅이 한꺼번에 관리합니다.
  const { user, isAuthLoading, authError, signInWithKakao, signOut } = useAuth();

  // 프로필·커플·커플 요청 데이터는 App에서 불러옵니다.
  // 마이페이지(AccountSheet)뿐 아니라 탭 바도 "받은 요청이 있는지"를 알아야 빨간 점을 띄울 수 있기 때문입니다.
  const profileState = useProfile(user);
  const hasNewRequest = profileState.requests.incoming.length > 0;

  // 내 찜 목록(찜한 장소 id 모음)과 찜 추가/취소 함수
  const { likedIds, toggleLike } = useLikes(user);

  // 로그아웃하면 '찜한 곳' 필터를 풀어 줍니다. (찜 목록이 비어 빈 지도만 보이는 것을 방지)
  useEffect(() => {
    if (!user && !isAuthLoading) {
      setActiveCategory((prev) => (prev === 'likes' ? 'all' : prev));
    }
  }, [user, isAuthLoading]);

  // 로그인 에러가 생기면(예: 카카오 동의 화면에서 실패하고 돌아옴) MY 시트를 열어 에러 문구를 보여줍니다.
  useEffect(() => {
    if (authError) setIsAccountOpen(true);
  }, [authError]);

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
  // 'likes'(찜한 곳)는 카테고리가 아니라 내 찜 목록에 있는지로 거릅니다.
  const visiblePlaces = useMemo(() => {
    if (activeCategory === 'all') return places;
    if (activeCategory === 'likes') return places.filter((place) => likedIds.has(place.id));
    return places.filter((place) => place.category === activeCategory);
  }, [places, activeCategory, likedIds]);

  // useCallback: 함수를 '기억'해 두고 재사용합니다. (위 useMemo와 같은 이유로 MapView 재실행 방지)
  // 장소를 고르면 → 선택 저장 + 목록 시트 접기 + 상세 모달 열기
  const handleSelectPlace = useCallback((place) => {
    setSelectedPlace(place);
    setIsListExpanded(false);
    setIsDetailOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => setIsDetailOpen(false), []);
  const handleCloseAccount = useCallback(() => setIsAccountOpen(false), []);

  // 로그인이 필요한 동작인데 로그아웃 상태면 → 다른 시트를 닫고 MY(로그인) 시트를 엽니다.
  // 로그인 상태면 true를 돌려줘서 "계속 진행해도 된다"고 알려 줍니다.
  const requireLogin = () => {
    if (user) return true;
    setIsDetailOpen(false);
    setIsListExpanded(false);
    setIsAccountOpen(true);
    return false;
  };

  // 상단 필터 선택. '찜한 곳'은 로그인해야 볼 수 있습니다.
  const handleChangeCategory = (category) => {
    if (category === 'likes' && !requireLogin()) return;
    setActiveCategory(category);
  };

  // 상세 모달의 ♡ 버튼. 로그아웃 상태면 로그인 시트를 엽니다.
  const handleToggleLike = async (place) => {
    if (!requireLogin()) return;
    await toggleLike(place.id); // 실패하면 에러가 DetailSheet까지 전달되어 안내 문구가 뜹니다.
  };

  // 하단 탭 선택
  //  - MY → 계정 시트 열기
  //  - 찜 → '찜한 곳' 필터 켜기 (로그아웃 상태면 로그인 시트)
  //  - 지도 → 시트 모두 닫고, 찜 필터였다면 '전체'로 되돌리기
  // 시트는 한 번에 하나만 보이도록 다른 시트는 닫아 줍니다.
  const handleSelectTab = (tabId) => {
    if (tabId === 'likes') {
      if (!requireLogin()) return;
      setActiveCategory('likes');
    } else if (tabId === 'map' && activeCategory === 'likes') {
      setActiveCategory('all');
    }
    setIsDetailOpen(false);
    setIsListExpanded(false);
    setIsAccountOpen(tabId === 'my');
  };

  // 지금 선택된 하단 탭: MY 시트가 열려 있으면 MY, 찜 필터면 찜, 그 외는 지도
  let activeTab = 'map';
  if (isAccountOpen) activeTab = 'my';
  else if (activeCategory === 'likes') activeTab = 'likes';

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
  else if (activeCategory === 'likes' && visiblePlaces.length === 0) countText = '아직 찜한 곳이 없어요';
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
        onChangeCategory={handleChangeCategory}
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
        liked={selectedPlace ? likedIds.has(selectedPlace.id) : false}
        onToggleLike={handleToggleLike}
      />
      <AccountSheet
        open={isAccountOpen}
        onClose={handleCloseAccount}
        user={user}
        isAuthLoading={isAuthLoading}
        authError={authError}
        onLogin={signInWithKakao}
        onLogout={signOut}
        profileState={profileState}
      />
      <TabBar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        hasMyAlert={hasNewRequest}
      />
    </div>
  );
}
