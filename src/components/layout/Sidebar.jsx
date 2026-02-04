import './Sidebar.css';

export function Sidebar({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'cleaner', icon: '🧹', label: 'Cleaner' },
    { id: 'defender', icon: '🛡️', label: 'Defender' },
    { id: 'settings', icon: '⚙️', label: 'Configurações' }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__icon">🛡️</div>
        <div className="sidebar__title">
          <h1>DefenderPro</h1>
          <p>Scanner Profissional</p>
        </div>
      </div>

      <nav className="sidebar__nav">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`sidebar__nav-item ${activeTab === tab.id ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="sidebar__nav-icon">{tab.icon}</span>
            <span className="sidebar__nav-label">{tab.label}</span>
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        v1.0.0 | Open Source
      </div>
    </aside>
  );
}

export default Sidebar;
