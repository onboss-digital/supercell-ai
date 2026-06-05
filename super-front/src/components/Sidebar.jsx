import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { menuItems } from '../data/mockData';
import logoImg from '../assets/logo-supercell.png';
import { API_URL } from '../api/config';

const Sidebar = () => {
  const navigate = useNavigate();
  const [isProfileOpenMobile, setIsProfileOpenMobile] = useState(false);
  const [isNotificationsOpenMobile, setIsNotificationsOpenMobile] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyName, setCompanyName] = useState('ADMIN');
  const notificationsDropdownRef = useRef(null);

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsDropdownRef.current && !notificationsDropdownRef.current.contains(event.target)) {
        setIsNotificationsOpenMobile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    navigate('/login');
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
      case 'lead': return 'person_add';
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
    const fetchCompanyProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/company`);
        const data = await res.json();
        setCompanyLogo(data.logoUrl || '');
        setCompanyName(data.name || 'ADMIN');
      } catch (e) {
        console.error('Erro ao buscar perfil:', e);
      }
    };
    fetchCompanyProfile();
    fetchNotifications();

    const notifTimer = setInterval(fetchNotifications, 30000);

    window.addEventListener('companyProfileUpdated', fetchCompanyProfile);
    return () => {
      window.removeEventListener('companyProfileUpdated', fetchCompanyProfile);
      clearInterval(notifTimer);
    };
  }, []);

  return (
    <>
      {/* Sidebar para Desktop / Top Header para Mobile */}
      <aside className="sidebar">
        <div className="brand">
          <img 
            src={logoImg} 
            alt="SuperCell AI" 
            onClick={() => navigate('/dashboard')} 
            style={{ height: '80px', width: 'auto', cursor: 'pointer' }} 
          />
          <p>INTELIGÊNCIA DE DADOS COM IA</p>
        </div>
        
        <nav className="nav-menu desktop-only">
          {menuItems.map((item) => (
            <NavLink 
              key={item.id} 
              to={`/${item.id}`} 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="material-icons-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="nav-footer desktop-only">
          <button className="nav-item" style={{ width: '100%', background: 'transparent' }} onClick={handleLogout}>
            <span className="material-icons-outlined">logout</span>
            <span>Desconectar</span>
          </button>
        </div>

        <div className="mobile-only" style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignItems: 'center', position: 'relative' }}>
           
           {/* Dropdown de Notificações Mobile */}
           <div className="notifications-dropdown-container" ref={notificationsDropdownRef} style={{ position: 'relative' }}>
             <button 
               className="header-icon-btn" 
               onClick={() => { setIsNotificationsOpenMobile(!isNotificationsOpenMobile); fetchNotifications(); }}
               style={{
                 background: 'rgba(255,255,255,0.03)',
                 border: '1px solid rgba(0, 245, 255, 0.1)',
                 width: '32px',
                 height: '32px',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 color: 'var(--color-primary)',
                 borderRadius: '4px',
                 cursor: 'pointer',
                 position: 'relative'
               }}
             >
               <span className="material-icons-outlined" style={{ fontSize: '1.25rem' }}>notifications</span>
               {notifications.some(n => !n.read) && <span className="notification-badge"></span>}
             </button>

             {isNotificationsOpenMobile && (
               <div className="notifications-dropdown" style={{
                 position: 'absolute',
                 top: '130%',
                 right: '-60px',
                 width: '290px',
                 background: 'rgba(0, 15, 20, 0.98)',
                 backdropFilter: 'blur(20px)',
                 borderRadius: '4px',
                 border: '1px solid rgba(0, 245, 255, 0.2)',
                 boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                 zIndex: 2000,
                 display: 'flex',
                 flexDirection: 'column',
                 padding: '0.75rem',
                 gap: '0.5rem'
               }}>
                 <div className="notifications-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(0, 245, 255, 0.1)' }}>
                   <h3 style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--color-on-surface)', fontFamily: 'var(--font-mono)' }}>ALERTAS</h3>
                   {notifications.length > 0 && (
                     <button className="notifications-clear-btn" onClick={handleClearAll} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontSize: '0.6rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                       <span className="material-icons-outlined" style={{ fontSize: '0.8rem' }}>done_all</span>
                       LIMPAR
                     </button>
                   )}
                 </div>
                 
                 <div className="notifications-list" style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                   {notifications.length === 0 ? (
                     <div className="notifications-empty" style={{ padding: '1.5rem 0', textAlign: 'center', fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                       <span className="material-icons-outlined" style={{ fontSize: '1.5rem', color: 'rgba(0, 245, 255, 0.2)' }}>notifications_off</span>
                       <span>Sem alertas</span>
                     </div>
                   ) : (
                     notifications.map((notif) => (
                       <div 
                         key={notif.id} 
                         className={`notifications-item type-${notif.type} ${!notif.read ? 'unread' : ''}`}
                         onClick={() => handleMarkAsRead(notif.id)}
                         style={{
                           display: 'flex',
                           gap: '0.5rem',
                           padding: '0.5rem',
                           borderRadius: '4px',
                           background: 'rgba(255,255,255,0.02)',
                           borderLeft: '3px solid transparent',
                           cursor: 'pointer',
                           textAlign: 'left'
                         }}
                       >
                         <div className="notification-icon-container" style={{ display: 'flex', alignItems: 'flex-start' }}>
                           <span className="material-icons-outlined notification-icon" style={{ fontSize: '1rem' }}>
                             {getIcon(notif.type)}
                           </span>
                         </div>
                         <div className="notification-content" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                           <span className="notification-title" style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--color-on-surface)' }}>{notif.title}</span>
                           <p className="notification-message" style={{ fontSize: '0.6rem', color: 'var(--color-on-surface-variant)', lineHeight: '1.3' }}>{notif.message}</p>
                           <span className="notification-time" style={{ fontSize: '0.55rem', color: 'var(--color-primary)', opacity: 0.7 }}>{formatTimeAgo(notif.createdAt)}</span>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
               </div>
             )}
           </div>

           <NavLink to="/settings" style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center' }}>
              <span className="material-icons-outlined" style={{ fontSize: '1.4rem' }}>settings</span>
           </NavLink>
           
           <div className="profile-dropdown-container-mobile" style={{ position: 'relative' }}>
              <button 
                onClick={() => setIsProfileOpenMobile(!isProfileOpenMobile)}
                style={{
                  background: 'transparent',
                  border: '2px solid transparent',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  overflow: 'hidden'
                }}
              >
                <img 
                  src={companyLogo || `https://ui-avatars.com/api/?name=${companyName}&background=3B82F6&color=fff`} 
                  alt="Perfil" 
                  style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                />
              </button>
              
              {isProfileOpenMobile && (
                <div style={{
                  position: 'absolute',
                  top: '120%',
                  right: 0,
                  width: '180px',
                  background: 'rgba(0, 15, 20, 0.98)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '4px',
                  border: '1px solid rgba(0, 245, 255, 0.2)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  zIndex: 2000,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '0.5rem 0'
                }}>
                  <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--color-on-surface)' }}>{companyName.toUpperCase()}</span>
                    <span style={{ fontSize: '0.55rem', color: 'var(--color-on-surface-variant)' }}>ADMIN</span>
                  </div>
                  <button 
                    onClick={() => { navigate('/settings'); setIsProfileOpenMobile(false); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface)', padding: '0.6rem 1rem', textAlign: 'left', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>person</span>
                    Perfil
                  </button>
                  <button 
                    onClick={handleLogout}
                    style={{ background: 'transparent', border: 'none', color: '#ff5c5c', padding: '0.6rem 1rem', textAlign: 'left', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>logout</span>
                    Sair
                  </button>
                </div>
              )}
           </div>
        </div>
      </aside>

      {/* Bottom Navigation exclusiva para Mobile */}
      <nav className="bottom-nav mobile-only">
        {menuItems.slice(0, 6).map((item) => (
          <NavLink 
            key={item.id} 
            to={`/${item.id}`} 
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="material-icons-outlined">{item.icon}</span>
            <span style={{ fontSize: '0.58rem', fontWeight: '700', letterSpacing: '-0.02em' }}>
              {item.id === 'reports' ? 'IA' : item.label.split(' ')[0]}
            </span>
          </NavLink>
        ))}
      </nav>
    </>
  );
};

export default Sidebar;
