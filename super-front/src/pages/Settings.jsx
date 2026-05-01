import React, { useState, useEffect } from 'react';
import { API_URL } from '../api/config';
import { useParams, useNavigate } from 'react-router-dom';

function Settings() {
  // Estilos de animação injetados
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes scaleUp { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const { tabId } = useParams();
  const navigate = useNavigate();

  const tabSlugs = {
    'geral': 'Geral',
    'integracoes': 'Integrações',
    'jarvis': 'Jarvis',
    'equipe': 'Equipe',
    'faturamento': 'Faturamento',
    'seguranca': 'Segurança'
  };

  const reverseSlugs = {
    'Geral': 'geral',
    'Integrações': 'integracoes',
    'Jarvis': 'jarvis',
    'Equipe': 'equipe',
    'Faturamento': 'faturamento',
    'Segurança': 'seguranca'
  };

  const activeTab = (tabId && tabSlugs[tabId]) ? tabSlugs[tabId] : 'Geral';
  const [showBMModal, setShowBMModal] = useState(false);
  const [showMercadoModal, setShowMercadoModal] = useState(false);
  
  // Estados para Contingência
  const [bms, setBms] = useState([]);
  const [bmName, setBmName] = useState('');
  const [bmId, setBmId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [loadingSync, setLoadingSync] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [syncError, setSyncError] = useState(null);

  const [mercadoStatus, setMercadoStatus] = useState({ active: false, lastSync: null });

  // Busca dados do banco de dados quando entra na aba Integrações
  useEffect(() => {
    if (activeTab === 'Integrações') {
      fetchBMs();
      fetchMercadoStatus();
    }
  }, [activeTab]);

  const fetchMercadoStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/integrations/mercadophone/status`);
      const data = await res.json();
      setMercadoStatus(data);
    } catch (err) {
      console.error('Erro ao buscar status do MercadoPhone:', err);
    }
  };

  const fetchBMs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/bms`);
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
    setSyncStatus('loading');
    setSyncError(null);

    try {
      const res = await fetch(`${API_URL}/api/bms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: bmName, bmId, accessToken })
      });
      const data = await res.json();
      
      if(res.ok) {
        setSyncStatus('success');
        setTimeout(() => {
          setShowBMModal(false);
          setBmName(''); setBmId(''); setAccessToken('');
          setSyncStatus('idle');
          fetchBMs();
        }, 1500);
      } else {
        setSyncStatus('error');
        setSyncError(data.details || data.error || "Erro desconhecido na Meta");
      }
    } catch(err) {
      setSyncStatus('error');
      setSyncError("Erro de conexão com o servidor. Verifique se o backend está rodando.");
    }
    setLoadingSync(false);
  };

  const handleDeleteBM = async (id) => {
    if(!window.confirm('Tem certeza que deseja desconectar esta BM? As contas vinculadas também serão removidas do sistema.')) return;
    try {
      const res = await fetch(`${API_URL}/api/bms/${id}`, { method: 'DELETE' });
      if(res.ok) {
        fetchBMs();
      } else {
        alert('Erro ao excluir conexão.');
      }
    } catch(err) {
      console.error(err);
      alert('Erro na comunicação com o servidor.');
    }
  };

  const [aiSystemPrompt, setAiSystemPrompt] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4o');
  const [availableModels, setAvailableModels] = useState(['gpt-4o', 'gpt-4o-mini']);
  const [isAiOperational, setIsAiOperational] = useState(false);
  const [savingAi, setSavingAi] = useState(false);

  // Estados para Geral
  const [companyName, setCompanyName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [currency, setCurrency] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);

  // Estados para Equipe
  const [team, setTeam] = useState([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'Gestor' });
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Estados para Faturamento
  const [billing, setBilling] = useState({ plan: '', price: '', nextBilling: '', invoices: [] });
  const [loadingBilling, setLoadingBilling] = useState(false);

  // Estados para Segurança
  const [security, setSecurity] = useState({ twoFactorEnabled: false, lastPasswordChange: '' });
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const tabs = ['Geral', 'Integrações', 'Jarvis', 'Equipe', 'Faturamento', 'Segurança'];

  // Controle de carregamento de dados por aba
  useEffect(() => {
    if (activeTab === 'Integrações') {
      fetchBMs();
      fetchMercadoStatus();
    } else if (activeTab === 'Geral') {
      fetchCompanyProfile();
    } else if (activeTab === 'Equipe') {
      fetchTeam();
    } else if (activeTab === 'Jarvis') {
      fetchAiConfig();
    } else if (activeTab === 'Faturamento') {
      fetchBilling();
    } else if (activeTab === 'Segurança') {
      fetchSecurity();
    }
  }, [activeTab]);

  const fetchBilling = async () => {
    setLoadingBilling(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/billing`);
      const data = await res.json();
      setBilling(data);
    } catch (err) { console.error('Erro ao buscar faturamento:', err); }
    setLoadingBilling(false);
  };

  const fetchSecurity = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/security`);
      const data = await res.json();
      setSecurity(data);
    } catch (err) { console.error('Erro ao buscar segurança:', err); }
  };

  const handleToggle2FA = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/security/2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !security.twoFactorEnabled })
      });
      if (res.ok) fetchSecurity();
    } catch (err) { alert('Erro ao atualizar 2FA'); }
  };

  const handleChangePassword = async () => {
    if (!newPassword) return alert('Digite a nova senha');
    setChangingPassword(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/security/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });
      if (res.ok) {
        alert('Senha alterada com sucesso!');
        setNewPassword('');
        fetchSecurity();
      }
    } catch (err) { alert('Erro ao mudar senha'); }
    setChangingPassword(false);
  };
  useEffect(() => {
    if (activeTab === 'Jarvis') {
      fetchAiConfig();
      fetchAvailableModels();
    }
    if (activeTab === 'Geral') fetchCompanyProfile();
    if (activeTab === 'Equipe') fetchTeam();
  }, [activeTab]);

  const fetchCompanyProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/company`);
      const data = await res.json();
      setCompanyName(data.name);
      setTimezone(data.timezone);
      setCurrency(data.currency);
      setLogoUrl(data.logoUrl || '');
    } catch (e) { console.error(e); }
  };

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    try {
      await fetch(`${API_URL}/api/settings/company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: companyName, timezone, currency, logoUrl })
      });
      alert('Perfil da empresa atualizado!');
      // Dispara um evento customizado para o Header atualizar
      window.dispatchEvent(new Event('companyProfileUpdated'));
    } catch (e) { console.error(e); }
    setSavingCompany(false);
  };

  const fetchTeam = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/team`);
      const data = await res.json();
      setTeam(data);
    } catch (e) { console.error(e); }
  };

  const handleAddTeamMember = async () => {
    setLoadingTeam(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });
      if (res.ok) {
        fetchTeam();
        setShowTeamModal(false);
        setNewMember({ name: '', email: '', role: 'Gestor' });
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) { console.error(e); }
    setLoadingTeam(false);
  };

  const handleDeleteTeamMember = async (id) => {
    if (!window.confirm('Remover este membro da equipe?')) return;
    try {
      await fetch(`${API_URL}/api/settings/team/${id}`, { method: 'DELETE' });
      fetchTeam();
    } catch (e) { console.error(e); }
  };

  const fetchAiConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ai-config`);
      const data = await res.json();
      setAiSystemPrompt(data.systemPrompt);
      setAiModel(data.model || 'gpt-4o');
      setIsAiOperational(data.isConfigured);
    } catch (err) {
      console.error('Erro ao buscar config de IA:', err);
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ai-models`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAvailableModels(data);
      }
    } catch (err) {
      console.error('Erro ao buscar modelos disponíveis:', err);
    }
  };

  const handleSaveAiConfig = async () => {
    setSavingAi(true);
    try {
      await fetch(`${API_URL}/api/ai-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: aiSystemPrompt, model: aiModel })
      });
      
      alert('Configurações do Jarvis salvas com sucesso!');
      fetchAiConfig(); // Atualiza o status
    } catch (err) {
      console.error('Erro ao salvar config de IA:', err);
      alert('Erro ao salvar configurações.');
    }
    setSavingAi(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Geral':
        return (
          <>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-surface-container-low)', paddingBottom: '1rem' }}>
                Perfil da Empresa
              </h3>
              
              {/* Foto de Perfil */}
              <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ 
                    width: '120px', 
                    height: '120px', 
                    borderRadius: 'var(--radius-sm)', 
                    background: 'var(--color-surface-container-high)',
                    border: '2px solid var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    boxShadow: '0 0 20px var(--color-primary-glow)'
                  }}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span className="material-icons-outlined" style={{ fontSize: '3rem', color: 'var(--color-primary)' }}>business</span>
                    )}
                  </div>
                  <label htmlFor="logo-upload" style={{
                    position: 'absolute',
                    bottom: '-10px',
                    right: '-10px',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: 'black',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    transition: 'transform 0.2s'
                  }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                    <span className="material-icons-outlined" style={{ fontSize: '1.2rem' }}>photo_camera</span>
                    <input 
                      id="logo-upload" 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setLogoUrl(reader.result);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '800' }}>Logo da Empresa</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>Recomendado: 512x512px (PNG ou JPG).</p>
                  {logoUrl && (
                    <button 
                      onClick={() => setLogoUrl('')}
                      style={{ marginTop: '0.8rem', background: 'none', border: 'none', color: '#EF4444', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', padding: 0 }}
                    >
                      REMOVER FOTO
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--color-on-surface-variant)' }}>NOME DO NEGÓCIO</label>
                  <input 
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--color-surface-container-low)', background: 'var(--color-surface-container-lowest)', fontWeight: '600', color: 'var(--color-on-surface)', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--color-on-surface-variant)' }}>FUSO HORÁRIO</label>
                  <input 
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--color-surface-container-low)', background: 'var(--color-surface-container-lowest)', fontWeight: '600', color: 'var(--color-on-surface)', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--color-on-surface-variant)' }}>MOEDA BASE</label>
                  <input 
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--color-surface-container-low)', background: 'var(--color-surface-container-lowest)', fontWeight: '600', color: 'var(--color-on-surface)', outline: 'none' }}
                  />
                </div>
                
                <button 
                  onClick={handleSaveCompany}
                  disabled={savingCompany}
                  style={{
                    marginTop: '1rem', padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary)', color: 'black', border: 'none', fontWeight: '900', cursor: 'pointer', opacity: savingCompany ? 0.7 : 1, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}
                >
                  {savingCompany ? 'Salvando...' : 'Salvar Alterações'}
                </button>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                    <button 
                      onClick={() => handleDeleteBM(bm.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        padding: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '0.5rem',
                        transition: 'background 0.2s',
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#EF444415'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      title="Desconectar BM"
                    >
                      <span className="material-icons-outlined" style={{ fontSize: '1.2rem' }}>link_off</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setShowBMModal(true)} style={{ 
              padding: '1rem 2rem', 
              borderRadius: '0.75rem', 
              background: 'var(--color-primary)', 
              color: 'black', 
              border: 'none', 
              fontWeight: '900',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span className="material-icons-outlined">add</span>
              Adicionar Perfil (Contingência)
            </button>

            {/* SEÇÃO DO PDV / OMNICHANNEL */}
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginTop: '4rem', marginBottom: '0.5rem' }}>
              Vendas e PDV (MercadoPhone)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
              Conecte seu PDV para permitir que a Inteligência O2O processe offline sales e devolva as conversões via CAPI para os relatórios e a Meta.
            </p>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '1.5rem', 
              background: 'var(--color-surface-container-lowest)', 
              borderRadius: '1rem',
              border: '1px solid var(--color-surface-container-low)',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6' }}>
                  <span className="material-icons-outlined">point_of_sale</span>
                </div>
                <div>
                  <div style={{ fontWeight: '800', color: 'var(--color-on-surface)' }}>Gateway MercadoPhone</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.2rem' }}>
                    {mercadoStatus.active 
                      ? `Última venda: ${new Date(mercadoStatus.lastSync).toLocaleString('pt-BR')}`
                      : 'Webhooks & API (Aguardando primeira venda)'
                    }
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: '900', 
                  padding: '0.4rem 0.8rem', 
                  borderRadius: '2rem',
                  background: mercadoStatus.active ? '#10B98115' : '#64748b15',
                  color: mercadoStatus.active ? '#10B981' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  {mercadoStatus.active && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }}></span>}
                  {mercadoStatus.active ? 'ATIVO' : 'AGUARDANDO'}
                </span>
                <button 
                  onClick={() => setShowMercadoModal(true)}
                  style={{
                    background: '#8B5CF6',
                    color: 'white',
                    border: 'none',
                    fontWeight: '800',
                    cursor: 'pointer',
                    padding: '0.6rem 1rem',
                    borderRadius: '0.5rem',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseOut={e => e.currentTarget.style.opacity = '1'}
                >
                  Configurar
                </button>
              </div>
            </div>

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-surface-container-low)', paddingBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>
                Usuários e Permissões
              </h3>
              <button 
                onClick={() => setShowTeamModal(true)}
                style={{ padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary)', color: 'black', border: 'none', fontWeight: '900', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
              >
                Convidar Membro
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {team.length === 0 && <span style={{ color: '#888', fontSize: '0.8rem' }}>Nenhum membro cadastrado além de você.</span>}
              {team.map((member, i) => (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.3rem 0.6rem', background: '#f1f5f9', borderRadius: '0.4rem' }}>{member.role}</span>
                    <button 
                      onClick={() => handleDeleteTeamMember(member.id)}
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                    >
                      <span className="material-icons-outlined" style={{ fontSize: '1.2rem' }}>delete_outline</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {showTeamModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                <div style={{ background: 'white', width: '90%', maxWidth: '400px', borderRadius: '1.5rem', padding: '2rem' }}>
                  <h3 style={{ fontWeight: '900', marginBottom: '1.5rem' }}>Novo Membro</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    <input placeholder="Nome Completo" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid #ddd' }} />
                    <input placeholder="E-mail" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid #ddd' }} />
                    <select value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})} style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid #ddd' }}>
                      <option value="Gestor">Gestor</option>
                      <option value="Analista">Analista</option>
                      <option value="Visualizador">Visualizador</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button onClick={() => setShowTeamModal(false)} style={{ background: 'none', border: 'none', fontWeight: '700', cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={handleAddTeamMember} disabled={loadingTeam} style={{ padding: '0.7rem 1.5rem', background: 'var(--color-primary)', color: 'black', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: '900', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>{loadingTeam ? 'Salvando...' : 'Adicionar'}</button>
                  </div>
                </div>
              </div>
            )}
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
                  <h4 style={{ fontSize: '1.5rem', fontWeight: '900' }}>{billing.plan || 'Carregando...'}</h4>
                  <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>Próximo vencimento: {billing.nextBilling}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '1.5rem', fontWeight: '900' }}>R$ {billing.price}/mês</p>
                </div>
              </div>
            </div>
            <h4 style={{ fontWeight: '800', marginBottom: '1rem' }}>Histórico de Pagamentos</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               {billing.invoices.length === 0 && <p style={{ fontSize: '0.85rem', color: '#888' }}>Nenhuma fatura encontrada.</p>}
               {billing.invoices.map((invoice, i) => (
                 <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #eee' }}>
                    <span style={{ fontWeight: '600' }}>Fatura {invoice.date}</span>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '900', background: '#10B98120', color: '#10B981', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>{invoice.status}</span>
                      <span style={{ fontWeight: '800' }}>R$ {invoice.value}</span>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        );

      case 'Jarvis':
        return (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-surface-container-low)', paddingBottom: '1rem' }}>
               <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #0EA5E9, #2DD4BF)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)' }}>
                  <span className="material-icons-outlined" style={{ fontSize: '1.8rem' }}>psychology</span>
               </div>
               <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0 }}>Cérebro do Jarvis</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>Configure a personalidade e as regras estratégicas da sua IA.</p>
               </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Seção do Prompt */}
              <div style={{ background: 'var(--color-surface-container-lowest)', padding: '2rem', borderRadius: '1.5rem', border: '1px solid var(--color-surface-container-low)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '900', color: 'var(--color-on-surface)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span className="material-icons-outlined" style={{ fontSize: '1.1rem', color: '#0EA5E9' }}>psychology</span>
                  DNA da Personalidade e Diretrizes (Editável)
                </label>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                  Defina QUEM ele é, COMO deve te chamar e QUAIS são as metas da empresa. Você tem controle total aqui.
                </p>
                <textarea 
                  value={aiSystemPrompt}
                  onChange={(e) => setAiSystemPrompt(e.target.value)}
                  placeholder="Ex: Você é o J.A.R.V.I.S., trate-me como Senhor Gustavo. Sua meta principal é lucrar com iPhones..."
                  style={{ 
                    width: '100%', minHeight: '150px', padding: '1.5rem', borderRadius: '1rem', 
                    border: '1.5px solid #0EA5E9', background: '#f8fafc', outline: 'none', 
                    fontSize: '0.95rem', color: '#334155', fontWeight: '500', lineHeight: '1.6',
                    fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box'
                  }}
                />

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '900', color: '#EF4444', marginTop: '2.5rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>lock</span>
                  Regras de Arquitetura do Sistema (Bloqueado no Back-end)
                </label>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                  Estas regras são injetadas de forma invisível pelo servidor. Elas protegem o código e garantem que a interface consiga separar a fala em áudio do relatório em texto.
                </p>
                <textarea 
                  readOnly
                  value={`MUITO IMPORTANTE - SEPARAÇÃO DE ÁUDIO E TEXTO (FALA vs TELA):
Você OBRIGATORIAMENTE deve formatar TODAS as suas respostas usando duas tags exatas: [FALA] e [TELA].

REGRAS RÍGIDAS PARA A TAG [FALA] (Áudio):
1. SEJA EXTREMAMENTE HUMANO E NATURAL: Use frases como "Um momento, Senhor".
2. PROIBIDO O USO DE EMOJIS: NUNCA use emojis em nenhuma parte da resposta.
3. PROIBIDO USAR SIGLAS OU PARÊNTESES: Nunca diga "CPA" ou "CTR". Diga "o custo por cada contato".
4. PROIBIDO LER SÍMBOLOS MATEMÁTICOS: Leia como se fala: "reais", "por cento".
5. COMPORTAMENTO ALTRUÍSTA: Responda apenas o valor principal na fala e diga que os detalhes estão na tela. Não dite listas de dados.
6. SEU NOME: Nunca escreva "J.A.R.V.I.S." com pontos. Escreva "Jarvis" para a voz sair natural.

REGRAS PARA A TAG [TELA] (Visual):
Aqui você tem liberdade total para tabelas e Markdown, mas É PROIBIDO O USO DE EMOJIS.`}
                  style={{ 
                    width: '100%', minHeight: '280px', padding: '1.5rem', borderRadius: '1rem', 
                    border: '1px solid #fee2e2', background: '#fef2f2', outline: 'none', 
                    fontSize: '0.85rem', color: '#991b1b', fontWeight: '600', lineHeight: '1.6',
                    fontFamily: 'monospace', resize: 'none', boxSizing: 'border-box', opacity: 0.9
                  }}
                />
              </div>

              {/* Seção do Modelo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ background: 'var(--color-surface-container-lowest)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--color-surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      <span className="material-icons-outlined">model_training</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>Modelo de IA</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>GPT-4o (Padrão Ouro)</div>
                    </div>
                  </div>
                  <select 
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    style={{ border: 'none', background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
                  >
                    {availableModels.map(model => (
                      <option key={model} value={model}>{model.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div style={{ background: 'var(--color-surface-container-lowest)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--color-surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '50%', 
                      background: isAiOperational ? '#F0FDF4' : '#FEF2F2', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      color: isAiOperational ? '#16A34A' : '#DC2626' 
                    }}>
                      <span className="material-icons-outlined">{isAiOperational ? 'bolt' : 'error_outline'}</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>Status do Cérebro</div>
                      <div style={{ fontSize: '0.75rem', color: isAiOperational ? '#16A34A' : '#DC2626' }}>
                        {isAiOperational ? 'Ativo' : 'Faltam Chaves de API'}
                      </div>
                    </div>
                  </div>
                  <div style={{ 
                    width: '10px', height: '10px', borderRadius: '50%', 
                    background: isAiOperational ? '#16A34A' : '#DC2626', 
                    boxShadow: `0 0 8px ${isAiOperational ? '#16A34A' : '#DC2626'}`,
                    transition: '0.3s'
                  }}></div>
                </div>
              </div>

              {/* Botão Salvar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  onClick={handleSaveAiConfig}
                  disabled={savingAi}
                  style={{ 
                    padding: '1rem 2.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary)', 
                    color: 'black', border: 'none', fontWeight: '900', cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', gap: '0.8rem', 
                    boxShadow: '0 10px 20px -5px rgba(14, 165, 233, 0.4)',
                    transition: 'all 0.3s ease',
                    opacity: savingAi ? 0.7 : 1
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {savingAi ? (
                    <span className="material-icons-outlined" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
                  ) : (
                    <span className="material-icons-outlined">check_circle</span>
                  )}
                  {savingAi ? 'Salvando Configuração...' : 'Salvar Alterações do Jarvis'}
                </button>
              </div>
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
              <div style={{ background: 'var(--color-surface-container-lowest)', padding: '2rem', borderRadius: '1.5rem', border: '1px solid var(--color-surface-container-low)' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '1rem', color: '#64748b' }}>ALTERAR SENHA DA CONTA</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <input 
                    type="password" 
                    placeholder="Digite a nova senha" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ flex: 1, padding: '1rem', borderRadius: '0.75rem', border: '1px solid #ddd', outline: 'none', fontWeight: '600' }} 
                  />
                  <button 
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    style={{ padding: '0 2rem', borderRadius: '0.75rem', background: '#0F172A', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer' }}
                  >
                    {changingPassword ? 'Alterando...' : 'Atualizar'}
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem' }}>
                  Última alteração: {security.lastPasswordChange ? new Date(security.lastPasswordChange).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Nunca'}
                </p>
              </div>

              <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: security.twoFactorEnabled ? '#10B98120' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: security.twoFactorEnabled ? '#10B981' : '#64748b' }}>
                    <span className="material-icons-outlined">{security.twoFactorEnabled ? 'verified_user' : 'gpp_maybe'}</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', color: '#1e293b' }}>Autenticação em Dois Fatores (2FA)</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Proteja sua conta com um nível extra de segurança via App.</div>
                  </div>
                </div>
                <button 
                  onClick={handleToggle2FA}
                  style={{ 
                    padding: '0.6rem 1.5rem', borderRadius: '2rem', 
                    border: 'none', 
                    background: security.twoFactorEnabled ? '#EF4444' : '#10B981', 
                    color: 'white', fontWeight: '800', cursor: 'pointer',
                    boxShadow: security.twoFactorEnabled ? '0 4px 10px rgba(239, 68, 68, 0.2)' : '0 4px 10px rgba(16, 185, 129, 0.2)'
                  }}
                >
                  {security.twoFactorEnabled ? 'Desativar' : 'Ativar Agora'}
                </button>
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
                onClick={() => navigate(`/settings/${reverseSlugs[tab]}`)}
                style={{
                  padding: '1rem 1.5rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  background: activeTab === tab ? 'var(--color-primary)' : 'transparent',
                  color: activeTab === tab ? 'black' : 'var(--color-on-surface-variant)',
                  textAlign: 'left',
                  fontWeight: '900',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
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
              {syncStatus === 'success' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 0' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', animation: 'scaleUp 0.3s ease-out' }}>
                    <span className="material-icons-outlined" style={{ fontSize: '3.5rem' }}>check</span>
                  </div>
                  <h4 style={{ margin: 0, color: '#065F46', fontWeight: '800' }}>Conexão Estabelecida!</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#10B981', fontWeight: '600' }}>Suas contas estão sendo importadas...</p>
                </div>
              ) : (
                <>
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

                  {syncStatus === 'error' && (
                    <div style={{ padding: '1rem', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '0.75rem', color: '#991B1B', fontSize: '0.8rem', fontWeight: '600', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>error_outline</span>
                      <span>{syncError}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {syncStatus !== 'success' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button onClick={() => { setShowBMModal(false); setSyncStatus('idle'); }} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: 'transparent', color: '#64748b', border: 'none', fontWeight: '800', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button 
                  onClick={handleSyncBM} 
                  disabled={loadingSync}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    borderRadius: '0.75rem', 
                    background: syncStatus === 'error' ? '#EF4444' : 'var(--color-primary)', 
                    color: 'black', 
                    border: 'none', 
                    fontWeight: '900', 
                    cursor: loadingSync ? 'not-allowed' : 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    opacity: loadingSync ? 0.7 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <span className="material-icons-outlined" style={{ 
                    fontSize: '1.2rem', 
                    animation: loadingSync ? 'spin 1s linear infinite' : 'none' 
                  }}>
                    {loadingSync ? 'autorenew' : (syncStatus === 'error' ? 'refresh' : 'cloud_sync')}
                  </span>
                  {loadingSync ? 'Sincronizando...' : (syncStatus === 'error' ? 'Tentar Novamente' : 'Puxar Contas Meta')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {showMercadoModal && (
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
              <span className="material-icons-outlined" style={{ color: '#8B5CF6', fontSize: '2rem' }}>api</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0 }}>Webhook Setup</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginBottom: '2rem', lineHeight: '1.4' }}>
              Copie a URL abaixo e cole no painel de Webhooks do seu MercadoPhone configurado para ser disparado quando o evento de "Compra" ou "Pagamento Confirmado" ocorrer.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', fontWeight: '800', marginBottom: '0.5rem' }}>URL RECEPTORA DO SUPERCELL AI</label>
                <div style={{ display: 'flex' }}>
                  <input readOnly value="https://hugo-delitescent-countercurrently.ngrok-free.dev/api/webhooks/mercadophone" type="text" style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '0.75rem 0 0 0.75rem', border: '1px solid #ddd', borderRight: 'none', outline: 'none', fontWeight: '600', color: '#8B5CF6', background: '#F5F3FF' }} />
                  <button onClick={() => { navigator.clipboard.writeText("https://hugo-delitescent-countercurrently.ngrok-free.dev/api/webhooks/mercadophone"); alert("Copiado!"); }} style={{ padding: '0 1rem', background: '#8B5CF6', color: 'white', border: 'none', borderRadius: '0 0.75rem 0.75rem 0', cursor: 'pointer' }}>
                    <span className="material-icons-outlined">content_copy</span>
                  </button>
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderLeft: '4px solid #8B5CF6', padding: '1rem', borderRadius: '4px' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#334155', marginBottom: '5px' }}>EVENTOS EXIGIDOS:</span>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Garanta que o payload JSON tenha <b>telefoneCliente</b> e <b>valorTotal</b> em sua raiz. O Servidor fará Criptografia SHA-256 e transmitirá à CAPI.</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setShowMercadoModal(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: 'transparent', color: '#64748b', border: 'none', fontWeight: '800', cursor: 'pointer' }}>
                Fechar e Salvar
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

export default Settings;
