import React, { useState, useEffect } from 'react';
import { API_URL } from '../api/config';
import MetricCard from '../components/MetricCard';
import InsightCard from '../components/InsightCard';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ptBR from 'date-fns/locale/pt-BR';

// Registra idioma em PT-BR para o calendário
registerLocale('pt-BR', ptBR);

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState('vendas');
  const [customTemplates, setCustomTemplates] = useState([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const [selectedMetricIds, setSelectedMetricIds] = useState([]);
  const [selectedFunnelIds, setSelectedFunnelIds] = useState([]);

  const [selectedAdAccount, setSelectedAdAccount] = useState('todas');
  const [periodo, setPeriodo] = useState('hoje');
  const [dataInicio, setDataInicio] = useState(null);
  const [dataFim, setDataFim] = useState(null);

  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [liveInsightText, setLiveInsightText] = useState('');

  // Buscar Templates Customizados
  const fetchCustomTemplates = () => {
    fetch(`${API_URL}/api/custom-templates`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCustomTemplates(data);
        } else {
          setCustomTemplates([]);
        }
      })
      .catch(err => {
        console.error('Erro ao buscar templates customizados', err);
        setCustomTemplates([]);
      });
  };

  useEffect(() => {
    fetchCustomTemplates();
  }, []);

  useEffect(() => {
    // Se for personalizado, só busca se tiver as duas datas (pra evitar erro)
    if (periodo === 'personalizado' && (!dataInicio || !dataFim)) return;

    setLoading(true);
    let url = `${API_URL}/api/dashboard?actId=${selectedAdAccount}&periodo=${periodo}`;
    
    if (periodo === 'personalizado' && dataInicio && dataFim) {
      url += `&dateStart=${dataInicio.toISOString()}&dateEnd=${dataFim.toISOString()}`;
    }
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setDashboardData(data);
          
          setSelectedMetricIds(prev => {
            if(prev.length === 0 && data.metricsTemplates && data.metricsTemplates['vendas'] && Array.isArray(data.metricsTemplates['vendas'])) {
              return data.metricsTemplates['vendas'].map(m => m.id);
            }
            return prev;
          });
          
          setSelectedFunnelIds(prev => {
            if(prev.length === 0 && data.funnelsTemplates && data.funnelsTemplates['vendas'] && Array.isArray(data.funnelsTemplates['vendas'])) {
              return data.funnelsTemplates['vendas'].map(f => f.id);
            }
            return prev;
          });
        } else {
          console.error('Erro nos dados do dashboard:', data?.error);
          setDashboardData(null);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao chamar dashboard', err);
        setLoading(false);
      });
  }, [selectedAdAccount, periodo, dataInicio, dataFim]);

  const changeTemplate = (tplKey) => {
    if (!dashboardData) return;

    // Tenta encontrar nos templates nativos
    const nativeMetrics = dashboardData.metricsTemplates?.[tplKey];
    const nativeFunnels = dashboardData.funnelsTemplates?.[tplKey];

    if (nativeMetrics) {
      setActiveTemplate(tplKey);
      setSelectedMetricIds(nativeMetrics.map(m => m.id));
      setSelectedFunnelIds(nativeFunnels ? nativeFunnels.map(f => f.id) : []);
    } else {
      // Tenta encontrar nos templates customizados
      const custom = customTemplates.find(t => t.id === tplKey);
      if (custom) {
        setActiveTemplate(tplKey);
        setSelectedMetricIds(custom.metricIds || []);
        setSelectedFunnelIds(custom.funnelIds || []);
      }
    }
  };

  const saveCustomTemplate = () => {
    if (!newTemplateName.trim()) {
      alert("Por favor, dê um nome ao seu template.");
      return;
    }
    
    fetch(`${API_URL}/api/custom-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newTemplateName,
        metricIds: selectedMetricIds,
        funnelIds: selectedFunnelIds
      })
    })
    .then(res => res.json())
    .then(newTpl => {
      setCustomTemplates([newTpl, ...customTemplates]);
      setActiveTemplate(newTpl.id);
      setIsSavingTemplate(false);
      setNewTemplateName('');
    })
    .catch(err => console.error('Erro ao salvar template', err));
  };

  const deleteCustomTemplate = (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Tem certeza que deseja excluir este template?")) return;

    fetch(`${API_URL}/api/custom-templates/${id}`, {
      method: 'DELETE'
    })
    .then(() => {
      setCustomTemplates(customTemplates.filter(t => t.id !== id));
      if (activeTemplate === id) setActiveTemplate('vendas');
    })
    .catch(err => console.error('Erro ao excluir template', err));
  };

  const toggleMetric = (id) => {
    if(selectedMetricIds.includes(id)) {
      setSelectedMetricIds(selectedMetricIds.filter(selected => selected !== id));
    } else {
      setSelectedMetricIds([...selectedMetricIds, id]);
    }
    // Se mudar manualmente, volta pro modo "Personalizado" para permitir salvar
    if (activeTemplate !== 'personalizado' && !customTemplates.some(t => t.id === activeTemplate)) {
      setActiveTemplate('personalizado');
    }
  };

  const toggleFunnel = (id) => {
    if(selectedFunnelIds.includes(id)) {
      setSelectedFunnelIds(selectedFunnelIds.filter(selected => selected !== id));
    } else {
      setSelectedFunnelIds([...selectedFunnelIds, id]);
    }
    // Se mudar manualmente, volta pro modo "Personalizado"
    if (activeTemplate !== 'personalizado' && !customTemplates.some(t => t.id === activeTemplate)) {
      setActiveTemplate('personalizado');
    }
  };

  const moveFunnelItem = (index, direction) => {
    const newOrder = [...selectedFunnelIds];
    const item = newOrder.splice(index, 1)[0];
    newOrder.splice(index + direction, 0, item);
    setSelectedFunnelIds(newOrder);
    
    if (activeTemplate !== 'personalizado' && !customTemplates.some(t => t.id === activeTemplate)) {
      setActiveTemplate('personalizado');
    }
  };

  if(loading || !dashboardData) {
    return <main className="main-content"><div style={{padding: '2rem', fontWeight: '800', color: 'var(--color-primary)'}}>Carregando Dados Otimizados...</div></main>;
  }

  const { metricsTemplates, funnelsTemplates, aiInsights, availableAccounts, metaStatus, metaErrorMessage } = dashboardData;
  
  // Mapear métricas reais baseadas nos IDs selecionados
  // Precisamos de uma lista mestre de todas as métricas disponíveis
  const masterMetrics = metricsTemplates?.personalizado || [];
  const visibleCards = masterMetrics.filter(m => selectedMetricIds.includes(m.id));
  
  const masterFunnels = funnelsTemplates?.personalizado || [];
  // Ordenar masterFunnels conforme a ordem de selectedFunnelIds para o gráfico
  const visibleFunnelData = selectedFunnelIds
    .map(id => masterFunnels.find(f => f.id === id))
    .filter(Boolean);

  const templateOptions = [
    { key: 'reconhecimento', label: 'Reconhecimento', icon: 'campaign', isNative: true },
    { key: 'trafego', label: 'Tráfego', icon: 'ads_click', isNative: true },
    { key: 'engajamento', label: 'Engajamento', icon: 'thumb_up', isNative: true },
    { key: 'leads', label: 'Leads', icon: 'person_add', isNative: true },
    { key: 'vendas', label: 'Vendas', icon: 'shopping_cart', isNative: true },
    ... (Array.isArray(customTemplates) ? customTemplates.map(t => ({ key: t.id, label: t.name, icon: t.icon || 'auto_awesome', isNative: false })) : []),
    { key: 'personalizado', label: 'Personalizado', icon: 'tune', isNative: true }
  ];

  return (
    <main className="main-content" style={{ position: 'relative' }}>
      {/* Alerta de Erro de Conexão Meta */}
      {metaStatus === 'error' && (
        <div style={{
          background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '0.75rem',
          padding: '1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', color: '#991b1b'
        }}>
          <span className="material-icons-outlined" style={{ color: '#ef4444' }}>report_problem</span>
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block' }}>Conexão com a Meta Interrompida</strong>
            <span style={{ fontSize: '0.85rem' }}>{metaErrorMessage || 'O token pode ter expirado ou a API está offline.'}</span>
          </div>
          <button 
            onClick={() => window.location.href = '/settings'}
            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}
          >
            Reconectar
          </button>
        </div>
      )}

      {/* Filters Bar Superior */}
      <div className="filters-bar" style={{ padding: '1.5rem', background: 'var(--color-surface-container-lowest)', borderRadius: '1rem', border: '1px solid var(--color-surface-container-low)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <span className="material-icons-outlined" style={{ color: 'var(--color-primary)' }}>date_range</span>
          <select className="filter-select" value={periodo} onChange={(e) => setPeriodo(e.target.value)} style={{ border: 'none', background: 'var(--color-surface-container-low)', padding: '0.6rem 1rem', borderRadius: '0.5rem', fontWeight: '600', outline: 'none', cursor: 'pointer' }}>
            <option value="hoje">Hoje</option>
            <option value="7dias">Últimos 7 dias</option>
            <option value="mes">Últimos 30 dias</option>
            <option value="maximo">Máximo</option>
            <option value="personalizado">Personalizado</option>
          </select>
          
          {periodo === 'personalizado' && (
             <div style={{ 
               display: 'flex', alignItems: 'center', gap: '0.6rem', 
               background: 'var(--color-surface-container-lowest)', padding: '0.3rem', 
               borderRadius: '0.5rem', border: '1px solid #cbd5e1',
               animation: 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
               boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
             }}>
               <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: '0.35rem', padding: '0.3rem 0.5rem', border: '1px solid transparent', transition: 'border-color 0.2s', cursor: 'pointer' }} onMouseOver={e=>e.currentTarget.style.borderColor='#0ea5e9'} onMouseOut={e=>e.currentTarget.style.borderColor='transparent'}>
                 <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: '900', marginRight: '0.5rem', borderRight: '1px solid #cbd5e1', paddingRight: '0.5rem', letterSpacing: '0.5px' }}>De</span>
                 <DatePicker 
                   selected={dataInicio} 
                   onChange={(date) => setDataInicio(date)} 
                   selectsStart 
                   startDate={dataInicio} 
                   endDate={dataFim} 
                   locale="pt-BR"
                   dateFormat="dd/MM/yyyy" 
                   placeholderText="Selecionar"
                   className="custom-datepicker-input" 
                 />
               </div>
               
               <span className="material-icons-outlined" style={{ color: '#94a3b8', fontSize: '1rem' }}>arrow_forward</span>
               
               <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: '0.35rem', padding: '0.3rem 0.5rem', border: '1px solid transparent', transition: 'border-color 0.2s', cursor: 'pointer' }} onMouseOver={e=>e.currentTarget.style.borderColor='#0ea5e9'} onMouseOut={e=>e.currentTarget.style.borderColor='transparent'}>
                 <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: '900', marginRight: '0.5rem', borderRight: '1px solid #cbd5e1', paddingRight: '0.5rem', letterSpacing: '0.5px' }}>Até</span>
                 <DatePicker 
                   selected={dataFim} 
                   onChange={(date) => setDataFim(date)} 
                   selectsEnd 
                   startDate={dataInicio} 
                   endDate={dataFim} 
                   minDate={dataInicio}
                   locale="pt-BR"
                   dateFormat="dd/MM/yyyy" 
                   placeholderText="Selecionar"
                   className="custom-datepicker-input" 
                 />
               </div>
             </div>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
           <span className="material-icons-outlined" style={{ color: 'var(--color-primary)' }}>hub</span>
           <select className="filter-select" defaultValue="meta" style={{ border: 'none', background: 'var(--color-surface-container-low)', padding: '0.6rem 1rem', borderRadius: '0.5rem', fontWeight: '600' }}>
            <option value="meta">Meta Ads</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <span className="material-icons-outlined" style={{ color: 'var(--color-primary)' }}>account_box</span>
          <select 
            className="filter-select" 
            value={selectedAdAccount} 
            onChange={(e) => setSelectedAdAccount(e.target.value)} 
            style={{ border: 'none', background: 'var(--color-surface-container-low)', padding: '0.6rem 1rem', borderRadius: '0.5rem', fontWeight: '700', outline: 'none', cursor: 'pointer', maxWidth: '200px', textOverflow: 'ellipsis' }}
          >
            <option value="todas">Todas as Contas (BM)</option>
            {availableAccounts && availableAccounts.map(account => (
              <option key={account.actId} value={account.actId}>
                {account.name} {account.status === 'ACTIVE' ? '' : '(Inativa)'}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-btn-container">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              padding: '0.8rem 1.5rem', borderRadius: '2rem', 
              background: '#0EA5E9', color: 'white', border: 'none', 
              fontWeight: '800', cursor: 'pointer', transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.25)'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <span className="material-icons-outlined">filter_list</span>
            Filtrar Visão
          </button>
        </div>
      </div>

      <section className="dashboard-grid">
        {visibleCards.length === 0 && (
          <div style={{ gridColumn: 'span 4', padding: '3rem', textAlign: 'center', background: 'var(--color-surface-container-lowest)', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
            <span className="material-icons-outlined" style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: '1rem' }}>visibility_off</span>
            <h4 style={{ color: '#475569' }}>Nenhuma métrica selecionada</h4>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Ative métricas na aba de visão à direita.</p>
          </div>
        )}

        {visibleCards.map(m => (
          <MetricCard 
            key={m.id}
            title={m.label} 
            prefix={m.prefix} 
            value={m.value} 
            subtitle={m.id === 'faturamentoPDV' ? `R$ ${(dashboardData.rawSummary.faturamentoTrafegoPago || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})} Tráfego Pago` : null}
            trend="—" 
            trendColor="var(--color-on-surface-variant)"
          />
        ))}

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h4>Funil de Retenção ({templateOptions.find(t => t.key === activeTemplate)?.label})</h4>
          <div style={{ width: '100%', height: '240px', marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              {visibleFunnelData.length > 0 ? (
                <BarChart data={visibleFunnelData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" dataKey="label" width={110} 
                    axisLine={false} tickLine={false}
                    tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 12, fontWeight: '700' }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-ambient)' }}
                    formatter={(value) => [value.toLocaleString('pt-BR'), "Transições do Funil"]} 
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
                    {visibleFunnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#4ADE80" />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                  Ative as etapas do funil na aba de filtros.
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Sidebar UI/UX Exclusiva */}
      <div className="dashboard-sidebar" style={{ right: isSidebarOpen ? 0 : '-100%' }}>
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2rem', borderBottom: '1px solid var(--color-surface-container-low)' }}>
          <h3 style={{ margin: 0, fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.2rem' }}>
            <span className="material-icons-outlined" style={{ color: '#0EA5E9' }}>view_quilt</span> 
            Construtor de Visão
          </h3>
          <button onClick={() => setIsSidebarOpen(false)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: '0.2s' }}>
            <span className="material-icons-outlined" style={{ fontSize: '1.2rem' }}>close</span>
          </button>
        </div>

        {/* Scroll Ctn */}
        <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
          
          <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '1rem', fontWeight: '900', letterSpacing: '0.5px' }}>
            Objetivos de Campanha (Meta)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '2.5rem' }}>
             {templateOptions.map(t => (
               <div key={t.key} style={{ position: 'relative' }}>
                 <button 
                   onClick={() => changeTemplate(t.key)}
                   style={{ 
                     display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', 
                     padding: '1rem 0.5rem', borderRadius: '0.75rem', 
                     background: activeTemplate === t.key ? '#F0F9FF' : '#f8fafc', 
                     color: activeTemplate === t.key ? '#0EA5E9' : '#64748b', 
                     cursor: 'pointer', fontWeight: '800', transition: '0.2s', 
                     border: '2px solid', borderColor: activeTemplate === t.key ? '#0EA5E9' : 'transparent',
                     width: '100%',
                     gridColumn: t.key === 'personalizado' ? 'span 2' : 'span 1'
                   }}
                 >
                   <span className="material-icons-outlined" style={{ fontSize: '1.5rem' }}>{t.icon}</span>
                   <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{t.label}</span>
                 </button>
                 
                 {!t.isNative && (
                   <button 
                     onClick={(e) => deleteCustomTemplate(e, t.key)}
                     className="delete-tpl-btn"
                     style={{
                       position: 'absolute', top: '-5px', right: '-5px',
                       background: '#ef4444', color: 'white', border: 'none',
                       borderRadius: '50%', width: '22px', height: '22px',
                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                       cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                       opacity: 0, transition: '0.2s'
                     }}
                   >
                     <span className="material-icons-outlined" style={{ fontSize: '0.9rem' }}>delete</span>
                   </button>
                 )}
                 <style>{`
                    div:hover > .delete-tpl-btn { opacity: 1; }
                 `}</style>
               </div>
             ))}
          </div>

          {activeTemplate === 'personalizado' && (
            <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#F0F9FF', borderRadius: '1rem', border: '1.5px dashed #0EA5E9' }}>
               {!isSavingTemplate ? (
                  <button 
                    onClick={() => setIsSavingTemplate(true)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', background: '#0EA5E9', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <span className="material-icons-outlined">save</span>
                    Salvar como Template
                  </button>
               ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <input 
                      type="text" 
                      placeholder="Nome do Template (ex: ROAS Alto)" 
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      style={{ padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #0EA5E9', outline: 'none', fontWeight: '700' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={saveCustomTemplate} style={{ flex: 1, padding: '0.6rem', borderRadius: '0.4rem', background: '#0EA5E9', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer' }}>Confirmar</button>
                      <button onClick={() => setIsSavingTemplate(false)} style={{ flex: 1, padding: '0.6rem', borderRadius: '0.4rem', background: '#f1f5f9', color: '#64748b', border: 'none', fontWeight: '800', cursor: 'pointer' }}>Cancelar</button>
                    </div>
                  </div>
               )}
            </div>
          )}

          {(activeTemplate !== 'personalizado' && !customTemplates.some(t => t.id === activeTemplate)) ? (
            <div style={{ background: '#f8fafc', borderLeft: '4px solid #0ea5e9', padding: '1rem', borderRadius: '0 0.5rem 0.5rem 0', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
                <span style={{ fontWeight: '800', display: 'block', marginBottom: '0.3rem', color: '#0f172a' }}>Predefinição Ativa</span>
                Nossos sistemas de inteligência já organizaram as métricas e a hierarquia do funil baseados na operação de <b>{templateOptions.find(t=>t.key===activeTemplate)?.label || activeTemplate}</b> na tela principal pra você.
              </p>
            </div>
          ) : (
            <>
              <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '1rem', fontWeight: '900', letterSpacing: '0.5px' }}>
                Selecionar Metricas Analíticas
              </h4>
              <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b' }}>MÉTRICAS DA META</span>
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <span onClick={() => setSelectedMetricIds(dashboardData.metricsTemplates?.personalizado?.map(m => m.id) || [])} style={{ fontSize: '0.7rem', color: '#8b5cf6', cursor: 'pointer', fontWeight: '900', textTransform: 'uppercase' }}>Tudo</span>
                    <span onClick={() => setSelectedMetricIds([])} style={{ fontSize: '0.7rem', color: '#ef4444', cursor: 'pointer', fontWeight: '900', textTransform: 'uppercase' }}>Vazio</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {(dashboardData.metricsTemplates?.personalizado || []).map(metric => (
                    <label key={`metric-${metric.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedMetricIds.includes(metric.id)}
                        onChange={() => toggleMetric(metric.id)}
                        style={{ accentColor: '#8b5cf6', width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: '700' }}>{metric.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '1rem', fontWeight: '900', letterSpacing: '0.5px' }}>
                Montar Gráfico de Etapas (Funil)
              </h4>
              <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b' }}>ORDEM DO FUNIL</span>
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <span onClick={() => setSelectedFunnelIds(dashboardData.funnelsTemplates?.personalizado?.map(f => f.id) || [])} style={{ fontSize: '0.7rem', color: '#8b5cf6', cursor: 'pointer', fontWeight: '900', textTransform: 'uppercase' }}>Todas</span>
                    <span onClick={() => setSelectedFunnelIds([])} style={{ fontSize: '0.7rem', color: '#ef4444', cursor: 'pointer', fontWeight: '900', textTransform: 'uppercase' }}>Vazia</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {/* Etapas Selecionadas (Com Ordenação) */}
                  {selectedFunnelIds.map((id, idx) => {
                    const funnel = (dashboardData.funnelsTemplates?.personalizado || []).find(f => f.id === id);
                    if (!funnel) return null;
                    return (
                      <div key={`selected-funnel-${id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.5rem', background: 'white', borderRadius: '0.4rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <button 
                            disabled={idx === 0}
                            onClick={() => moveFunnelItem(idx, -1)}
                            style={{ padding: 0, background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#e2e8f0' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>expand_less</span>
                          </button>
                          <button 
                            disabled={idx === selectedFunnelIds.length - 1}
                            onClick={() => moveFunnelItem(idx, 1)}
                            style={{ padding: 0, background: 'none', border: 'none', cursor: idx === selectedFunnelIds.length - 1 ? 'default' : 'pointer', color: idx === selectedFunnelIds.length - 1 ? '#e2e8f0' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>expand_more</span>
                          </button>
                        </div>
                        
                        <input 
                          type="checkbox" 
                          checked={true}
                          onChange={() => toggleFunnel(id)}
                          style={{ accentColor: '#8b5cf6', width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '800', flex: 1 }}>{funnel.label}</span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '900' }}>#{idx + 1}</span>
                      </div>
                    );
                  })}

                  {/* Etapas Não Selecionadas */}
                  {(dashboardData.funnelsTemplates?.personalizado || [])
                    .filter(f => !selectedFunnelIds.includes(f.id))
                    .map(funnel => (
                      <label key={`unselected-funnel-${funnel.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', padding: '0.5rem 0.5rem 0.5rem 2.4rem' }}>
                        <input 
                          type="checkbox" 
                          checked={false}
                          onChange={() => toggleFunnel(funnel.id)}
                          style={{ accentColor: '#8b5cf6', width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>{funnel.label}</span>
                      </label>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Rodapé da Sidebar */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-surface-container-low)', background: 'var(--color-surface-container-lowest)' }}>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            style={{ width: '100%', padding: '1rem', borderRadius: '0.75rem', background: '#0F172A', color: 'white', fontWeight: '800', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            Aplicar Visão
            <span className="material-icons-outlined">arrow_forward</span>
          </button>
        </div>

      </div>
      
      {/* Overlay Escurecido */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(3px)', zIndex: 999 }}
        />
      )}

    </main>
  );
}

// Injeção de Estilos para sobrescrever o CSS do React-Datepicker e deixá-lo UI Premium
const styleTag = document.createElement('style');
styleTag.innerHTML = `
  .react-datepicker {
    font-family: inherit !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 1rem !important;
    box-shadow: 0 10px 40px -10px rgba(0,0,0,0.15) !important;
    background: #ffffff !important;
    overflow: hidden;
  }
  .react-datepicker__header {
    background: #f8fafc !important;
    border-bottom: 1px solid #f1f5f9 !important;
    border-radius: 1rem 1rem 0 0 !important;
    padding: 1rem 0 0.5rem !important;
  }
  .react-datepicker__current-month {
    color: #0f172a !important;
    font-weight: 900 !important;
    font-size: 1rem !important;
    margin-bottom: 0.5rem;
  }
  .react-datepicker__day-name {
    color: #64748b !important;
    font-weight: 800 !important;
    width: 2.2rem !important;
    text-transform: uppercase;
    font-size: 0.75rem;
  }
  .react-datepicker__day {
    width: 2.2rem !important;
    line-height: 2.2rem !important;
    color: #334155 !important;
    font-weight: 700 !important;
    border-radius: 50% !important;
    margin: 0.15rem !important;
    transition: 0.2s !important;
  }
  .react-datepicker__day:hover {
    background: #e0f2fe !important;
    color: #0ea5e9 !important;
  }
  .react-datepicker__day--selected, .react-datepicker__day--in-range, .react-datepicker__day--in-selecting-range {
    background: #0ea5e9 !important;
    color: white !important;
    font-weight: 800 !important;
    box-shadow: 0 4px 10px rgba(14, 165, 233, 0.4);
  }
  .react-datepicker__day--keyboard-selected {
    background: #bae6fd !important;
    color: #0369a1 !important;
  }
  .react-datepicker-popper[data-placement^="bottom"] .react-datepicker__triangle {
    fill: #f8fafc !important;
    color: #f8fafc !important;
  }
  .custom-datepicker-input {
    border: none !important;
    background: transparent !important;
    outline: none !important;
    font-weight: 800 !important;
    color: #0f172a !important;
    cursor: pointer !important;
    font-size: 0.85rem !important;
    font-family: inherit !important;
    width: 80px !important;
    padding: 0 !important;
    text-align: center !important;
  }
  .custom-datepicker-input::placeholder {
    color: #94a3b8 !important;
    font-weight: 600;
  }
`;
document.head.appendChild(styleTag);

export default Dashboard;
