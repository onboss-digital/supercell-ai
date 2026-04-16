import React from 'react';
import { NavLink } from 'react-router-dom';
import { menuItems } from '../data/mockData';
import logoImg from '../assets/logo-super-ai.png';

const Sidebar = () => {
  return (
    <>
      {/* Sidebar para Desktop / Top Header para Mobile */}
      <aside className="sidebar">
        <div className="brand" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <img src={logoImg} alt="SuperCell AI" style={{ height: '32px', width: 'auto', alignSelf: 'flex-start' }} />
          <p className="desktop-only text-primary" style={{ fontWeight: '600', letterSpacing: '0.02em', fontSize: '0.85rem' }}>Inteligência de dados com IA</p>
        </div>
        
        {/* Menu Principal (Lateral no Desktop / Sumido no Mobile em favor do BottomNav) */}
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
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="material-icons-outlined">settings</span>
            <span>Configurações</span>
          </NavLink>
          <button 
            className="nav-item" 
            style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
          >
            <span className="material-icons-outlined">logout</span>
            <span>Sair</span>
          </button>
        </div>

        {/* Ícone de Configurações no Topo para Mobile */}
        <div className="mobile-only" style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
           <NavLink to="/settings" style={{ color: 'var(--color-on-surface)' }}>
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
