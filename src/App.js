import React, { useState } from 'react';
import './App.css';
import TodoList from './components/todo/TodoList';
import Header from './components/shared/Header';
import Settings from './components/settings/Settings';

function App() {
  const [showSettings, setShowSettings] = useState(false);

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  return (
    <div className="App">
      <Header onSettingsClick={handleSettingsClick} />
      <main className="app-main">
        <TodoList />
      </main>
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="settings-modal-overlay" onClick={handleCloseSettings}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <Settings />
            <button 
              className="settings-close-btn"
              onClick={handleCloseSettings}
              aria-label="Close settings"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;