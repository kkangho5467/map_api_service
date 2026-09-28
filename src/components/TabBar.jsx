// 하단 탭 바. '지도', '찜'(찜한 곳 필터), 'MY'가 동작하고, 인증은 이후 단계에서 연결합니다.
const TABS = [
  { id: 'map', icon: '🗺', label: '지도', ready: true },
  { id: 'likes', icon: '♡', label: '찜', ready: true },
  { id: 'checkin', icon: '✓', label: '인증', ready: false },
  { id: 'my', icon: '☺', label: 'MY', ready: true },
];

// props:
//  - activeTab: 현재 선택된 탭 id
//  - onSelectTab: 탭을 눌렀을 때 부모에게 탭 id를 알리는 함수
//  - hasMyAlert: true면 MY 탭에 빨간 점 표시 (예: 받은 커플 요청이 있을 때)
export default function TabBar({ activeTab, onSelectTab, hasMyAlert = false }) {
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
          <span className="icon">
            {tab.icon}
            {/* 빨간 점: 눈으로 보는 표시라 스크린리더용 설명은 visually-hidden 글자로 따로 붙입니다. */}
            {tab.id === 'my' && hasMyAlert && (
              <span className="tab-dot"><span className="visually-hidden">새 커플 요청</span></span>
            )}
          </span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
