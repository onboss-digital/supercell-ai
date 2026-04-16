import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const GlobalHeader = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    navigate('/login');
  };

  const handleProfile = () => {
    navigate('/settings');
    setIsProfileOpen(false);
  };

  // Se estiver na página de login, não mostra o header
  if (location.pathname === '/login') return null;

  return (
    <header className="global-header">
      <div className="header-left">
        <div className="header-avatar-status">
           <img src="https://ui-avatars.com/api/?name=Jarvis&background=0049DB&color=fff" alt="AI Jarvis" />
           <div className="status-dot"></div>
        </div>
        <div className="header-text">
          <h2>Bem-vindo de volta, Sr. Gustavo</h2>
          <p>SupercellAI processou seus canais. Aqui está a síntese estratégica de hoje.</p>
        </div>
      </div>

      <div className="header-actions">
        <button className="header-icon-btn">
          <span className="material-icons-outlined">notifications</span>
          <span className="notification-badge"></span>
        </button>
        <button className="header-icon-btn" onClick={() => navigate('/settings')}>
          <span className="material-icons-outlined">settings</span>
        </button>
        
        <div className="profile-dropdown-container" ref={dropdownRef}>
          <button 
            className={`profile-trigger ${isProfileOpen ? 'active' : ''}`} 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <img src="https://ui-avatars.com/api/?name=Gustavo&background=333&color=fff" alt="User Profile" />
          </button>

          {isProfileOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <strong>Sr. Gustavo</strong>
                <span>Administrador</span>
              </div>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item" onClick={handleProfile}>
                <span className="material-icons-outlined">person</span>
                Perfil
              </button>
              <button className="dropdown-item" onClick={() => navigate('/settings')}>
                 <span className="material-icons-outlined">account_balance_wallet</span>
                 Assinatura
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout" onClick={handleLogout}>
                <span className="material-icons-outlined">logout</span>
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;
