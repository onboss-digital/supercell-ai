import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motivationalPhrases } from '../constants/motivationalPhrases';
import { API_URL } from '../api/config';
import logoImg from '../assets/logo-supercell.png';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [motivationalPhrase, setMotivationalPhrase] = useState('');
  
  const [userLogo, setUserLogo] = useState(logoImg);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      // 1. Escolhe a frase primeiro para garantir que o estado esteja pronto
      const selectedPhrase = motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)];
      setMotivationalPhrase(selectedPhrase);

      // 2. Tenta buscar a logo em paralelo (sem travar o fluxo principal)
      fetch(`${API_URL}/api/settings/company`)
        .then(res => res.json())
        .then(companyData => {
          if (companyData.logoUrl) setUserLogo(companyData.logoUrl);
        })
        .catch(err => console.error('Erro ao buscar logo:', err));

      // 3. Ativa o loader
      setShowWelcome(true);

      // 4. Redirecionamento garantido após 4 segundos (tempo fixo para evitar bugs de cálculo)
      setTimeout(() => {
        window.location.href = '/dashboard'; // Força o redirecionamento se o navigate falhar
      }, 4000);

    } catch (err) {
      console.error('Erro inesperado no login:', err);
      setErrorMsg('Ocorreu um erro inesperado. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      background: 'var(--color-surface)',
      fontFamily: 'var(--font-family)',
      position: 'relative',
      overflow: 'hidden',
      color: 'var(--color-on-surface)'
    }}>
      {showWelcome && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0, 5, 10, 0.98)', zIndex: 9999, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.5s ease-out',
          backdropFilter: 'blur(20px)'
        }}>
          {/* Avatar Scanner Effect */}
          <div style={{ position: 'relative', marginBottom: '2.5rem' }}>
            <div style={{
              width: '180px', height: '180px', borderRadius: '50%',
              border: '2px solid rgba(0, 245, 255, 0.2)',
              padding: '8px',
              animation: 'rotate 10s linear infinite'
            }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                border: '4px solid transparent',
                borderTopColor: 'var(--color-primary)',
                animation: 'rotate 2s linear infinite'
              }}></div>
            </div>
            
            <img 
              src={userLogo} 
              alt="User" 
              style={{ 
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '140px', height: '140px', borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid var(--color-surface)',
                boxShadow: '0 0 30px var(--color-primary-glow)'
              }} 
            />
            
            {/* Scanning Line */}
            <div style={{
              position: 'absolute', top: '10%', left: 0, width: '100%', height: '2px',
              background: 'linear-gradient(90deg, transparent, var(--color-primary), transparent)',
              animation: 'scan 2.5s ease-in-out infinite',
              zIndex: 2
            }}></div>
          </div>

          <div style={{ textAlign: 'center', maxWidth: '80%' }}>
            <h2 style={{ 
              color: 'var(--color-primary)', 
              fontSize: '0.85rem', 
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.3em',
              marginBottom: '1rem',
              animation: 'pulse 2s infinite'
            }}>
              Sincronizando Identidade...
            </h2>
            <p style={{ 
              color: 'white', 
              fontSize: '1.25rem', 
              fontWeight: '500', 
              fontStyle: 'italic',
              animation: 'fadeInUp 0.8s ease-out 0.3s both',
              lineHeight: '1.6'
            }}>
              "{motivationalPhrase}"
            </p>
          </div>

          {/* Progress Bar Container */}
          <div style={{
             marginTop: '3rem',
             width: '240px',
             height: '4px',
             background: 'rgba(255, 255, 255, 0.05)',
             borderRadius: '10px',
             overflow: 'hidden',
             position: 'relative'
          }}>
             <div style={{
               position: 'absolute', top: 0, left: 0, height: '100%',
               width: '100%',
               background: 'var(--color-primary)',
               boxShadow: '0 0 15px var(--color-primary)',
               animation: 'progressLoad 4s linear forwards'
             }}></div>
          </div>

          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes scan { 0%, 100% { top: 10%; opacity: 0; } 50% { top: 90%; opacity: 1; } }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            @keyframes progressLoad { from { width: 0%; } to { width: 100%; } }
          `}</style>
        </div>
      )}

      {/* Decorative Blur Background elements */}
      {/* Decorative Blur Background elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '40%', height: '40%', background: 'rgba(0, 245, 255, 0.05)', filter: 'blur(100px)', borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', bottom: '-5%', right: '-5%', width: '30%', height: '30%', background: 'rgba(0, 245, 255, 0.03)', filter: 'blur(80px)', borderRadius: '50%' }}></div>

      <div style={{ 
        margin: 'auto', 
        width: '100%', 
        maxWidth: '450px', 
        padding: '3rem', 
        background: 'var(--color-surface-container-lowest)', 
        borderRadius: 'var(--radius-sm)', 
        border: '1px solid var(--color-surface-container-high)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        zIndex: 1,
        position: 'relative',
        backdropFilter: 'blur(20px)'
      }}>
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <img src={logoImg} alt="Supercell AI" style={{ height: '60px', margin: '0 auto 1.5rem', display: 'block', filter: 'drop-shadow(0 0 10px var(--color-primary-glow))' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--color-primary)', marginBottom: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>ACESSO AO SISTEMA</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Iniciando Protocolo de Segurança</p>
        </header>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {errorMsg && (
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 'bold', textAlign: 'center' }}>
              {errorMsg}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>E-mail</label>
            <input 
              type="email" 
              placeholder="seu@nome.com" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ 
                padding: '1.1rem', 
                borderRadius: 'var(--radius-sm)', 
                border: '1px solid rgba(0, 245, 255, 0.15)', 
                background: 'rgba(255, 255, 255, 0.03)', 
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s',
                fontFamily: 'var(--font-mono)'
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.background = 'rgba(0, 245, 255, 0.05)'; e.target.style.boxShadow = '0 0 15px rgba(0, 245, 255, 0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(0, 245, 255, 0.15)'; e.target.style.background = 'rgba(255, 255, 255, 0.03)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Senha</label>
               <span 
                 onClick={() => alert('Para recuperar sua senha, entre em contato com o administrador do sistema.')}
                 style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: '700', cursor: 'pointer', opacity: 0.8 }}
               >
                 Esqueceu a senha?
               </span>
            </div>
            <input 
              type="password" 
              placeholder="••••••••" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                padding: '1.1rem', 
                borderRadius: 'var(--radius-sm)', 
                border: '1px solid rgba(0, 245, 255, 0.15)', 
                background: 'rgba(255, 255, 255, 0.03)', 
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s',
                fontFamily: 'var(--font-mono)'
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.background = 'rgba(0, 245, 255, 0.05)'; e.target.style.boxShadow = '0 0 15px rgba(0, 245, 255, 0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(0, 245, 255, 0.15)'; e.target.style.background = 'rgba(255, 255, 255, 0.03)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: '1rem', 
              padding: '1.25rem', 
              borderRadius: 'var(--radius-sm)', 
              border: 'none', 
              background: loading ? 'rgba(0, 245, 255, 0.2)' : 'var(--color-primary)', 
              color: 'black', 
              fontWeight: '900', 
              fontSize: '0.85rem', 
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 0 25px var(--color-primary-glow)',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em'
            }}
            onMouseEnter={(e) => { if (!loading) { e.target.style.transform = 'translateY(-3px)'; e.target.style.boxShadow = '0 0 40px var(--color-primary-glow)'; e.target.style.letterSpacing = '0.2em'; } }}
            onMouseLeave={(e) => { if (!loading) { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 0 25px var(--color-primary-glow)'; e.target.style.letterSpacing = '0.15em'; } }}
          >
            {loading ? 'AUTENTICANDO...' : 'ESTABELECER CONEXÃO'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
