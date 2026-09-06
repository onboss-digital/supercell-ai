import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../api/config';
import jarvisImg from '../assets/jarvis-foto.jpg';

const GlobalHeader = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const dropdownRef = useRef(null);
  const notificationsDropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationsDropdownRef.current && !notificationsDropdownRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
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

  const [companyLogo, setCompanyLogo] = useState('');
  const [companyName, setCompanyName] = useState('ADMIN');
  const [greeting, setGreeting] = useState('CENTRAL DE COMANDO');
  const [weather, setWeather] = useState({ temp: '28°C', time: '--:--' });

  const fetchCompanyProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/company`);
      const data = await res.json();
      setCompanyLogo(data.logoUrl || '');
      setCompanyName(data.name || 'ADMIN');
      
      // Atualiza frases com o nome real
      const name = (data.name || 'ADMIN').toUpperCase();
      const dynamicPhrases = [
        `BEM-VINDO DE VOLTA, SENHOR ${name}`,
        `SISTEMA PRONTO PARA OPERAÇÃO, SENHOR ${name}`,
        `AGUARDANDO ORDENS, SENHOR ${name}`,
        `CONEXÃO ESTABELECIDA, SENHOR ${name}`,
        `PROTOCOLO DE ANÁLISE ATIVO, SENHOR ${name}`,
        `DADOS ATUALIZADOS, SENHOR ${name}`,
        `SITUAÇÃO NOMINAL, SENHOR ${name}`
      ];
      setGreeting(dynamicPhrases[Math.floor(Math.random() * dynamicPhrases.length)]);
    } catch (e) { console.error('Erro ao buscar perfil:', e); }
  };

  const updateDateTimeAndWeather = async () => {
    // Atualiza Horário de Rio Branco (UTC-5)
    const now = new Date();
    const rbTime = now.toLocaleTimeString('pt-BR', { 
      timeZone: 'America/Rio_Branco', 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Tenta buscar clima de Rio Branco (Sanitizado para evitar vazamento de HTML/CSS)
    try {
      const res = await fetch('https://wttr.in/Rio+Branco?format=1');
      const tempText = await res.text();
      
      // Validação básica: se o texto for muito longo ou contiver tags, é erro
      if (tempText.length > 10 || tempText.includes('<') || tempText.includes('{')) {
        setWeather({ temp: '28°C', time: rbTime }); // Fallback realista para Rio Branco
      } else {
        setWeather({ temp: tempText.trim(), time: rbTime });
      }
    } catch (e) {
      setWeather({ temp: '28°C', time: rbTime });
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error('Erro ao buscar notificações:', e);
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (e) {
      console.error('Erro ao limpar notificações:', e);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: 'PUT'
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (e) {
      console.error('Erro ao marcar notificação como lida:', e);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'venda': return 'monetization_on';
      case 'sistema': return 'warning';
      case 'meta': return 'emoji_events';
      default: return 'notifications';
    }
  };

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Há ${diffHours}h`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    fetchCompanyProfile();
    updateDateTimeAndWeather();
    fetchNotifications();
    
    // Polling a cada 30 segundos
    const notifTimer = setInterval(fetchNotifications, 30000);
    
    // Atualiza o relógio a cada minuto
    const timer = setInterval(updateDateTimeAndWeather, 60000);

    window.addEventListener('companyProfileUpdated', fetchCompanyProfile);
    return () => {
      window.removeEventListener('companyProfileUpdated', fetchCompanyProfile);
      clearInterval(timer);
      clearInterval(notifTimer);
    };
  }, []);

  // Se estiver na página de login, não mostra o header
  if (location.pathname === '/login') return null;

  return (
    <header className="global-header">
      <div className="header-left">
        <div className="header-avatar-status">
           <img src={jarvisImg} alt="AI Jarvis" />
           <div className="status-dot"></div>
        </div>
        <div className="header-text">
          <h2>{greeting}</h2>
          <p>SISTEMA JARVIS V4.0 // RIO BRANCO, AC: {weather.time} // {weather.temp}</p>
        </div>
      </div>

      <div className="header-actions">
        <div className="notifications-dropdown-container" ref={notificationsDropdownRef}>
          <button className="header-icon-btn" onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); fetchNotifications(); }}>
            <span className="material-icons-outlined">notifications</span>
            {notifications.some(n => !n.read) && <span className="notification-badge"></span>}
          </button>
          
          {isNotificationsOpen && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <h3>CENTRAL DE ALERTAS</h3>
                {notifications.length > 0 && (
                  <button className="notifications-clear-btn" onClick={handleClearAll}>
                    <span className="material-icons-outlined" style={{ fontSize: '0.9rem' }}>done_all</span>
                    LIMPAR TUDO
                  </button>
                )}
              </div>
              
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <div className="notifications-empty">
                    <span className="material-icons-outlined">notifications_off</span>
                    <span>Sem novas notificações</span>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`notifications-item type-${notif.type} ${!notif.read ? 'unread' : ''}`}
                      onClick={() => handleMarkAsRead(notif.id)}
                    >
                      <div className="notification-icon-container">
                        <span className="material-icons-outlined notification-icon">
                          {getIcon(notif.type)}
                        </span>
                      </div>
                      <div className="notification-content">
                        <span className="notification-title">{notif.title}</span>
                        <p className="notification-message">{notif.message}</p>
                        <span className="notification-time">{formatTimeAgo(notif.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button className="header-icon-btn" onClick={() => navigate('/settings')}>
          <span className="material-icons-outlined">settings</span>
        </button>
        
        <div className="profile-dropdown-container" ref={dropdownRef}>
          <button 
            className={`profile-trigger ${isProfileOpen ? 'active' : ''}`} 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <img src={companyLogo || `https://ui-avatars.com/api/?name=${companyName}&background=3B82F6&color=fff`} alt="User Profile" />
          </button>

          {isProfileOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <strong>{companyName.toUpperCase()} // ADMIN</strong>
                <span>ACESSO NÍVEL 10</span>
              </div>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item" onClick={handleProfile}>
                <span className="material-icons-outlined">person</span>
                PERFIL
              </button>
              <button className="dropdown-item" onClick={() => navigate('/settings')}>
                 <span className="material-icons-outlined">account_balance_wallet</span>
                 FINANCEIRO
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout" onClick={handleLogout}>
                <span className="material-icons-outlined">logout</span>
                SAIR
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;
