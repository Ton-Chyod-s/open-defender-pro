import './TabNav.css';

export function TabNav({ tabs, activeTab, onTabChange }) {
  return (
    <div className="tab-nav">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-nav__item ${activeTab === tab.id ? 'tab-nav__item--active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon && <span className="tab-nav__icon">{tab.icon}</span>}
          <span className="tab-nav__label">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export default TabNav;
