import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import GlobalHeader from './components/GlobalHeader';
import Dashboard from './pages/Dashboard';
import AdsAnalysis from './pages/AdsAnalysis';
import Funnel from './pages/Funnel';
import CRM from './pages/CRM';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import OnboardingGuide from './components/OnboardingGuide';
import { supabase } from './lib/supabase';
import './styles/App.css';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginPage = location.pathname === '/login';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session && location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session && location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [location.pathname, navigate]);

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}><h3>Verificando acesso...</h3></div>;
  }

  return (
    <div className={isLoginPage ? "login-container" : "app-container"}>
      {/* Sidebar apenas se não for login */}
      {!isLoginPage && <Sidebar />}
      
      <div className={isLoginPage ? "login-content" : "layout-wrapper"}>
        {/* Header fixo global apenas se não for login */}
        {!isLoginPage && <GlobalHeader />}
        
        {/* Conteúdo da Rota */}
        <Routes>
          <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ads" element={<AdsAnalysis />} />
          <Route path="/funnel" element={<Funnel />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/:tabId" element={<Settings />} />
          <Route path="/configuracoes" element={<Navigate to="/settings" replace />} />
        </Routes>
      </div>

      {/* Guia de Onboarding Global */}
      {!isLoginPage && session && <OnboardingGuide />}
    </div>
  );
}

export default App;
