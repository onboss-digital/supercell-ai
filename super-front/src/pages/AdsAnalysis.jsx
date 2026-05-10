import React, { useState, useEffect } from 'react';
import { API_URL } from '../api/config';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ptBR from 'date-fns/locale/pt-BR';
registerLocale('pt-BR', ptBR);

function AdsAnalysis() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [campaignsData, setCampaignsData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [periodo, setPeriodo] = useState('hoje');
  const [dataInicio, setDataInicio] = useState(null);
  const [dataFim, setDataFim] = useState(null);
  const [triggerFetch, setTriggerFetch] = useState(0);

  useEffect(() => {
    // Se for personalizado e não clicou em aplicar ainda, não busca
    if (periodo === 'personalizado' && triggerFetch === 0) return;

    setLoading(true);
    let url = `${API_URL}/api/campaigns?periodo=${periodo}`;
    
    if (periodo === 'personalizado' && dataInicio && dataFim) {
      url += `&dateStart=${dataInicio.toISOString()}&dateEnd=${dataFim.toISOString()}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) {
          setCampaignsData(data);
        } else {
          setCampaignsData([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro buscando campanhas', err);
        setLoading(false);
      });
  }, [periodo, triggerFetch]);

  const displayedCampaigns = (campaignsData || []).filter(camp => {
    const matchStatus = filterStatus === 'all' || camp.status === filterStatus;
    const matchSearch = camp.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const openFacebookCampaign = (campaignId) => {
    window.open(`https://adsmanager.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=${campaignId}`, '_blank');
  };

  if(loading) {
    return <main className="main-content"><div style={{padding: '2rem', fontWeight: '800', color: 'var(--color-primary)'}}>Sincronizando Campanhas Direto do Servidor da Meta...</div></main>;
  }

  return (
    <main className="main-content">
      <div>

        {/* Filters & Date Picker */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'var(--glass-bg)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', border: 'var(--glass-border)', backdropFilter: 'var(--glass-blur)' }}>
            <span className="material-icons-outlined" style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }}>date_range</span>
            <select 
              value={periodo} 
              onChange={(e) => setPeriodo(e.target.value)} 
              style={{ border: 'none', background: 'transparent', color: 'var(--color-on-surface)', fontWeight: '800', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase' }}
            >
              <option value="hoje">Hoje</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="mes">Últimos 30 dias</option>
              <option value="maximo">Máximo</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>

          {periodo === 'personalizado' && (
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'var(--color-surface-dim)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-primary)', position: 'relative', zIndex: 9999, boxShadow: '0 0 15px var(--color-primary-glow)' }}>
                <DatePicker 
                  selected={dataInicio} onChange={(date) => { setDataInicio(date); setTriggerFetch(0); }} 
                  selectsStart startDate={dataInicio} endDate={dataFim} 
                  locale="pt-BR" dateFormat="dd/MM/yyyy" placeholderText="Início"
                  className="custom-datepicker-input" style={{ width: '90px' }}
                  popperPlacement="bottom-start"
                />
                <span style={{ color: 'var(--color-primary)' }}>→</span>
                <DatePicker 
                  selected={dataFim} onChange={(date) => { setDataFim(date); setTriggerFetch(0); }} 
                  selectsEnd startDate={dataInicio} endDate={dataFim} minDate={dataInicio}
                  locale="pt-BR" dateFormat="dd/MM/yyyy" placeholderText="Fim"
                  className="custom-datepicker-input" style={{ width: '90px' }}
                  popperPlacement="bottom-start"
                />
                <button 
                  onClick={() => setTriggerFetch(prev => prev + 1)}
                  style={{ background: 'var(--color-primary)', color: 'black', border: 'none', padding: '0.4rem 1rem', borderRadius: 'var(--radius-sm)', fontWeight: '900', cursor: 'pointer', fontSize: '0.7rem' }}
                >
                  APLICAR
                </button>
             </div>
          )}

          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
             <span className="material-icons-outlined" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-primary)', fontSize: '1.1rem', opacity: 0.7 }}>search</span>
             <input 
               type="text" 
               placeholder="PESQUISAR CAMPANHA..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               style={{ 
                 width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', 
                 borderRadius: 'var(--radius-sm)', border: 'var(--glass-border)', 
                 background: 'var(--glass-bg)', color: 'var(--color-on-surface)', 
                 fontSize: '0.75rem', outline: 'none', fontFamily: 'var(--font-mono)',
                 fontWeight: '600', letterSpacing: '0.05em'
               }}
             />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ 
              padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-sm)', 
              border: 'var(--glass-border)', background: 'var(--glass-bg)', 
              color: 'var(--color-on-surface)', cursor: 'pointer', outline: 'none',
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: '800',
              textTransform: 'uppercase'
            }}
          >
            <option value="all">STATUS: TODOS</option>
            <option value="active">STATUS: ATIVOS</option>
            <option value="paused">STATUS: PAUSADOS</option>
          </select>
        </div>

        {/* Campaign Cards List */}
        <div className="ads-container" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '1.5rem',
          filter: periodo === 'personalizado' && triggerFetch === 0 ? 'blur(8px)' : 'none',
          transition: '0.3s'
        }}>
          {displayedCampaigns.length > 0 ? displayedCampaigns.map(item => (
            <div 
              key={item.id} 
              className="card" 
              onClick={() => openFacebookCampaign(item.id)}
              style={{ 
                padding: '1.5rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem', 
                background: 'var(--color-surface)',
                border: '1px solid var(--color-outline)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
                borderRadius: 'var(--radius-sm)',
                zIndex: 1
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,245,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-ambient)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <span style={{ 
                    fontSize: '0.6rem', 
                    fontWeight: '900', 
                    padding: '2px 8px', 
                    borderRadius: '2px', 
                    background: item.status === 'active' ? 'rgba(0, 245, 255, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                    color: item.status === 'active' ? 'var(--color-primary)' : 'var(--color-accent)',
                    border: '1px solid currentColor',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {item.status === 'active' ? 'ATIVO' : (item.status === 'paused' ? 'PAUSADO' : item.status.toUpperCase())}
                  </span>
                </div>
                <span className="material-icons-outlined" style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }}>open_in_new</span>
              </div>
              
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--color-on-surface)', margin: '0.25rem 0', lineHeight: '1.2', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{item.name}</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', rowGap: '0.75rem' }}>
                <div>
                  <p style={{ fontSize: '0.55rem', color: 'var(--color-on-surface-variant)', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Resultados</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--color-secondary)' }}>{item.results}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.55rem', color: 'var(--color-on-surface-variant)', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Custo / Res</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--color-on-surface)' }}>R$ {item.costPerResult.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.55rem', color: 'var(--color-on-surface-variant)', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Valor Investido</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--color-on-surface)' }}>R$ {item.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.55rem', color: 'var(--color-on-surface-variant)', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Orçamento</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--color-primary)' }}>R$ {item.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.55rem', color: 'var(--color-on-surface-variant)', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>CTR</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: '900', color: '#8b5cf6' }}>{item.ctr.toFixed(2)}%</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.55rem', color: 'var(--color-on-surface-variant)', fontWeight: '800', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Frequência</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--color-on-surface)' }}>{item.frequency.toFixed(2)}</p>
                </div>
              </div>

              {/* Mini Indicators Bar */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <span title="Alcance" style={{ fontSize: '0.6rem', background: 'rgba(255,255,255,0.03)', color: 'var(--color-on-surface-variant)', padding: '2px 6px', borderRadius: '2px', fontWeight: '700', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'var(--font-mono)' }}>{item.reach.toLocaleString('pt-BR')} ALC</span>
                <span title="Impressões" style={{ fontSize: '0.6rem', background: 'rgba(255,255,255,0.03)', color: 'var(--color-on-surface-variant)', padding: '2px 6px', borderRadius: '2px', fontWeight: '700', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'var(--font-mono)' }}>{item.impressions.toLocaleString('pt-BR')} IMP</span>
                <span title="Cliques Link" style={{ fontSize: '0.6rem', background: 'rgba(255,255,255,0.03)', color: 'var(--color-on-surface-variant)', padding: '2px 6px', borderRadius: '2px', fontWeight: '700', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'var(--font-mono)' }}>{item.linkClicks} CLQ</span>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid var(--color-outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: '900', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                 ACESSAR GERENCIADOR <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>facebook</span>
              </div>
            </div>
          )) : (
            <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', background: 'var(--color-surface-container-lowest)', borderRadius: '1.5rem', border: '1px dashed var(--color-surface-container-high)' }}>
               <span className="material-icons-outlined" style={{ fontSize: '4rem', color: 'var(--color-surface-container-highest)', marginBottom: '1rem' }}>campaign</span>
               <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '1.2rem', fontWeight: '600' }}>Nenhuma campanha encontrada.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default AdsAnalysis;

