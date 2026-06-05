import React, { useState, useEffect } from 'react';
import { API_URL } from '../api/config';
import { useNavigate } from 'react-router-dom';

function OnboardingGuide() {
  const [status, setStatus] = useState(null);
  const [onboardingState, setOnboardingState] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const fetchStatus = async () => {
    try {
      const [statusRes, stateRes] = await Promise.all([
        fetch(`${API_URL}/api/onboarding/status`),
        fetch(`${API_URL}/api/onboarding`)
      ]);
      const statusData = await statusRes.json();
      const stateData = await stateRes.json();
      
      setStatus(statusData);
      setOnboardingState(stateData);

      // Abrir automaticamente se não estiver tudo concluído e não tiver sido ignorado
      const allCompleted = statusData?.steps?.every(s => s.completed) ?? false;
      if (!allCompleted && !stateData?.is_dismissed) {
        setIsOpen(true);
      }
    } catch (err) {
      console.error('Erro ao carregar onboarding:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll a cada 10 segundos para atualizar os checks automaticamente
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = async () => {
    try {
      await fetch(`${API_URL}/api/onboarding/dismiss`, { method: 'POST' });
      setIsOpen(false);
      fetchStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const [showWebhookModal, setShowWebhookModal] = useState(false);

  const handleStepClick = (step) => {
    if (step.id === 'webhook') {
      setShowWebhookModal(true);
      return;
    }

    const routes = {
      jarvis: '/settings/jarvis',
      company: '/settings/geral',
      goals: '/settings/jarvis',
      facebook: '/settings/integracoes',
      mercadofone: '/settings/integracoes'
    };

    if (routes[step.id]) {
      navigate(routes[step.id]);
    }
  };

  if (!status || !onboardingState) return null;

  const allCompleted = status?.steps?.every(s => s.completed) ?? false;
  if (allCompleted && !isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Modal de Webhook */}
      {showWebhookModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '2rem'
        }}>
          <div style={{
            background: 'var(--color-surface-container-highest)',
            width: '100%',
            maxWidth: '500px',
            borderRadius: '2rem',
            padding: '2.5rem',
            border: '1px solid rgba(255,255,255,0.1)',
            position: 'relative',
            animation: 'scaleUp 0.3s ease'
          }}>
            <button 
              onClick={() => setShowWebhookModal(false)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer' }}
            >
              <span className="material-icons-outlined">close</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '1rem', background: 'var(--color-primary)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-icons-outlined" style={{ fontSize: '2rem' }}>bolt</span>
              </div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900' }}>Configurar Webhook</h2>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', lineHeight: '1.6', marginBottom: '2rem' }}>
              Para que o Jarvis receba os leads em tempo real, você deve configurar o Webhook na sua BM da Meta com os seguintes dados:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Callback URL</label>
                <div style={{ background: 'black', padding: '1rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <code style={{ color: '#10B981' }}>{API_URL}/api/webhooks/whatsapp</code>
                  <button onClick={() => navigator.clipboard.writeText(`${API_URL}/api/webhooks/whatsapp`)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                    <span className="material-icons-outlined" style={{ fontSize: '1.2rem' }}>content_copy</span>
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Verify Token</label>
                <div style={{ background: 'black', padding: '1rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <code style={{ color: '#10B981' }}>supercell_verify_token</code>
                  <button onClick={() => navigator.clipboard.writeText('supercell_verify_token')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                    <span className="material-icons-outlined" style={{ fontSize: '1.2rem' }}>content_copy</span>
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowWebhookModal(false)}
              style={{ width: '100%', marginTop: '2.5rem', padding: '1rem', borderRadius: '1rem', background: 'var(--color-primary)', color: 'black', border: 'none', fontWeight: '900', cursor: 'pointer' }}
            >
              ENTENDI, VOU CONFIGURAR
            </button>
          </div>
        </div>
      )}

      {/* Botão de Toggle */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            background: 'var(--color-primary)',
            color: 'black',
            border: 'none',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px var(--color-primary-glow)',
            cursor: 'pointer',
            transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1) rotate(10deg)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
        >
          <span className="material-icons-outlined" style={{ fontSize: '2rem' }}>assignment_late</span>
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: '#EF4444',
            color: 'white',
            fontSize: '0.7rem',
            fontWeight: '900',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white'
          }}>
            {status.steps.filter(s => !s.completed).length}
          </span>
        </button>
      )}

      {/* Janela do Guia */}
      {isOpen && (
        <div style={{
          width: '350px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: '1.5rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          padding: '1.5rem',
          color: 'white',
          animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: 'var(--color-primary)', letterSpacing: '0.5px' }}>GUIA DE IMPLANTAÇÃO</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>Complete os passos para ativar o Jarvis.</p>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}
            >
              <span className="material-icons-outlined" style={{ fontSize: '1.2rem' }}>close</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {status.steps.map((step) => (
              <div 
                key={step.id}
                onClick={() => handleStepClick(step)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  background: step.completed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '1rem',
                  border: '1px solid',
                  borderColor: step.completed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  transition: '0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = step.completed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.1)'}
                onMouseOut={e => e.currentTarget.style.background = step.completed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)'}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: step.completed ? '#10B981' : 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: step.completed ? 'black' : 'white'
                }}>
                  <span className="material-icons-outlined" style={{ fontSize: '1.2rem' }}>
                    {step.completed ? 'check' : step.icon}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: '800', 
                    textDecoration: step.completed ? 'line-through' : 'none',
                    opacity: step.completed ? 0.6 : 1
                  }}>
                    {step.label}
                  </div>
                  {step.completed && <span style={{ fontSize: '0.65rem', color: '#10B981', fontWeight: '900' }}>CONCLUÍDO</span>}
                </div>
                {!step.completed && <span className="material-icons-outlined" style={{ fontSize: '1rem', opacity: 0.4 }}>chevron_right</span>}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '900' }}>
              PROCESSO: {Math.round((status.steps.filter(s => s.completed).length / status.steps.length) * 100)}%
            </div>
            {!allCompleted && (
              <button 
                onClick={handleDismiss}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', textTransform: 'uppercase' }}
              >
                Ignorar Guia
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default OnboardingGuide;
