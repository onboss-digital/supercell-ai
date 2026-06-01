import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { menuItems } from '../data/mockData';
import logoImg from '../assets/logo-supercell.png';
import { API_URL } from '../api/config';

const Sidebar = () => {
  const navigate = useNavigate();
  const [isProfileOpenMobile, setIsProfileOpenMobile] = useState(false);
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyName, setCompanyName] = useState('ADMIN');

  const handleLogout = () => {
    navigate('/login');
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
    window.addEventListener('companyProfileUpdated', fetchCompanyProfile);
    return () => {
      window.removeEventListener('companyProfileUpdated', fetchCompanyProfile);
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