// Injeção de Estilos para o Calendário (Premium)
const styleTag = document.createElement('style');
styleTag.innerHTML = `
  .react-datepicker-popper {
    z-index: 999999 !important;
  }
  .react-datepicker {
    font-family: var(--font-mono) !important;
    border: 1px solid var(--color-primary) !important;
    border-radius: 0px !important;
    box-shadow: 0 0 30px rgba(0,245,255,0.15) !important;
    background: var(--color-surface) !important;
    color: var(--color-on-surface) !important;
  }
  .react-datepicker__header { 
    background: var(--color-surface-bright) !important; 
    border-bottom: 1px solid var(--color-outline) !important; 
    padding-top: 1rem !important; 
  }
  .react-datepicker__current-month, .react-datepicker__day-name, .react-datepicker__day {
    color: var(--color-on-surface) !important;
  }
  .react-datepicker__day:hover {
    background: var(--color-primary-container) !important;
  }
  .react-datepicker__day--selected { 
    background: var(--color-primary) !important; 
    color: black !important; 
    font-weight: 900 !important;
  }
  .react-datepicker__day--disabled {
    color: var(--color-on-surface-variant) !important;
    opacity: 0.3;
  }
  .custom-datepicker-input {
    border: none !important;
    background: transparent !important;
    outline: none !important;
    font-weight: 800 !important;
    color: var(--color-primary) !important;
    cursor: pointer !important;
    font-size: 0.75rem !important;
    width: 85px !important;
    text-align: center !important;
    font-family: var(--font-mono) !important;
  }
`;
document.head.appendChild(styleTag);
