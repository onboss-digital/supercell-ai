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

  // WhatsApp Evolution API States
  const [waStatus, setWaStatus] = useState('disconnected');
  const [waQR, setWaQR] = useState('');
  const [waLoading, setWaLoading] = useState(false);
  const [showWAModal, setShowWAModal] = useState(false);

  const checkWAStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/whatsapp/status`);
      const data = await res.json();
      if (data.instance?.state === 'open') {
        setWaStatus('connected');
      } else {
        setWaStatus('disconnected');
      }
    } catch (err) {
      console.error('Erro ao checar status WA', err);
    }
  };

  const getWAQRCode = async (retryCount = 0) => {
    if (retryCount === 0) {
      setWaLoading(true);
      setWaQR('');
    }

    try {
      const res = await fetch(`${API_URL}/api/whatsapp/qrcode`);
      const data = await res.json();
      
      if (data.qrcode) {
        setWaQR(data.qrcode);
        setWaStatus('scanning');
        setWaLoading(false);
      } else if (data.status === 'connected') {
        setWaStatus('connected');
        setWaLoading(false);
        showNotification('success', 'WhatsApp Conectado', 'Sua instância já está ativa e operacional via Z-API.');
      } else if (data.status === 'pending') {
        // Polling automático
        if (retryCount < 10) {
          setTimeout(() => getWAQRCode(retryCount + 1), 5000);
        } else {
          setWaLoading(false);
          showNotification('info', 'Aguardando Z-API', 'O servidor da Z-API está demorando para responder. Tente novamente em alguns instantes.');
        }
      }
    } catch (err) {
      console.error('Erro ao gerar QR Code', err);
      setWaLoading(false);
      showNotification('error', 'Erro de Conexão', 'Não foi possível contatar o servidor da Z-API.');
    }
  };

  const logoutWA = async () => {
    if (!window.confirm('Deseja realmente desconectar o WhatsApp?')) return;
    try {
      await fetch(`${API_URL}/api/whatsapp/logout`, { method: 'POST' });
      setWaStatus('disconnected');
      setWaQR('');
    } catch (err) {
      console.error('Erro ao desconectar WA', err);
    }
  };

  // Busca dados do banco de dados quando entra na aba Integrações
  useEffect(() => {
    if (activeTab === 'Integrações') {
      fetchBMs();
      fetchMercadoStatus();
      checkWAStatus();
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
  const [voiceEngine, setVoiceEngine] = useState(localStorage.getItem('jarvisVoice') || 'elevenlabs');
  const [availableModels, setAvailableModels] = useState(['gpt-4o', 'gpt-4o-mini']);
  const [isAiOperational, setIsAiOperational] = useState(false);
  const [savingAi, setSavingAi] = useState(false);

  // Estados para Geral
  const [companyName, setCompanyName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [currency, setCurrency] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);
  const [dailySalesGoal, setDailySalesGoal] = useState(0);
  const [dailyLeadsGoal, setDailyLeadsGoal] = useState(0);

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

  // Sistema de Metas Dinâmicas
  const [customGoals, setCustomGoals] = useState([]);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalValue, setNewGoalValue] = useState('');
  const [newGoalUnit, setNewGoalUnit] = useState('');
  const [newGoalPeriod, setNewGoalPeriod] = useState('');
  const [loadingGoals, setLoadingGoals] = useState(false);

  // Base de Conhecimento
  const [knowledgeFiles, setKnowledgeFiles] = useState([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [uploadingKnowledge, setUploadingKnowledge] = useState(false);

  // Sistema de Notificações Inteligentes
  const [notification, setNotification] = useState({ show: false, type: 'success', title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

  const showNotification = (type, title, message) => {
    setNotification({ show: true, type, title, message });
    if (type === 'success') {
      setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 5000);
    }
  };

  const askConfirmation = (title, message, onConfirm) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };

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
      
      // Buscar metas dinâmicas
      fetchCustomGoals();
      fetchKnowledgeFiles();

      // Buscar metas clássicas (mantido para fallback)
      const resGoals = await fetch(`${API_URL}/api/settings/goals`);
      const dataGoals = await resGoals.json();
      setDailySalesGoal(dataGoals.dailySalesGoal || 0);
      setDailyLeadsGoal(dataGoals.dailyLeadsGoal || 0);
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

  const fetchCustomGoals = async () => {
    setLoadingGoals(true);
    try {
      const res = await fetch(`${API_URL}/api/custom-goals`);
      const data = await res.json();
      setCustomGoals(data);
    } catch (err) {
      console.error('Erro ao buscar metas dinâmicas:', err);
    } finally {
      setLoadingGoals(false);
    }
  };

  const handleAddCustomGoal = async () => {
    if (!newGoalName || !newGoalValue) return showNotification('error', 'Campos Vazios', 'Nome e Valor são obrigatórios para criar uma meta.');
    try {
      const res = await fetch(`${API_URL}/api/custom-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGoalName,
          value: newGoalValue,
          unit: newGoalUnit,
          period: newGoalPeriod
        })
      });
      if (res.ok) {
        setNewGoalName('');
        setNewGoalValue('');
        setNewGoalUnit('');
        setNewGoalPeriod('');
        fetchCustomGoals();
      }
    } catch (err) {
      console.error('Erro ao adicionar meta:', err);
    }
  };

  const handleDeleteCustomGoal = async (id) => {
    askConfirmation(
      'Excluir Meta?', 
      'Esta meta será removida permanentemente e o Jarvis deixará de considerá-la em suas análises estratégicas.',
      async () => {
        try {
          await fetch(`${API_URL}/api/custom-goals/${id}`, { method: 'DELETE' });
          fetchCustomGoals();
          showNotification('success', 'Meta Excluída', 'A métrica foi removida com sucesso do sistema.');
        } catch (err) {
          console.error('Erro ao deletar meta:', err);
        }
      }
    );
  };

  const fetchKnowledgeFiles = async () => {
    setLoadingKnowledge(true);
    try {
      const res = await fetch(`${API_URL}/api/knowledge`);
      const data = await res.json();
      setKnowledgeFiles(data);
    } catch (err) {
      console.error('Erro ao buscar base de conhecimento:', err);
    } finally {
      setLoadingKnowledge(false);
    }
  };

  const handleUploadKnowledge = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingKnowledge(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/api/knowledge/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        showNotification('success', 'Documento Memorizado', 'O Jarvis leu o arquivo e já o incluiu na base de conhecimento.');
        fetchKnowledgeFiles();
      } else {
        const err = await res.json();
        showNotification('error', 'Erro de Leitura', err.error || "Não conseguimos processar este arquivo.");
      }
    } catch (err) {
      console.error('Erro no upload:', err);
    } finally {
      setUploadingKnowledge(false);
    }
  };

  const handleDeleteKnowledge = async (id) => {
    askConfirmation(
      'Apagar Memória?', 
      'O Jarvis esquecerá completamente o conteúdo deste documento. Esta ação não pode ser desfeita.',
      async () => {
        try {
          await fetch(`${API_URL}/api/knowledge/${id}`, { method: 'DELETE' });
          fetchKnowledgeFiles();
          showNotification('success', 'Memória Apagada', 'O documento foi removido da base de conhecimento.');
        } catch (err) {
          console.error('Erro ao deletar arquivo:', err);
        }
      }
    );
  };

  const handleSaveAiConfig = async () => {
    setSavingAi(true);
    try {
      localStorage.setItem('jarvisVoice', voiceEngine);
      await fetch(`${API_URL}/api/ai-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          systemPrompt: aiSystemPrompt, 
          model: aiModel
        })
      });

      // Salvar metas (agora aqui no Jarvis)
      await fetch(`${API_URL}/api/settings/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailySalesGoal: Number(dailySalesGoal), dailyLeadsGoal: Number(dailyLeadsGoal) })
      });
      
      showNotification('success', 'Configurações Salvas', 'O DNA do Jarvis e suas metas foram atualizados com sucesso.');
      fetchAiConfig(); // Atualiza o status
    } catch (err) {
      console.error('Erro ao salvar config de IA:', err);
      showNotification('error', 'Falha no Salvamento', 'Não foi possível salvar as configurações do Jarvis. Verifique sua conexão.');
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
                <div key={i} className="settings-card-flex" style={{ 
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

            <div className="settings-card-flex" style={{ 
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
              {/* WhatsApp Evolution Card */}
              <div className="settings-card-flex" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '1.5rem', 
                background: 'var(--color-surface-container-lowest)', 
                borderRadius: '1rem',
                border: '1px solid var(--color-surface-container-low)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
                    <span className="material-icons-outlined">chat</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', color: 'var(--color-on-surface)' }}>WhatsApp (Z-API)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.2rem' }}>
                      {waStatus === 'connected' ? 'Conectado e operacional' : 'Integração de Mensagens Inbound & Outbound'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: '900', 
                    padding: '0.4rem 0.8rem', 
                    borderRadius: '2rem',
                    background: waStatus === 'connected' ? '#10B98115' : '#f59e0b15',
                    color: waStatus === 'connected' ? '#10B981' : '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    {waStatus === 'connected' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }}></span>}
                    {waStatus === 'connected' ? 'ONLINE' : 'DESCONECTADO'}
                  </span>
                  <button 
                    onClick={() => {
                      setShowWAModal(true);
                      if (waStatus !== 'connected') getWAQRCode();
                    }}
                    style={{
                      background: '#25D366',
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
                    {waStatus === 'connected' ? 'Gerenciar' : 'Conectar'}
                  </button>
                </div>
              </div>

              {[
                { label: "Google Ads API", status: "Desconectado", icon: "ads_click" }
              ].map((item, i) => (
                <div key={i} className="settings-card-flex" style={{ 
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
                <div key={i} className="settings-card-flex" style={{ 
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
                  placeholder="Ex: Você é o J.A.R.V.I.S., mentor de alta performance. Trate-me como Senhor Senhor Gustavo. Sua meta principal é o lucro real..."
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
5. AÇÃO PROATIVA: Você DEVE dar sugestões de otimização na fala (ex: "Sugiro pausar campanha X").
6. CONTINUE FALANDO: Não pare a fala porque a tabela está na tela. Prossiga com sua análise estratégica.
7. SEU NOME: Nunca escreva "J.A.R.V.I.S." com pontos. Escreva "Jarvis".

REGRAS PARA A TAG [TELA] (Visual):
Aqui você tem liberdade total para tabelas e Markdown, mas É PROIBIDO O USO DE EMOJIS.`}
                  style={{ 
                    width: '100%', minHeight: '280px', padding: '1.5rem', borderRadius: '1rem', 
                    border: '1px solid #fee2e2', background: '#fef2f2', outline: 'none', 
                    fontSize: '0.85rem', color: '#991b1b', fontWeight: '600', lineHeight: '1.6',
                    fontFamily: 'monospace', resize: 'none', boxSizing: 'border-box', opacity: 0.9
                  }}
                />

                <div style={{ marginTop: '2.5rem', paddingTop: '2.5rem', borderTop: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>Fábrica de Metas Dinâmicas</h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>
                    Crie, edite ou remova metas personalizadas. O Jarvis se adapta automaticamente a qualquer métrica que você adicionar aqui.
                  </p>

                  <div style={{ background: '#f1f5f9', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'var(--goals-grid, 2fr 1fr 1fr 1fr auto)', gap: '1rem', alignItems: 'flex-end' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b' }}>NOME DA META</label>
                        <input value={newGoalName} onChange={e => setNewGoalName(e.target.value)} placeholder="Ex: Lucro em 7 dias" style={{ padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', color: '#333' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b' }}>VALOR ALVO</label>
                        <input value={newGoalValue} onChange={e => setNewGoalValue(e.target.value)} placeholder="Ex: 5000" style={{ padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', color: '#333' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b' }}>UNIDADE</label>
                        <input value={newGoalUnit} onChange={e => setNewGoalUnit(e.target.value)} placeholder="Ex: R$, %, leads" style={{ padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', color: '#333' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b' }}>PERÍODO</label>
                        <input value={newGoalPeriod} onChange={e => setNewGoalPeriod(e.target.value)} placeholder="Ex: 7 dias, Diário" style={{ padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', color: '#333' }} />
                      </div>
                      <button onClick={handleAddCustomGoal} style={{ background: '#0EA5E9', color: 'white', border: 'none', padding: '0.85rem', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <span className="material-icons-outlined">add</span>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {loadingGoals ? (
                      <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Carregando metas...</p>
                    ) : customGoals.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', border: '2px dashed #e2e8f0', borderRadius: '1rem', color: '#94a3b8' }}>
                        Nenhuma meta personalizada criada. Comece adicionando uma acima!
                      </div>
                    ) : (
                      customGoals.map(goal => (
                        <div key={goal.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '1rem 1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                            <div style={{ width: '40px', height: '40px', background: '#E0F2FE', color: '#0369A1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span className="material-icons-outlined" style={{ fontSize: '1.2rem' }}>ads_click</span>
                            </div>
                            <div>
                              <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.95rem' }}>{goal.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Período: {goal.period || 'Geral'}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '3rem', alignItems: 'center' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Objetivo</div>
                              <div style={{ fontWeight: '900', color: '#0EA5E9', fontSize: '1.1rem' }}>{goal.unit === 'R$' ? `R$ ${goal.value}` : `${goal.value}${goal.unit || ''}`}</div>
                            </div>
                            <button onClick={() => handleDeleteCustomGoal(goal.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.5rem' }}>
                              <span className="material-icons-outlined" style={{ fontSize: '1.2rem' }}>delete_outline</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Seção de Base de Conhecimento */}
                <div style={{ marginTop: '2.5rem', paddingTop: '2.5rem', borderTop: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>Memória de Longo Prazo (Base de Conhecimento)</h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>
                    Alimente o Jarvis com manuais, scripts de vendas ou tabelas de preços. Ele consultará esses documentos para te dar respostas mais precisas.
                  </p>

                  <div style={{ marginBottom: '2rem' }}>
                    <label style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      padding: '2rem', 
                      border: '2px dashed #cbd5e1', 
                      borderRadius: '1rem', 
                      cursor: 'pointer',
                      background: uploadingKnowledge ? '#f8fafc' : 'white',
                      transition: 'all 0.2s ease'
                    }}>
                      <span className="material-icons-outlined" style={{ fontSize: '2.5rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                        {uploadingKnowledge ? 'sync' : 'cloud_upload'}
                      </span>
                      <span style={{ fontWeight: '700', color: '#475569' }}>
                        {uploadingKnowledge ? 'Processando arquivo...' : 'Clique para subir PDF ou TXT'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>O Jarvis lerá o conteúdo e guardará na memória</span>
                      <input type="file" accept=".pdf,.txt" onChange={handleUploadKnowledge} style={{ display: 'none' }} disabled={uploadingKnowledge} />
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                    {loadingKnowledge ? (
                      <p>Carregando memória...</p>
                    ) : knowledgeFiles.length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                        Nenhum documento na memória.
                      </div>
                    ) : (
                      knowledgeFiles.map(file => (
                        <div key={file.id} style={{ background: 'white', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
                          <div style={{ width: '40px', height: '40px', background: '#F1F5F9', color: '#475569', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-icons-outlined">{file.fileType.includes('pdf') ? 'description' : 'article'}</span>
                          </div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.fileName}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Adicionado em {new Date(file.createdAt).toLocaleDateString()}</div>
                          </div>
                          <button onClick={() => handleDeleteKnowledge(file.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>close</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Seção do Modelo e Voz */}
              <div style={{ display: 'grid', gridTemplateColumns: 'var(--main-grid, 1fr 1fr 1fr)', gap: '1.5rem' }}>
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

                {/* Motor de Voz */}
                <div style={{ background: 'var(--color-surface-container-lowest)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--color-surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      <span className="material-icons-outlined">record_voice_over</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>Motor de Voz</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Sua preferência</div>
                    </div>
                  </div>
                  <select 
                    value={voiceEngine}
                    onChange={(e) => setVoiceEngine(e.target.value)}
                    style={{ border: 'none', background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="elevenlabs">ElevenLabs (Premium)</option>
                    <option value="browser">Navegador (Grátis)</option>
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
          <nav className="settings-nav" style={{ 
            display: 'flex', 
            flexDirection: 'var(--settings-nav-dir, column)', 
            gap: '0.5rem',
            paddingBottom: '1rem' 
          }}>
            {tabs.map((tab) => (
              <button 
                key={tab} 
                onClick={() => tab !== 'Faturamento' && navigate(`/settings/${reverseSlugs[tab]}`)}
                disabled={tab === 'Faturamento'}
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
                  cursor: tab === 'Faturamento' ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  opacity: tab === 'Faturamento' ? 0.5 : 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{tab}</span>
                {tab === 'Faturamento' && (
                  <span style={{ fontSize: '0.6rem', color: '#888', fontStyle: 'italic', marginLeft: '0.5rem' }}>(em desenvolvimento)</span>
                )}
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
                  <input readOnly value={`${API_URL}/api/webhooks/mercadophone`} type="text" style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '0.75rem 0 0 0.75rem', border: '1px solid #ddd', borderRight: 'none', outline: 'none', fontWeight: '600', color: '#8B5CF6', background: '#F5F3FF' }} />
                  <button onClick={() => { navigator.clipboard.writeText(`${API_URL}/api/webhooks/mercadophone`); showNotification('success', 'Copiado!', 'A URL do Webhook foi copiada para sua área de transferência.'); }} style={{ padding: '0 1rem', background: '#8B5CF6', color: 'white', border: 'none', borderRadius: '0 0.75rem 0.75rem 0', cursor: 'pointer' }}>
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
      
      {/* Modal WhatsApp */}
      {showWAModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '450px', borderRadius: '2rem', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ padding: '2rem', background: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className="material-icons-outlined" style={{ fontSize: '2rem' }}>whatsapp</span>
                <div>
                  <h3 style={{ fontWeight: '900', fontSize: '1.2rem' }}>WHATSAPP CRM</h3>
                  <p style={{ fontSize: '0.7rem', fontWeight: '700', opacity: 0.8, textTransform: 'uppercase' }}>Z-API Cloud v3.0</p>
                </div>
              </div>
              <button onClick={() => setShowWAModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <div style={{ padding: '2rem', textAlign: 'center' }}>
              {waStatus === 'connected' ? (
                <div>
                  <div style={{ width: '80px', height: '80px', background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <span className="material-icons-outlined" style={{ fontSize: '3rem' }}>check_circle</span>
                  </div>
                  <h4 style={{ color: '#1e293b', fontSize: '1.2rem', fontWeight: '900' }}>Conectado com Sucesso!</h4>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>O Supercell AI agora está recebendo e enviando mensagens deste número em tempo real.</p>
                  
                  <button onClick={logoutWA} style={{ marginTop: '2rem', width: '100%', padding: '1rem', borderRadius: '1rem', border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444', fontWeight: '800', cursor: 'pointer' }}>
                    DESCONECTAR NÚMERO
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ color: '#1e293b', fontSize: '0.9rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                    Escaneie o QR Code abaixo para conectar o WhatsApp da empresa ao CRM.
                  </p>

                  <div style={{ width: '250px', height: '250px', background: '#f8fafc', borderRadius: '1.5rem', margin: '0 auto', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    {waQR ? (
                      <img src={waQR} alt="WhatsApp QR Code" style={{ width: '100%', height: '100%', padding: '1rem' }} />
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #25D366', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '800' }}>{waStatus === 'connected' ? 'CONECTADO!' : 'SINCRONIZANDO...'}</span>
                      </div>
                    )}
                  </div>

                  {!waQR && !waLoading && (
                    <button onClick={getWAQRCode} style={{ marginTop: '1.5rem', width: '100%', padding: '1rem', borderRadius: '1rem', border: 'none', background: '#0ea5e9', color: 'white', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(14, 165, 233, 0.3)' }}>
                      GERAR NOVO QR CODE
                    </button>
                  )}

                  {waQR && (
                    <p style={{ marginTop: '1rem', fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>
                      Aguardando leitura do QR Code...
                    </p>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: waStatus === 'connected' ? '#22c55e' : '#f59e0b' }}></div>
              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                STATUS: {waStatus === 'connected' ? 'ONLINE' : 'AGUARDANDO CONEXÃO'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE STATUS INTELIGENTE (PREMIUM) */}
      {notification.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div onClick={() => setNotification({ ...notification, show: false })} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(12px)' }} />
          <div style={{
            position: 'relative', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)',
            width: '90%', maxWidth: '420px', padding: '3rem 2rem', borderRadius: '2.5rem', textAlign: 'center',
            boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.3)',
            animation: 'modalSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '30%', background: notification.type === 'success' ? '#10B981' : '#EF4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto' }}>
              <span className="material-icons-outlined" style={{ fontSize: '3.5rem' }}>{notification.type === 'success' ? 'verified' : 'report_problem'}</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0f172a', marginBottom: '1rem' }}>{notification.title}</h2>
            <p style={{ color: '#475569', fontSize: '1.1rem', marginBottom: '2.5rem' }}>{notification.message}</p>
            <button onClick={() => setNotification({ ...notification, show: false })} style={{ width: '100%', padding: '1.25rem', borderRadius: '1.25rem', background: '#0f172a', color: 'white', border: 'none', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer' }}>Entendido</button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO (PREMIUM) */}
      {confirmModal.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(2, 6, 23, 0.7)', backdropFilter: 'blur(10px)' }} />
          <div style={{
            position: 'relative', background: 'white', width: '90%', maxWidth: '400px',
            padding: '2.5rem', borderRadius: '2rem', textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            animation: 'modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '20px', background: '#FFF7ED', color: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <span className="material-icons-outlined" style={{ fontSize: '2.5rem' }}>help_outline</span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', marginBottom: '0.8rem' }}>{confirmModal.title}</h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setConfirmModal({ ...confirmModal, show: false })} style={{ flex: 1, padding: '1rem', borderRadius: '1rem', background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: '800', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }} style={{ flex: 1, padding: '1rem', borderRadius: '1rem', background: '#EF4444', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer' }}>Sim, Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalSlideIn {
          0% { opacity: 0; transform: translateY(40px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}

export default Settings;
