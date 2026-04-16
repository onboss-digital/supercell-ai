import React, { useState, useEffect } from 'react';

function Settings() {
  const [activeTab, setActiveTab] = useState('Geral');
  const [showBMModal, setShowBMModal] = useState(false);
  
  // Estados para Contingência
  const [bms, setBms] = useState([]);
  const [bmName, setBmName] = useState('');
  const [bmId, setBmId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [loadingSync, setLoadingSync] = useState(false);

  // Busca dados do banco de dados quando entra na aba Integrações
  useEffect(() => {
    if (activeTab === 'Integrações') {
      fetchBMs();
    }
  }, [activeTab]);

  const fetchBMs = async () => {
    try {
      const res = await fetch('http://localhost:3005/api/bms');
      const data = await res.json();
      if(Array.isArray(data)) {
        setBms(data);
      }
    } catch (err) {
      console.error('Erro ao buscar BMs locais:', err);
    }
  };

  const handleSyncBM = async () => {
    if(!bmName || !bmId || !accessToken) return alert('Preencha os campos!');
    setLoadingSync(true);
    try {
      const res = await fetch('http://localhost:3005/api/bms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: bmName, bmId, accessToken })
      });
      const data = await res.json();
      
      if(res.ok) {
        setShowBMModal(false);
        setBmName(''); setBmId(''); setAccessToken('');
        fetchBMs(); // Recarrega a lista real na tela
      } else {
        alert("Erro na Meta: " + (data.details || data.error));
      }
    } catch(err) {
      alert("Erro ao conectar com o servidor Node.js. Ele está rodando na porta 3005?");
    }
    setLoadingSync(false);
  };

  const tabs = ['Geral', 'Integrações', 'Equipe', 'Faturamento', 'Segurança'];

  const renderContent = () => {
    switch (activeTab) {
      case 'Geral':
        return (
          <>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-surface-container-low)', paddingBottom: '1rem' }}>
                Perfil da Empresa
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { label: "Nome do Negócio", value: "Supercell AI Store" },
                  { label: "Fuso Horário", value: "Brasília (GMT-3)" },
                  { label: "Moeda Base", value: "BRL (R$)" }
                ].map((item, i) => (
                  <div key={i} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '1.5rem', 
                    background: 'var(--color-surface-container-lowest)', 
                    borderRadius: '1rem',
                    border: '1px solid var(--color-surface-container-low)'
                  }}>
                    <span style={{ fontWeight: '700' }}>{item.label}</span>
                    <span style={{ color: 'var(--color-on-surface-variant)', fontWeight: '500' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ 
              padding: '2.5rem', 
              background: '#fff1f2', 
              borderRadius: '1.5rem', 
              border: '1px solid #ffe4e6',
              marginTop: '4rem'
            }}>
              <h4 style={{ color: '#e11d48', fontWeight: '900', marginBottom: '0.5rem' }}>Zona de Perigo</h4>
              <p style={{ color: '#e11d48', fontSize: '0.85rem', marginBottom: '1.5rem', opacity: 0.8 }}>
                Ao excluir sua conta, todos os dados de IA, leads e relatórios serão permanentemente removidos.
              </p>
              <button style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.75rem',
                background: '#e11d48',
                color: 'white',
                border: 'none',
                fontWeight: '700',
                cursor: 'pointer'
              }}>
                Excluir Conta
              </button>
            </div>
          </>
        );
      
      case 'Integrações':
        return (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>
              Ecossistema Meta (Contingência)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
              Conecte suas Business Managers informando os Access Tokens de Usuário de Sistema. Padrão Ouro de isolamento e anti-rastreamento aprovado para o "Caminho 2".
            </p>

            {/* Lista Real de BMs conectadas do Banco de Dados */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {bms.length === 0 && <span style={{fontSize: '0.8rem', color: '#888'}}>Nenhuma contingência conectada ainda.</span>}
              {bms.map((bm, i) => (
                <div key={i} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '1.5rem', 
                  background: 'var(--color-surface-container-lowest)', 
                  borderRadius: '1rem',
                  border: '1px solid var(--color-surface-container-low)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0EA5E9' }}>
                      <span className="material-icons-outlined">business</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: '800', color: 'var(--color-on-surface)' }}>{bm.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.2rem' }}>
                        ID: {bm.bmId} • Cadastrada em: {new Date(bm.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: '900', 
                    padding: '0.4rem 0.8rem', 
                    borderRadius: '2rem',
                    background: '#10B98115',
                    color: '#10B981'
                  }}>
                    Conectada
                  </span>
                </div>
              ))}
            </div>

            <button onClick={() => setShowBMModal(true)} style={{ 
              padding: '1rem 2rem', 
              borderRadius: '0.75rem', 
              background: 'var(--color-primary)', 
              color: 'white', 
              border: 'none', 
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span className="material-icons-outlined">add</span>
              Adicionar Perfil (Contingência)
            </button>


            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginTop: '4rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-surface-container-low)', paddingBottom: '1rem' }}>
              Outros Conectores de API
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: "WhatsApp Business API", status: "Aguardando", icon: "chat" },
                { label: "Google Ads API", status: "Desconectado", icon: "ads_click" }
              ].map((item, i) => (
                <div key={i} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '1.5rem', 
                  background: 'var(--color-surface-container-lowest)', 
                  borderRadius: '1rem',
                  border: '1px solid var(--color-surface-container-low)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="material-icons-outlined" style={{ color: 'var(--color-on-surface-variant)' }}>{item.icon}</span>
                    <span style={{ fontWeight: '700' }}>{item.label}</span>
                  </div>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: '900', 
                    padding: '0.4rem 0.8rem', 
                    borderRadius: '2rem',
                    background: item.status === 'Conectado' ? '#10B98115' : '#64748b15',
                    color: item.status === 'Conectado' ? '#10B981' : '#64748b'
                  }}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
            
          </div>
        );

      case 'Equipe':
        return (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-surface-container-low)', paddingBottom: '1rem' }}>
              Usuários e Permissões
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { name: "Sr. Gustavo", email: "gustavo@supercell.ai", role: "Proprietário" },
                { name: "Luciana Silva", email: "luciana@supercell.ai", role: "Gestor de Tráfego" }
              ].map((member, i) => (
                <div key={i} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '1.5rem', 
                  background: 'var(--color-surface-container-lowest)', 
                  borderRadius: '1rem',
                  border: '1px solid var(--color-surface-container-low)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'var(--color-primary)' }}>{member.name.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: '700' }}>{member.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>{member.email}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>{member.role}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Faturamento':
        return (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-surface-container-low)', paddingBottom: '1rem' }}>
              Plano e Assinatura
            </h3>
            <div style={{ padding: '2rem', background: 'var(--color-surface-container-low)', borderRadius: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--color-primary)', textTransform: 'uppercase' }}>PLANO ATUAL</span>
                  <h4 style={{ fontSize: '1.5rem', fontWeight: '900' }}>Supercell AI Business</h4>
                  <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>Próximo vencimento: 15/05/2026</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '1.5rem', fontWeight: '900' }}>R$ 497,00/mês</p>
                </div>
              </div>
            </div>
            <h4 style={{ fontWeight: '800', marginBottom: '1rem' }}>Histórico de Pagamentos</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               {[
                 { date: '15/04/2026', value: '497,00', status: 'Pago' },
                 { date: '15/03/2026', value: '497,00', status: 'Pago' }
               ].map((invoice, i) => (
                 <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #eee' }}>
                    <span style={{ fontWeight: '600' }}>Fatura {invoice.date}</span>
                    <span style={{ fontWeight: '800' }}>R$ {invoice.value}</span>
                 </div>
               ))}
            </div>
          </div>
        );

      case 'Segurança':
        return (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-surface-container-low)', paddingBottom: '1rem' }}>
              Segurança da Conta
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '0.5rem' }}>ALTERAR SENHA</label>
                <input type="password" placeholder="Nova senha" style={{ width: '100%', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #ddd', outline: 'none' }} />
              </div>
              <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700' }}>Autenticação em Dois Fatores (2FA)</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>Proteja sua conta com um nível extra de segurança.</div>
                </div>
                <button style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid #ddd', background: 'white', fontWeight: '800', cursor: 'pointer' }}>Ativar</button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <main className="main-content">
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'var(--settings-grid, 300px 1fr)', 
        gap: 'var(--settings-gap, 4rem)', 
        marginTop: '2rem' 
      }}>
        <aside style={{ overflowX: 'auto' }} className="hide-scrollbar">
          <nav style={{ 
            display: 'flex', 
            flexDirection: 'var(--settings-nav-dir, column)', 
            gap: '0.5rem',
            paddingBottom: '1rem' 
          }}>
            {tabs.map((tab) => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '1rem 1.5rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  background: activeTab === tab ? 'var(--color-primary)' : 'transparent',
                  color: activeTab === tab ? 'white' : 'var(--color-on-surface-variant)',
                  textAlign: 'left',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab}
              </button>
            ))}
          </nav>
        </aside>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '3rem', paddingBottom: '6rem' }}>
          {renderContent()}
        </section>
      </div>

      {showBMModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'white', width: '90%', maxWidth: '500px', borderRadius: '1.5rem', padding: '2.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <span className="material-icons-outlined" style={{ color: '#0EA5E9', fontSize: '2rem' }}>security</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0 }}>Adicionar BM</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginBottom: '2rem', lineHeight: '1.4' }}>
              Insira o ID do seu Gerenciador de Negócios e o Token do Sistema. Puxaremos todas as contas isoladamente.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', fontWeight: '800', marginBottom: '0.5rem' }}>NOME / APELIDO INTERNO</label>
                <input value={bmName} onChange={e => setBmName(e.target.value)} type="text" placeholder="Ex: BM Matriz 01" style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #ddd', outline: 'none', fontWeight: '600', color: '#333' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', fontWeight: '800', marginBottom: '0.5rem' }}>BUSINESS MANAGER ID</label>
                <input value={bmId} onChange={e => setBmId(e.target.value)} type="text" placeholder="Ex: 5831039801..." style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #ddd', outline: 'none', fontWeight: '600', color: '#333' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', fontWeight: '800', marginBottom: '0.5rem' }}>ACCESS TOKEN (SYSTEM USER)</label>
                <input value={accessToken} onChange={e => setAccessToken(e.target.value)} type="password" placeholder="EAAI..." style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #ddd', outline: 'none', fontWeight: '600', color: '#333' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setShowBMModal(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: 'transparent', color: '#64748b', border: 'none', fontWeight: '800', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button 
                onClick={handleSyncBM} 
                disabled={loadingSync}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: '#0EA5E9', color: 'white', border: 'none', fontWeight: '800', cursor: loadingSync ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: loadingSync ? 0.7 : 1 }}
              >
                <span className="material-icons-outlined" style={{ fontSize: '1.2rem', animation: loadingSync ? 'spin 1s linear infinite' : 'none' }}>cloud_sync</span>
                {loadingSync ? 'Sincronizando Meta...' : 'Puxar Contas Meta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Settings;
