import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { menuItems } from '../data/mockData';
import logoImg from '../assets/logo-supercell.png';

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Aqui você pode adicionar a lógica de limpar localStorage/cookies se necessário
    navigate('/login');
  };

  return (
    <>
      {/* Sidebar para Desktop / Top Header para Mobile */}
      <aside className="sidebar">
        <div className="brand">
          <img src={logoImg} alt="SuperCell AI" style={{ height: '80px', width: 'auto' }} />
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

        <div className="mobile-only" style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
           <NavLink to="/settings" style={{ color: 'var(--color-primary)' }}>
              <span className="material-icons-outlined">settings</span>
           </NavLink>
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
