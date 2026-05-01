import React from 'react';
import { NavLink } from 'react-router-dom';
import { menuItems } from '../data/mockData';
import logoImg from '../assets/logo-supercell.png';

const Sidebar = () => {
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
          <button className="nav-item" style={{ width: '100%', background: 'transparent' }}>
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
        {menuItems.slice(0, 5).map((item) => (
          <NavLink 
            key={item.id} 
            to={`/${item.id}`} 
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="material-icons-outlined">{item.icon}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: '700' }}>{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
};

export default Sidebar;
