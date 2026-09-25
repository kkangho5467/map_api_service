// 하단 탭 바. '지도'와 'MY'가 동작하고, 찜/인증은 이후 단계에서 연결합니다.
const TABS = [
  { id: 'map', icon: '🗺', label: '지도', ready: true },
  { id: 'likes', icon: '♡', label: '찜', ready: false },
  { id: 'checkin', icon: '✓', label: '인증', ready: false },
  { id: 'my', icon: '☺', label: 'MY', ready: true },
];

// props:
//  - activeTab: 현재 선택된 탭 id
//  - onSelectTab: 탭을 눌렀을 때 부모에게 탭 id를 알리는 함수
export default function TabBar({ activeTab, onSelectTab }) {
  return (
    <nav className="tab-bar" aria-label="메인 메뉴">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className="tab"
          type="button"
          disabled={!tab.ready}
          // aria-current="page": 스크린리더에게 "지금 보고 있는 탭"임을 알려줍니다. 해당 없으면 속성 자체를 뺍니다.
          aria-current={tab.id === activeTab ? 'page' : undefined}
          onClick={() => onSelectTab(tab.id)}
        >
          <span className="icon">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
