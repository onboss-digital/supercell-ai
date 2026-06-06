import React, { useState, useEffect } from 'react';

import { API_URL } from '../api/config';



function CRM() {

  const [leads, setLeads] = useState([]);

  const [selectedLead, setSelectedLead] = useState(null);

  const [messages, setMessages] = useState([]);

  const [loadingMessages, setLoadingMessages] = useState(false);

  const [loading, setLoading] = useState(true);

  const [viewType, setViewType] = useState('list'); // 'list' ou 'kanban'

  const [companyProfile, setCompanyProfile] = useState(null);

  const [newMessage, setNewMessage] = useState('');

  const [sending, setSending] = useState(false);

  const [stats, setStats] = useState({ leadsHoje: 0, vendasHoje: 0, valorVendasHoje: 0, conversao: '0.0' });

  // Novo estado para abas do modal no mobile
  const [activeModalTab, setActiveModalTab] = useState('chat');
  const [showStatsMobile, setShowStatsMobile] = useState(false);



  // Estados de Filtro

  const [statusFilter, setStatusFilter] = useState('Todos');

  const [platformFilter, setPlatformFilter] = useState('Todos');

  const [tempFilter, setTempFilter] = useState('Todos');

  const [campaignSearch, setCampaignSearch] = useState('');

  const [adSearch, setAdSearch] = useState('');

  const [tagSearch, setTagSearch] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [showFilters, setShowFilters] = useState(false);




  const statuses = ['Novo', 'Em Atendimento', 'Remarketing', 'Qualificado', 'Venda Concluída', 'Perdido'];

  const standardTags = ['Tráfego Pago', 'Tráfego Orgânico'];



  useEffect(() => {

    fetchLeads();

    fetchCompanyProfile();

    fetchStats();

    

    // Atualização automática a cada 30 segundos

    const interval = setInterval(() => {

      fetchLeads();

      fetchStats();

    }, 30000);

    return () => clearInterval(interval);

  }, []);



  const fetchStats = () => {

    fetch(`${API_URL}/api/leads/stats`)

      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Erro ao buscar stats', err));
  };



  const fetchCompanyProfile = () => {

    fetch(`${API_URL}/api/company/profile`)

      .then(res => res.json())

      .then(data => {
        setCompanyProfile(data);
      })

      .catch(err => console.error('Erro ao buscar perfil da empresa', err));

  };



  const fetchLeads = () => {

    setLoading(true);

    fetch(`${API_URL}/api/leads`)

      .then(res => res.json())

      .then(data => {

        setLeads(data);

        setLoading(false);

      })

      .catch(err => {

        console.error('Erro ao buscar leads', err);

        setLoading(false);

      });

  };



  const updateLeadStatus = (leadId, newStatus) => {

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));



    fetch(`${API_URL}/api/leads/${leadId}/status`, {

      method: 'PATCH',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ status: newStatus })

    }).catch(err => {

      console.error('Erro ao atualizar status', err);

    });

  };



  const handleSendMessage = () => {

    if (!selectedLead || !newMessage.trim() || sending) return;



    setSending(true);

    fetch(`${API_URL}/api/leads/${selectedLead.id}/messages`, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ content: newMessage })

    })

      .then(res => res.json())

      .then(data => {

        if (data.error) {

          alert(`Erro ao enviar: ${data.error}`);

        } else {

          setMessages(prev => [...prev, data]);

          setNewMessage('');

          // Se o lead era novo, atualiza localmente para em atendimento e notifica o banco
          if (selectedLead.status === 'Novo') {
             updateLeadStatus(selectedLead.id, 'Em Atendimento');
             setSelectedLead(prev => ({ ...prev, status: 'Em Atendimento' }));
          }

        }

        setSending(false);

      })

      .catch(err => {

        console.error('Erro ao enviar mensagem', err);

        setSending(false);

      });

  };



  const addTag = (leadId, tag) => {

    if (!tag.trim()) return;

    const lead = leads.find(l => l.id === leadId);

    if (!lead) return;

    if ((lead.tags || []).includes(tag)) return;

    

    const newTags = [...(lead.tags || []), tag];

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tags: newTags } : l));

    if (selectedLead?.id === leadId) setSelectedLead(prev => ({ ...prev, tags: newTags }));



    fetch(`${API_URL}/api/leads/${leadId}/tags`, {

      method: 'PATCH',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ tags: newTags })

    }).catch(err => console.error('Erro ao adicionar tag', err));

  };



  const removeTag = (leadId, tag) => {

    const lead = leads.find(l => l.id === leadId);

    if (!lead) return;

    

    const newTags = (lead.tags || []).filter(t => t !== tag);

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tags: newTags } : l));

    if (selectedLead?.id === leadId) setSelectedLead(prev => ({ ...prev, tags: newTags }));



    fetch(`${API_URL}/api/leads/${leadId}/tags`, {

      method: 'PATCH',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ tags: newTags })

    }).catch(err => console.error('Erro ao remover tag', err));

  };



  const filteredLeads = leads.filter(l => {
    const matchStatus = statusFilter === 'Todos' || l.status === statusFilter;
    const matchPlatform = platformFilter === 'Todos' || l.platform === platformFilter;
    const matchTemp = tempFilter === 'Todos' || (l.temperature || 'Quente') === tempFilter;
    const matchCampaign = !campaignSearch || (l.campaignName || '').toLowerCase().includes(campaignSearch.toLowerCase());
    const matchAd = !adSearch || (l.adName || '').toLowerCase().includes(adSearch.toLowerCase());
    const matchTag = !tagSearch || (l.tags || []).some(t => t.toLowerCase().includes(tagSearch.toLowerCase()));
    const matchGlobal = !globalSearch || 
                        (l.name || '').toLowerCase().includes(globalSearch.toLowerCase()) || 
                        (l.phone || '').includes(globalSearch) ||
                        (l.platform || '').toLowerCase().includes(globalSearch.toLowerCase());
    
    // Filtro de Data
    const leadDate = new Date(l.createdAt);
    const start = startDate ? new Date(startDate + 'T00:00:00') : null;
    const end = endDate ? new Date(endDate + 'T23:59:59') : null;
    const matchDate = (!start || leadDate >= start) && (!end || leadDate <= end);

    return matchStatus && matchPlatform && matchTemp && matchCampaign && matchAd && matchTag && matchGlobal && matchDate;
  });

  const dynamicStats = {
    total: filteredLeads.length,
    ativos: filteredLeads.filter(l => l.status === 'Novo' || l.status === 'Em Atendimento').length,
    convertidos: filteredLeads.filter(l => l.status === 'Venda Concluída').length,
  };
  dynamicStats.conversao = dynamicStats.total > 0 ? ((dynamicStats.convertidos / dynamicStats.total) * 100).toFixed(1) : '0.0';



  const allUniqueTags = Array.from(new Set(leads.flatMap(l => l.tags || []))).sort();



  const getStatusColor = (status) => {

    switch(status) {

      case 'Novo': return '#0049db';

      case 'Em Atendimento': return '#C5A059';

      case 'Remarketing': return '#8B5CF6';

      case 'Qualificado': return '#10B981';

      case 'Venda Concluída': return '#10B981';

      case 'Perdido': return '#E11D48';

      default: return '#64748b';

    }

  };



  const getTempColor = (temp) => {

    switch(temp) {

      case 'Quente': return '#E11D48';

      case 'Morno': return '#C5A059';

      case 'Frio': return '#64748b';

      default: return '#64748b';

    }

  };



  // Drag and Drop

  useEffect(() => {

    if (selectedLead) {
      setActiveModalTab('chat');

      setLoadingMessages(true);

      fetch(`${API_URL}/api/leads/${selectedLead.id}/messages`)

        .then(res => res.json())

        .then(data => {

          setMessages(Array.isArray(data) ? data : []);

          setLoadingMessages(false);

        })

        .catch(err => {

          console.error('Erro ao buscar mensagens:', err);

          setLoadingMessages(false);

        });



      // Marca como lido

      if (selectedLead.hasUnread) {

        fetch(`${API_URL}/api/leads/${selectedLead.id}/read`, { method: 'PATCH' })

          .then(() => {

            setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, hasUnread: false } : l));

          })

          .catch(err => console.error('Erro ao marcar como lido', err));

      }

    } else {

      setMessages([]);

    }

  }, [selectedLead]);



  const onDragStart = (e, leadId) => { e.dataTransfer.setData('leadId', leadId); e.target.style.opacity = '0.5'; };

  const onDragEnd = (e) => { e.target.style.opacity = '1'; };

  const onDragOver = (e) => { e.preventDefault(); };

  const onDrop = (e, newStatus) => {

    e.preventDefault();

    const leadId = e.dataTransfer.getData('leadId');

    updateLeadStatus(leadId, newStatus);

  };

  const renderTempBadge = (temp) => {
    const tempColors = {
      'Quente': { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)', text: '#ff5c5c' },
      'Morno': { bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.25)', text: '#f97316' },
      'Frio': { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.25)', text: '#5cb0ff' }
    };
    const current = tempColors[temp] || { bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.25)', text: '#94a3b8' };
    return (
      <span style={{ 
        fontSize: '0.55rem', 
        background: current.bg, 
        color: current.text, 
        border: `1px solid ${current.border}`, 
        padding: '0.15rem 0.4rem', 
        borderRadius: '4px', 
        fontWeight: '900',
        letterSpacing: '0.05em'
      }}>
        {temp.toUpperCase()}
      </span>
    );
  };



  return (

    <main className="main-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: 0, position: 'relative' }}>

      

      {/* Jarvis Insights Header */}

      <div className="crm-header-wrapper">

        <div className="crm-header-card">

          <div className="crm-header-top-row">

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

              <div style={{ background: 'var(--color-primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                <span className="material-icons-outlined" style={{ fontSize: '1.2rem', color: 'white' }}>psychology</span>

              </div>

              <h2 style={{ fontSize: '1.1rem', fontWeight: '900', letterSpacing: '0.05em' }}>LEADS DA SUPERCELL</h2>

            </div>

            

            <div className="crm-header-actions">

              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', padding: '0.3rem', borderRadius: '2rem', gap: '0.3rem' }}>

                <button onClick={() => setViewType('list')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 1rem', borderRadius: '2rem', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '800', transition: '0.3s', background: viewType === 'list' ? 'white' : 'transparent', color: viewType === 'list' ? '#0f172a' : 'white' }}>

                   Lista

                </button>

                <button onClick={() => setViewType('kanban')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 1rem', borderRadius: '2rem', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '800', transition: '0.3s', background: viewType === 'kanban' ? 'white' : 'transparent', color: viewType === 'kanban' ? '#0f172a' : 'white' }}>

                   Kanban

                </button>

              </div>

              

              <button 
                onClick={() => setShowStatsMobile(!showStatsMobile)}
                className="crm-stats-toggle-btn"
                style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.3rem', 
                  padding: '0.4rem 0.8rem', 
                  borderRadius: '2rem',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: showStatsMobile ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                  color: showStatsMobile ? 'black' : 'white',
                  cursor: 'pointer',
                  fontWeight: '800',
                  fontSize: '0.7rem',
                  transition: '0.3s'
                }}
              >
                <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>bar_chart</span>
                <span>{showStatsMobile ? 'OCULTAR' : 'RESUMO'}</span>
              </button>

              <button 

                onClick={() => setShowFilters(true)}

                style={{ 

                  display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', borderRadius: '2rem', 

                  border: '1px solid rgba(255,255,255,0.2)', background: (statusFilter !== 'Todos' || platformFilter !== 'Todos' || tempFilter !== 'Todos' || campaignSearch || adSearch) ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', 

                  color: 'white', cursor: 'pointer', fontWeight: '800', fontSize: '0.7rem', transition: '0.3s'

                }}

              >

                <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>filter_list</span>

                <span>FILTRAR {(statusFilter !== 'Todos' || platformFilter !== 'Todos' || tempFilter !== 'Todos' || campaignSearch || adSearch) && "•"}</span>
              </button>

            </div>

          </div>



          {/* Remarketing Suggestions & Quick Stats */}

          <div className={`crm-stats-wrapper ${showStatsMobile ? 'show-mobile' : 'hide-mobile'}`} style={{ gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>

             {/* Stats Cards Dinâmicos */}
             <div className="crm-stats-grid">
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                   <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'uppercase' }}>Total de Leads</p>
                   <p style={{ fontSize: '1.25rem', fontWeight: '900', marginTop: '0.2rem' }}>{dynamicStats.total}</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                   <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'uppercase' }}>Em Atendimento</p>
                   <p style={{ fontSize: '1.25rem', fontWeight: '900', marginTop: '0.2rem' }}>{dynamicStats.ativos}</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                   <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'uppercase' }}>Vendas Fechadas</p>
                   <p style={{ fontSize: '1.25rem', fontWeight: '900', marginTop: '0.2rem' }}>{dynamicStats.convertidos}</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                   <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: '800', textTransform: 'uppercase' }}>Conversão</p>
                   <p style={{ fontSize: '1.25rem', fontWeight: '900', marginTop: '0.2rem', color: dynamicStats.conversao > 0 ? '#10B981' : 'white' }}>{dynamicStats.conversao}%</p>
                </div>
             </div>

             

             {leads.filter(l => l.temperature === 'Frio' && l.status !== 'Venda Concluída').length > 0 && (

                 <div className="crm-remarketing-card">

                  <div style={{ background: '#E11D48', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>

                    <span className="material-icons-outlined" style={{ fontSize: '1.1rem', color: 'white' }}>notification_important</span>

                  </div>

                  <div style={{ flex: 1 }}>

                    <p style={{ fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.1rem' }}>REMARKETING INTELIGENTE</p>

                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>

                      Identificados {leads.filter(l => l.temperature === 'Frio' && l.status !== 'Venda Concluída').length} leads frios.

                    </p>

                  </div>

                  <button 

                    onClick={() => {
                      setStatusFilter('Remarketing');
                      setPlatformFilter('Todos');
                      setTempFilter('Todos');
                    }}

                    style={{ background: 'white', color: '#0f172a', border: 'none', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.65rem', fontWeight: '900', cursor: 'pointer' }}

                  >

                    FILTRAR

                  </button>

                </div>

              )}

          </div>

          {/* Smart Search Bar */}
          <div style={{ marginTop: '1rem', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span className="material-icons-outlined" style={{ 
              position: 'absolute', 
              left: '1.25rem', 
              color: globalSearch ? 'var(--color-primary)' : 'rgba(255,255,255,0.3)', 
              fontSize: '1.2rem',
              transition: '0.3s'
            }}>search</span>
            <input 
              type="text" 
              placeholder="Pesquisa inteligente: busque por nome, telefone ou identificação..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '2.5rem',
                padding: '0.85rem 1.5rem 0.85rem 3.5rem',
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: '500',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxShadow: globalSearch ? '0 0 0 2px rgba(0, 73, 219, 0.2)' : 'none'
              }}
              onFocus={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.06)';
                e.target.style.borderColor = 'var(--color-primary)';
              }}
              onBlur={(e) => {
                if (!globalSearch) {
                  e.target.style.background = 'rgba(255,255,255,0.03)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                }
              }}
            />
            {globalSearch && (
              <button 
                onClick={() => setGlobalSearch('')}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>close</span>
              </button>
            )}
          </div>

        </div>

      </div>



      {/* Main Content Area */}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {viewType === 'list' ? (

          <section style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
            <div className="desktop-table-view table-responsive">
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.75rem' }}>

                <thead>

                  <tr style={{ textAlign: 'left', color: 'var(--color-on-surface-variant)', fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>

                    <th style={{ padding: '0.75rem 0.5rem 0.75rem 1rem' }}>Identificação</th>

                    <th style={{ padding: '0.75rem 0.5rem' }}>Tag</th>

                    <th style={{ padding: '0.75rem 0.5rem' }}>Produto</th>

                    <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>

                    <th style={{ padding: '0.75rem 0.5rem' }}>Temp.</th>

                    <th style={{ padding: '0.75rem 0.5rem' }}>Campanha</th>

                    <th style={{ padding: '0.75rem 0.5rem' }}>Anúncio</th>

                    <th style={{ padding: '0.75rem 1rem 0.75rem 0.5rem', textAlign: 'right' }}>Ação</th>

                  </tr>

                </thead>

                <tbody>

                  {filteredLeads.map(lead => (

                    <tr key={lead.id} onClick={() => setSelectedLead(lead)} style={{ background: selectedLead?.id === lead.id ? 'var(--color-surface-container-high)' : 'var(--color-surface-container-lowest)', cursor: 'pointer', transition: '0.2s' }}>

                      <td style={{ padding: '0.75rem 0.5rem 0.75rem 1rem', borderRadius: '0.75rem 0 0 0.75rem' }}>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

                          <div style={{ position: 'relative', flexShrink: 0 }}>

                            {lead.hasUnread && (

                              <div className="pulse-ping" style={{ position: 'absolute', top: '-6px', right: '-6px', minWidth: '18px', height: '18px', padding: '0 4px', background: '#0ea5e9', borderRadius: '10px', border: '2px solid white', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem', fontWeight: '900' }}>

                                {lead.unreadCount || 1}

                              </div>

                            )}

                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--color-surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontWeight: '900', fontSize: '0.8rem', overflow: 'hidden' }}>

                              {lead.profilePic ? (

                                <img src={lead.profilePic} alt={lead.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                              ) : (

                                (lead.name || 'L').charAt(0)

                              )}

                            </div>

                            <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: lead.platform === 'instagram' ? 'linear-gradient(45deg, #f09433 0%, #dc2743 100%)' : '#25D366', color: 'white', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid white' }}>

                              {lead.platform === 'instagram' ? (

                                <svg viewBox="0 0 24 24" width="8" height="8" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>

                              ) : (

                                <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>

                              )}

                            </div>

                          </div>

                          <div>

                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                               <div style={{ fontWeight: '800', fontSize: '0.85rem' }}>{lead.name}</div>

                               {lead.hasUnread && (

                                 <div className="pulse-ping" style={{ minWidth: '18px', height: '18px', padding: '0 5px', background: '#0ea5e9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem', fontWeight: '900', boxShadow: '0 0 10px rgba(14, 165, 233, 0.5)' }}>

                                   {lead.unreadCount || 1}

                                 </div>

                               )}

                             </div>

                            {lead.platform === 'instagram' ? (

                              <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: '900' }}>

                                @{lead.instagramHandle || 'direct'}

                              </div>

                            ) : (

                              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700' }}>{lead.phone}</div>

                            )}

                            <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: '700' }}>

                               {new Date(lead.createdAt).toLocaleDateString('pt-BR')} {new Date(lead.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}

                            </div>

                          </div>

                        </div>

                      </td>

                      <td style={{ padding: '0.75rem 0.5rem' }}>

                         <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>

                            {lead.tags?.filter(t => t.includes('Tráfego')).map(tag => (

                               <span key={tag} style={{ 

                                  padding: '0.2rem 0.5rem', 

                                  borderRadius: '4px', 

                                  fontSize: '0.6rem', 

                                  fontWeight: '900', 

                                  background: tag === 'Tráfego Pago' ? 'rgba(0, 255, 255, 0.1)' : 'rgba(148, 163, 184, 0.1)',

                                  color: tag === 'Tráfego Pago' ? 'var(--color-primary)' : '#94a3b8',

                                  border: `1px solid ${tag === 'Tráfego Pago' ? 'var(--color-primary)' : '#94a3b8'}20`

                               }}>

                                  {tag.toUpperCase()}

                               </span>

                            ))}

                         </div>

                      </td>

                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: '700', fontSize: '0.75rem', color: lead.productName ? 'var(--color-primary)' : '#94a3b8' }}>

                        {lead.productName || 'Sem Produto'}

                      </td>

                      <td style={{ padding: '0.75rem 0.5rem' }}>

                         <span style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.55rem', fontWeight: '900', background: `${getStatusColor(lead.status)}15`, color: getStatusColor(lead.status) }}>{lead.status.toUpperCase()}</span>

                      </td>

                      <td style={{ padding: '0.75rem 0.5rem' }}>

                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>

                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getTempColor(lead.temperature) }}></div>

                            <span style={{ fontSize: '0.7rem', fontWeight: '800' }}>{lead.temperature}</span>

                         </div>

                      </td>

                      <td style={{ padding: '0.75rem 0.5rem' }}>

                        <div style={{ fontSize: '0.75rem', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }} title={lead.campaignName}>{lead.campaignName || '—'}</div>

                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{lead.adsetName || '—'}</div>

                      </td>

                      <td style={{ padding: '0.75rem 0.5rem' }}>

                        <div style={{ fontSize: '0.7rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }} title={lead.adName}>{lead.adName || '—'}</div>

                      </td>

                      <td style={{ padding: '0.75rem 1rem 0.75rem 0.5rem', borderRadius: '0 0.75rem 0.75rem 0', textAlign: 'right' }}>

                         <button style={{ background: 'var(--color-primary)', color: 'black', border: 'none', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.65rem', fontWeight: '900', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>ABRIR</button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>



            {/* Mobile Card List View */}

            <div className="mobile-card-list">

              {filteredLeads.map(lead => (

                <div 

                  key={lead.id} 

                  onClick={() => setSelectedLead(lead)} 

                  style={{ 

                    background: 'var(--color-surface-container-lowest)', 

                    borderRadius: '1rem', 

                    padding: '1.25rem', 

                    border: '1px solid var(--color-surface-container-low)',

                    display: 'flex',

                    flexDirection: 'column',

                    gap: '0.75rem',

                    cursor: 'pointer',

                    position: 'relative'

                  }}

                >

                  {lead.hasUnread && (

                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#0ea5e9', width: '10px', height: '10px', borderRadius: '50%', boxShadow: '0 0 10px #0ea5e9' }} />

                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--color-surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontWeight: '900', fontSize: '0.85rem', overflow: 'hidden' }}>

                      {lead.profilePic ? (

                        <img src={lead.profilePic} alt={lead.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                      ) : (

                        (lead.name || 'L').charAt(0)

                      )}

                    </div>

                    <div>

                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: 'var(--color-on-surface)' }}>{lead.name}</h4>

                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>

                        {lead.platform === 'instagram' ? `@${lead.instagramHandle || 'direct'}` : lead.phone}

                      </p>

                    </div>

                    <span style={{ 

                      marginLeft: 'auto', 

                      padding: '0.2rem 0.5rem', 

                      borderRadius: '4px', 

                      fontSize: '0.6rem', 

                      fontWeight: '900', 

                      background: `${getStatusColor(lead.status)}15`, 

                      color: getStatusColor(lead.status) 

                    }}>

                      {lead.status.toUpperCase()}

                    </span>

                  </div>

                  

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', borderTop: '1px solid var(--color-surface-container-low)', paddingTop: '0.75rem' }}>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>

                      {lead.tags?.slice(0, 2).map(tag => (

                        <span key={tag} style={{ 

                          padding: '0.15rem 0.4rem', 

                          borderRadius: '4px', 

                          fontSize: '0.55rem', 

                          fontWeight: '900', 

                          background: tag === 'Tráfego Pago' ? 'rgba(0, 255, 255, 0.1)' : 'rgba(148, 163, 184, 0.1)',

                          color: tag === 'Tráfego Pago' ? 'var(--color-primary)' : '#94a3b8',

                          border: `1px solid ${tag === 'Tráfego Pago' ? 'var(--color-primary)' : '#94a3b8'}20`

                        }}>

                          {tag.toUpperCase()}

                        </span>

                      ))}

                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>

                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getTempColor(lead.temperature) }}></div>

                      <span style={{ fontWeight: '800', fontSize: '0.7rem' }}>{lead.temperature}</span>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </section>



        ) : (

          <section className="crm-kanban-section kanban-scroll">

            {statuses.map(status => (

              <div key={status} onDragOver={onDragOver} onDrop={(e) => onDrop(e, status)} className="crm-kanban-column">

                <div className="crm-kanban-column-header">

                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>

                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(status) }}></div>

                      <h3 className="crm-kanban-column-title">{status}</h3>

                   </div>

                   <span className="crm-kanban-column-badge">{filteredLeads.filter(l => l.status === status).length}</span>

                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.75rem 1.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="hide-scrollbar">

                   {filteredLeads.filter(l => l.status === status).map(lead => (

                     <div key={lead.id} draggable={window.innerWidth > 768} onDragStart={(e) => onDragStart(e, lead.id)} onDragEnd={onDragEnd} onClick={() => setSelectedLead(lead)} className="crm-kanban-card">

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'flex-start' }}>

                           <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>

                              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--color-surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-surface-variant)', overflow: 'hidden', flexShrink: 0 }}>

                                {lead.profilePic ? (

                                  <img src={lead.profilePic} alt={lead.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                                ) : (

                                  <span style={{ fontWeight: '900', fontSize: '0.8rem' }}>{(lead.name || 'L').charAt(0).toUpperCase()}</span>

                                )}

                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column' }}>

                                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                                   <span style={{ fontWeight: '800', fontSize: '0.85rem', color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{lead.name}</span>

                                   {lead.hasUnread && (

                                     <div className="pulse-ping" style={{ minWidth: '18px', height: '18px', padding: '0 5px', background: '#0ea5e9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem', fontWeight: '900' }}>

                                       {lead.unreadCount || 1}

                                     </div>

                                   )}

                                 </div>

                                 <div style={{ fontSize: '0.65rem', color: 'var(--color-on-surface-variant)', fontWeight: '800' }}>

                                    {lead.platform === 'instagram' ? `@${lead.instagramHandle || 'direct'}` : lead.phone}

                                 </div>

                              </div>

                           </div>

                           <div style={{ color: lead.platform === 'instagram' ? '#dc2743' : '#25D366', flexShrink: 0 }}>

                              {lead.platform === 'instagram' ? (

                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>

                              ) : (

                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>

                              )}

                           </div>

                        </div>

                        {lead.tags?.length > 0 && (

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.6rem' }}>

                             {lead.tags.slice(0, 3).map(tag => (

                               <span key={tag} style={{ fontSize: '0.5rem', background: 'var(--color-surface-container-highest)', color: 'var(--color-primary)', padding: '0.15rem 0.4rem', borderRadius: '2px', fontWeight: '900' }}>{tag.toUpperCase()}</span>

                             ))}

                             {lead.tags.length > 3 && <span style={{ fontSize: '0.5rem', color: 'var(--color-on-surface-variant)', fontWeight: '800' }}>+{lead.tags.length - 3}</span>}

                          </div>

                        )}

                        <div style={{ borderTop: '1px solid var(--color-outline-variant)', paddingTop: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', maxWidth: '70%' }}>

                              <span style={{ fontSize: '0.6rem', color: 'var(--color-on-surface-variant)', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>

                                 <span className="material-icons-outlined" style={{ fontSize: '0.6rem', verticalAlign: 'middle', marginRight: '2px' }}>campaign</span>

                                 {lead.campaignName || 'Direto'}

                              </span>

                              {lead.adName && lead.adName !== 'Direto/Z-API' && lead.adName !== 'Orgânico' && (

                                <span style={{ fontSize: '0.55rem', color: 'var(--color-on-surface-variant)', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>

                                  <span className="material-icons-outlined" style={{ fontSize: '0.55rem', verticalAlign: 'middle', marginRight: '2px' }}>ads_click</span>

                                  {lead.adName}

                                </span>

                              )}

                              <span style={{ fontSize: '0.5rem', color: 'var(--color-on-surface-variant)', fontWeight: '600', marginTop: '0.2rem' }}>

                                 {new Date(lead.createdAt).toLocaleDateString('pt-BR')} {new Date(lead.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}

                              </span>

                           </div>

                           {renderTempBadge(lead.temperature)}

                        </div>

                     </div>

                   ))}

                </div>

              </div>

            ))}

          </section>

        )}

      </div>



      {/* Filter Drawer Overlay */}

      {showFilters && (

        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1100, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setShowFilters(false)}>

          <div style={{ width: '350px', height: '100%', background: 'white', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.3s ease-out' }} onClick={e => e.stopPropagation()}>

             <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

             <div style={{ padding: '2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a' }}>Filtros Avançados</h3>

                <button onClick={() => setShowFilters(false)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}><span className="material-icons-outlined" style={{ fontSize: '1rem' }}>close</span></button>

             </div>

             

             <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>



                {/* Date Range Filter */}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                   <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Período de Entrada</span>

                   <div style={{ display: 'flex', gap: '0.5rem' }}>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>

                         <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: '700' }}>Início</span>

                         <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.8rem', width: '100%', outline: 'none' }} />

                      </div>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>

                         <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: '700' }}>Fim</span>

                         <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.8rem', width: '100%', outline: 'none' }} />

                      </div>

                   </div>

                </div>

                

                {/* Search Inputs */}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

                      <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Buscar Campanha</span>

                      <input type="text" placeholder="Nome da campanha..." value={campaignSearch} onChange={e => setCampaignSearch(e.target.value)} style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '0.85rem' }} />

                   </div>

                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

                      <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Buscar Anúncio</span>

                      <input type="text" placeholder="Nome do anúncio..." value={adSearch} onChange={e => setAdSearch(e.target.value)} style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '0.85rem' }} />

                   </div>

                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

                      <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Filtrar por Tag</span>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>

                          {['Todas', ...standardTags].map(t => (

                            <button 

                              key={t} 

                              onClick={() => setTagSearch(t === 'Todas' ? '' : t)} 

                              style={{ 

                                padding: '0.5rem 1rem', 

                                borderRadius: '2rem', 

                                border: (tagSearch === t || (t === 'Todas' && !tagSearch)) ? '2px solid #0f172a' : '1px solid #e2e8f0', 

                                background: (tagSearch === t || (t === 'Todas' && !tagSearch)) ? '#0f172a' : 'white', 

                                color: (tagSearch === t || (t === 'Todas' && !tagSearch)) ? 'white' : '#64748b', 

                                fontSize: '0.7rem', 

                                fontWeight: '700', 

                                cursor: 'pointer' 

                              }}

                            >

                              {t}

                            </button>

                          ))}

                       </div>

                   </div>

                </div>



                {/* Status Chips */}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>

                   <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Status do Funil</span>

                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>

                      {['Todos', ...statuses].map(s => (

                        <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '0.5rem 1rem', borderRadius: '2rem', border: statusFilter === s ? '2px solid #0f172a' : '1px solid #e2e8f0', background: statusFilter === s ? '#0f172a' : 'white', color: statusFilter === s ? 'white' : '#64748b', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>{s}</button>

                      ))}

                   </div>

                </div>



                {/* Platform */}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>

                   <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Canal de Origem</span>

                   <div style={{ display: 'flex', gap: '0.5rem' }}>

                      {['Todos', 'whatsapp', 'instagram'].map(p => (

                        <button key={p} onClick={() => setPlatformFilter(p)} style={{ flex: 1, padding: '0.6rem 0.2rem', borderRadius: '0.75rem', border: platformFilter === p ? '2px solid #0f172a' : '1px solid #e2e8f0', background: platformFilter === p ? '#f8fafc' : 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', transition: '0.2s', minWidth: 0 }}>

                           {p === 'Todos' && <span className="material-icons-outlined" style={{ fontSize: '1rem', color: '#0049db' }}>all_inclusive</span>}

                           {p === 'whatsapp' && <svg viewBox="0 0 24 24" width="14" height="14" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>}

                           {p === 'instagram' && <svg viewBox="0 0 24 24" width="14" height="14" fill="#cc2366"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>}

                           <span style={{ fontSize: '0.625rem', fontWeight: '900', color: platformFilter === p ? '#0f172a' : '#64748b' }}>{p === 'Todos' ? 'TODOS' : p.toUpperCase()}</span>

                        </button>

                      ))}

                   </div>

                </div>



                {/* Temp */}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>

                   <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Temperatura</span>

                   <div style={{ display: 'flex', gap: '0.5rem' }}>

                      {['Todos', 'Quente', 'Morno', 'Frio'].map(t => (

                        <button key={t} onClick={() => setTempFilter(t)} style={{ flex: 1, padding: '0.6rem', borderRadius: '0.75rem', border: 'none', background: tempFilter === t ? getTempColor(t) : '#f1f5f9', color: tempFilter === t ? 'white' : '#64748b', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}>{t}</button>

                      ))}

                   </div>

                </div>



             </div>



             <div style={{ padding: '2rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '1rem' }}>

                <button onClick={() => { setStatusFilter('Todos'); setPlatformFilter('Todos'); setTempFilter('Todos'); setCampaignSearch(''); setAdSearch(''); setTagSearch(''); setStartDate(''); setEndDate(''); }} style={{ flex: 1, padding: '1rem', borderRadius: '1rem', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: '800', cursor: 'pointer' }}>LIMPAR</button>

                <button onClick={() => setShowFilters(false)} style={{ flex: 1, padding: '1rem', borderRadius: '1rem', border: 'none', background: '#0f172a', color: 'white', fontWeight: '800', cursor: 'pointer' }}>APLICAR</button>

             </div>

          </div>

        </div>

      )}



      {selectedLead && (
        <div className="crm-modal-overlay" onClick={() => setSelectedLead(null)}>
          <div className="crm-modal-container" onClick={(e) => e.stopPropagation()}>

               <style>{`@keyframes modalFadeIn { from { opacity: 0; transform: scale(0.98) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>

               {/* Abas do Modal no Mobile */}
               <div className="crm-modal-mobile-tabs">
                 <button 
                   className={`crm-modal-tab-btn ${activeModalTab === 'chat' ? 'active' : ''}`}
                   onClick={() => setActiveModalTab('chat')}
                 >
                   Conversa
                 </button>
                 <button 
                   className={`crm-modal-tab-btn ${activeModalTab === 'info' ? 'active' : ''}`}
                   onClick={() => setActiveModalTab('info')}
                 >
                   Dados do Lead
                 </button>
               </div>

               {/* Coluna Esquerda: Detalhes e Inteligência */}
               <div className={`crm-modal-left ${activeModalTab === 'info' ? 'show-mobile' : 'hide-mobile'}`}>

                   <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>

                      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: selectedLead.platform === 'instagram' ? 'linear-gradient(45deg, #f09433 0%, #dc2743 100%)' : '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', overflow: 'hidden' }}>

                         {selectedLead.profilePic ? (

                            <img src={selectedLead.profilePic} alt={selectedLead.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                         ) : (

                            <span className="material-icons-outlined" style={{ fontSize: '2rem' }}>{selectedLead.platform === 'instagram' ? 'alternate_email' : 'call'}</span>

                         )}

                      </div>

                      <div>

                         <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--color-on-surface)' }}>{selectedLead.name}</h3>

                         <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', fontWeight: '700' }}>{selectedLead.platform === 'instagram' ? `@${selectedLead.instagramHandle || 'direct'}` : selectedLead.phone}</span>

                      </div>

                   </div>



                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                       <div>

                          <p style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Status do Funil</p>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-surface-container-high)', padding: '0.5rem 1rem', borderRadius: '1rem', border: '1px solid var(--color-outline-variant)' }}>

                             <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: getStatusColor(selectedLead.status) }}></div>

                             <select 
                                value={selectedLead.status}
                                onChange={(e) => {
                                  const newStatus = e.target.value;
                                  updateLeadStatus(selectedLead.id, newStatus);
                                  setSelectedLead(prev => ({ ...prev, status: newStatus }));
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--color-on-surface)',
                                  fontSize: '0.85rem',
                                  fontWeight: '800',
                                  outline: 'none',
                                  cursor: 'pointer',
                                  width: '100%',
                                  fontFamily: 'inherit'
                                }}
                              >
                                {statuses.map(s => (
                                  <option key={s} value={s} style={{ background: 'var(--color-surface-dim)', color: 'var(--color-on-surface)' }}>
                                    {s}
                                  </option>
                                ))}
                              </select>

                          </div>

                       </div>



                       <div>

                          <p style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Origem da Captura</p>

                          <div style={{ background: 'var(--color-surface-container-high)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--color-outline-variant)' }}>

                             <div style={{ marginBottom: '0.75rem' }}>

                                <span style={{ fontSize: '0.6rem', color: 'var(--color-on-surface-variant)', display: 'block' }}>Campanha</span>

                                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--color-on-surface)' }}>{selectedLead.campaignName || 'Tráfego Direto'}</span>

                             </div>

                             <div style={{ marginBottom: '0.75rem' }}>

                                <span style={{ fontSize: '0.6rem', color: 'var(--color-on-surface-variant)', display: 'block' }}>Anúncio</span>

                                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--color-on-surface)' }}>{selectedLead.adName || 'Orgânico'}</span>

                             </div>

                             <div>

                                <span style={{ fontSize: '0.6rem', color: 'var(--color-on-surface-variant)', display: 'block' }}>Conta de Anúncios</span>

                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-on-surface-variant)' }}>{selectedLead.adAccountName || '—'}</span>
                            </div>

                          </div>

                        </div>

                        {selectedLead.status === 'Venda Concluída' && (
                          <div style={{ marginTop: '1.5rem' }}>
                            <p style={{ fontSize: '0.65rem', fontWeight: '900', color: '#10B981', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Dados da Venda (PDV)</p>
                            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                               <div style={{ marginBottom: '0.75rem' }}>
                                  <span style={{ fontSize: '0.6rem', color: 'var(--color-on-surface-variant)', display: 'block' }}>Produto Adquirido</span>
                                  <span style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--color-on-surface)' }}>{selectedLead.productName || 'Produto não identificado'}</span>
                               </div>
                               <div>
                                  <span style={{ fontSize: '0.6rem', color: 'var(--color-on-surface-variant)', display: 'block' }}>Data da Conversão</span>
                                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--color-on-surface)' }}>
                                    {new Date(selectedLead.updatedAt).toLocaleDateString('pt-BR')} às {new Date(selectedLead.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                               </div>
                            </div>
                          </div>
                        )}

                        <div>

                           <p style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Categorização (Tags)</p>

                           <div style={{ background: 'var(--color-surface-container-high)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--color-outline-variant)' }}>

                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>

                                 {standardTags.map(tag => {

                                   const isActive = (selectedLead.tags || []).includes(tag);

                                   return (

                                     <button 

                                       key={tag} 

                                       onClick={() => {

                                          if (isActive) {

                                            removeTag(selectedLead.id, tag);

                                          } else {

                                            // Se for tag de tráfego, remove a oposta (exclusividade)

                                            if (tag === 'Tráfego Pago') removeTag(selectedLead.id, 'Tráfego Orgânico');

                                            if (tag === 'Tráfego Orgânico') removeTag(selectedLead.id, 'Tráfego Pago');

                                            addTag(selectedLead.id, tag);

                                          }

                                       }}

                                       style={{ 

                                         padding: '0.5rem 0.8rem', 

                                         borderRadius: '0.5rem', 

                                         fontSize: '0.65rem', 

                                         fontWeight: '800', 

                                         cursor: 'pointer',

                                         transition: '0.2s',

                                         border: '1px solid',

                                         background: isActive ? 'var(--color-primary)' : 'var(--color-surface)',

                                         color: isActive ? '#000000' : 'var(--color-on-surface-variant)',

                                         borderColor: isActive ? 'var(--color-primary)' : 'var(--color-outline-variant)'

                                       }}

                                     >

                                       {tag}

                                     </button>

                                   );

                                 })}
                              </div>
                           </div>
                        </div>

                        <div>
                           <p style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Inteligência de Venda</p>
                           <div style={{ background: 'var(--color-surface-container-high)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--color-outline-variant)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                                 <span className="material-icons-outlined" style={{ fontSize: '1.1rem', color: getTempColor(selectedLead.temperature) }}>thermostat</span>
                                 <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-on-surface)' }}>Lead {selectedLead.temperature}</span>
                              </div>
                              <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', lineHeight: '1.4', margin: 0 }}>
                                 O Jarvis recomenda: Este lead está{" "}{selectedLead.temperature.toLowerCase()}. {selectedLead.temperature === 'Frio' ? 'Envie uma oferta de reativação imediatamente.' : 'Mantenha o atendimento focado em fechar a venda hoje.'}
                              </p>
                           </div>
                        </div>
                   </div>

                   <div style={{ marginTop: 'auto', paddingTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                       <a 
                         href={selectedLead.platform === 'instagram' ? `https://instagram.com/direct/t/${selectedLead.phone}` : `https://wa.me/${selectedLead.phone ? selectedLead.phone.replace(/\D/g, '') : ''}`}
                         target="_blank"
                         rel="noreferrer"
                         style={{ textDecoration: 'none', width: '100%', padding: '1rem', borderRadius: '1rem', background: selectedLead.platform === 'instagram' ? 'linear-gradient(45deg, #f09433 0%, #dc2743 100%)' : '#25D366', color: 'white', fontWeight: '800', textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                       >
                          <span className="material-icons-outlined">chat</span>
                          CONTATAR AGORA
                       </a>
                       <button onClick={() => setSelectedLead(null)} style={{ width: '100%', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--color-outline)', background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)', fontWeight: '800', cursor: 'pointer' }}>FECHAR PAINEL</button>


                   </div>

               </div>



               {/* Coluna Direita: Histórico de Conversa (Chat) */}
               <div className={`crm-modal-right ${activeModalTab === 'chat' ? 'show-mobile' : 'hide-mobile'}`}>

                   <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--color-outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

                         <span className="material-icons-outlined" style={{ color: 'var(--color-primary)' }}>forum</span>

                         <h4 style={{ margin: 0, fontWeight: '900', color: 'var(--color-on-surface)', fontSize: '1rem' }}>HISTÓRICO DE CONVERSA</h4>

                      </div>

                      <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-on-surface-variant)', background: 'var(--color-surface-container-high)', padding: '0.4rem 0.8rem', borderRadius: '2rem' }}>

                         Sincronizado via {selectedLead.platform.toUpperCase()}

                      </div>

                   </div>



                   <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--color-surface-container-lowest)' }} className="chat-container">

                       {loadingMessages ? (

                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Carregando conversa...</div>

                       ) : messages.length === 0 ? (

                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '1rem' }}>

                             <span className="material-icons-outlined" style={{ fontSize: '3rem' }}>chat_bubble_outline</span>

                             <p style={{ fontWeight: '700' }}>Nenhuma mensagem registrada ainda.</p>

                          </div>

                       ) : (

                          messages.map((m, idx) => (

                             <div key={m.id || idx} style={{ 

                                display: 'flex', 

                                flexDirection: m.sender === 'lead' ? 'row' : 'row-reverse',

                                alignItems: 'flex-end',

                                gap: '0.75rem',

                                alignSelf: m.sender === 'lead' ? 'flex-start' : 'flex-end', 

                                maxWidth: '85%' 

                             }}>

                                {/* Avatar */}

                                <div style={{ 

                                   width: '32px', 

                                   height: '32px', 

                                   borderRadius: '10px', 

                                   overflow: 'hidden', 

                                   flexShrink: 0,

                                   background: m.sender === 'lead' ? 'var(--color-surface-container-high)' : 'var(--color-primary-glow)',

                                   display: 'flex',

                                   alignItems: 'center',

                                   justifyContent: 'center',

                                   boxShadow: '0 4px 10px rgba(0,0,0,0.05)'

                                }}>

                                   {m.sender === 'lead' ? (

                                      selectedLead.profilePic ? (

                                         <img src={selectedLead.profilePic} alt="Lead" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                                      ) : (

                                         <span className="material-icons-outlined" style={{ fontSize: '1.2rem', color: '#64748b' }}>person</span>

                                      )

                                   ) : (

                                       companyProfile?.logoUrl ? (

                                         <img src={companyProfile.logoUrl} alt="Agent" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                                      ) : (

                                         <span className="material-icons-outlined" style={{ fontSize: '1.2rem', color: 'white' }}>storefront</span>

                                      )

                                   )}

                                </div>



                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender === 'lead' ? 'flex-start' : 'flex-end' }}>

                                   <div style={{ 

                                      padding: '0.85rem 1.25rem', 

                                      borderRadius: m.sender === 'lead' ? '1.25rem 1.25rem 1.25rem 0' : '1.25rem 1.25rem 0 1.25rem', 

                                      background: m.sender === 'lead' ? 'var(--color-surface-container-highest)' : 'var(--color-primary-container)', 

                                      color: m.sender === 'lead' ? 'var(--color-on-surface)' : 'var(--color-primary)',

                                      border: m.sender === 'lead' ? '1px solid var(--color-outline-variant)' : '1px solid rgba(0, 245, 255, 0.25)',

                                      fontSize: '0.85rem',

                                      fontWeight: '500',

                                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',

                                      lineHeight: '1.5'

                                   }}>

                                       {m.content.startsWith('MEDIA:') ? (

                                         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

                                           {m.content.includes(':IMAGE:') && (

                                             <img src={m.content.split(':IMAGE:')[1]} alt="Mídia" style={{ maxWidth: '100%', borderRadius: '0.5rem' }} />

                                           )}

                                           {m.content.includes(':AUDIO:') && (

                                             <audio controls src={m.content.split(':AUDIO:')[1].includes('ID:') ? `${API_URL}/api/media/${m.content.split('ID:')[1]}` : m.content.split(':AUDIO:')[1]} style={{ height: '32px', width: '220px' }} />

                                           )}

                                         </div>

                                       ) : (

                                         m.content

                                       )}

                                   </div>

                                   <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '0.4rem', fontWeight: '700' }}>

                                      {m.sender === 'lead' ? selectedLead.name.split(' ')[0] : 'Você'} • {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}

                                   </span>

                                </div>

                             </div>

                          ))

                       )}

                   </div>



                   <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--color-outline-variant)', background: 'var(--color-surface-container-low)' }}>

                      <div style={{ display: 'flex', gap: '1rem' }}>

                         <input 

                           type="text" 

                           placeholder="Digite sua resposta aqui..." 

                           value={newMessage}

                           onChange={(e) => setNewMessage(e.target.value)}

                           onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}

                           style={{ flex: 1, padding: '1rem', borderRadius: '1rem', border: '1px solid var(--color-outline)', background: 'var(--color-surface)', color: 'var(--color-on-surface)', fontSize: '0.85rem' }} 

                         />

                         <button 

                           onClick={handleSendMessage}

                           disabled={sending || !newMessage.trim()}

                           style={{ 

                             background: 'var(--color-primary)', color: 'black', border: 'none', padding: '0 2rem', borderRadius: '1rem', 

                             fontWeight: '800', cursor: (sending || !newMessage.trim()) ? 'not-allowed' : 'pointer', 

                             opacity: (sending || !newMessage.trim()) ? 0.6 : 1,

                             transition: '0.3s'

                           }}

                         >

                           {sending ? '...' : 'ENVIAR'}

                         </button>

                      </div>

                   </div>

               </div>

            </div>

          </div>

      )}



      <style>{`

        .kanban-scroll::-webkit-scrollbar { height: 8px; } 

        .kanban-scroll::-webkit-scrollbar-track { background: #f1f5f9; } 

        .kanban-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; } 

        .hide-scrollbar::-webkit-scrollbar { display: none; } 

        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        

        @keyframes pulse-ping {

          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.7); }

          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(14, 165, 233, 0); }

          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(14, 165, 233, 0); }

        }

        .pulse-ping {

          animation: pulse-ping 2s infinite;

        }

      `}</style>

    </main>
  );
}

export default CRM;

