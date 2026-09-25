// 하단 탭 바. 지금은 '지도'만 동작하고, 나머지는 이후 단계(찜/인증/로그인)에서 연결합니다.
const TABS = [
  { id: 'map', icon: '🗺', label: '지도', ready: true },
  { id: 'likes', icon: '♡', label: '찜', ready: false },
  { id: 'checkin', icon: '✓', label: '인증', ready: false },
  { id: 'my', icon: '☺', label: 'MY', ready: false },
];

export default function TabBar() {
  return (
    <nav className="tab-bar" aria-label="메인 메뉴">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className="tab"
          type="button"
          disabled={!tab.ready}
          // aria-current="page": 스크린리더에게 "지금 보고 있는 탭"임을 알려줍니다. 해당 없으면 속성 자체를 뺍니다.
          aria-current={tab.id === 'map' ? 'page' : undefined}
        >
          <span className="icon">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
