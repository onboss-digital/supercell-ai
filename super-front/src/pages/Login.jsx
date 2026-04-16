import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import logoImg from '../assets/logo-super-ai.png';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      // Login com sucesso, exibe animação
      setShowWelcome(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: 'var(--font-family)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {showWelcome && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'var(--color-surface)', zIndex: 9999, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <img 
            src={logoImg} 
            alt="Supercell AI Logo" 
            style={{ 
              height: '80px', 
              animation: 'pulse 1.5s infinite ease-in-out' 
            }} 
          />
          <h2 style={{ marginTop: '2rem', color: 'var(--color-on-surface)', fontWeight: '800', animation: 'fadeInUp 0.5s ease-out 0.2s both' }}>Preparando Inteligência...</h2>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.7; } }
          `}</style>
        </div>
      )}

      {/* Decorative Blur Background elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '40%', height: '40%', background: 'rgba(0, 73, 219, 0.05)', filter: 'blur(100px)', borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', bottom: '-5%', right: '-5%', width: '30%', height: '30%', background: 'rgba(0, 73, 219, 0.03)', filter: 'blur(80px)', borderRadius: '50%' }}></div>

      <div style={{ 
        margin: 'auto', 
        width: '100%', 
        maxWidth: '450px', 
        padding: '2.5rem', 
        background: 'white', 
        borderRadius: '2rem', 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)',
        zIndex: 1,
        position: 'relative'
      }}>
        <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <img src={logoImg} alt="Supercell AI" style={{ height: '48px', margin: '0 auto 1.5rem', display: 'block' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--color-on-surface)', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>Central de Login</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>Acesse sua central de inteligência estratégica.</p>
        </header>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {errorMsg && (
            <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 'bold' }}>
              {errorMsg}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>E-mail</label>
            <input 
              type="email" 
              placeholder="seu@nome.com" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ 
                padding: '1rem', 
                borderRadius: '0.75rem', 
                border: '1.5px solid var(--color-surface-container-high)', 
                background: '#fcfcfc', 
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-surface-container-high)'}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Senha</label>
               <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: '700', cursor: 'pointer' }}>Esqueceu a senha?</span>
            </div>
            <input 
              type="password" 
              placeholder="••••••••" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                padding: '1rem', 
                borderRadius: '0.75rem', 
                border: '1.5px solid var(--color-surface-container-high)', 
                background: '#fcfcfc', 
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-surface-container-high)'}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
            <input type="checkbox" id="remember" style={{ width: '18px', height: '18px', borderRadius: '4px', cursor: 'pointer' }} />
            <label htmlFor="remember" style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}>Manter conectado</label>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: '1rem', 
              padding: '1.1rem', 
              borderRadius: '1rem', 
              border: 'none', 
              background: loading ? 'var(--color-surface-container-high)' : 'var(--color-primary)', 
              color: loading ? 'var(--color-on-surface-variant)' : 'white', 
              fontWeight: '900', 
              fontSize: '1rem', 
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 10px 25px rgba(0, 73, 219, 0.25)',
              transition: 'transform 0.2s, background 0.2s'
            }}
            onMouseEnter={(e) => { if (!loading) e.target.style.transform = 'translateY(-2px)' }}
            onMouseLeave={(e) => { if (!loading) e.target.style.transform = 'translateY(0)' }}
          >
            {loading ? 'AUTENTICANDO...' : 'ENTRAR NA PLATAFORMA'}
          </button>
        </form>

        <footer style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
           Ainda não tem acesso? <span style={{ color: 'var(--color-primary)', fontWeight: '800', cursor: 'pointer' }}>Solicitar convite Agora</span>
        </footer>
      </div>
    </div>
  );
}

export default Login;
