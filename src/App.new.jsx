import { useState } from 'react';
import { Sidebar, Header } from './components/layout';
import { DefenderPage, CleanerPage, SettingsPage } from './pages';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('defender');

  const titles = {
    cleaner: 'Windows Cleaner',
    defender: 'Windows Defender',
    settings: 'Configurações'
  };

  return (
    <div className="app">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="app__main">
        <Header title={titles[activeTab]} />
        
        <div className="app__content">
          {activeTab === 'cleaner' && <CleanerPage />}
          {activeTab === 'defender' && <DefenderPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}

export default App;
