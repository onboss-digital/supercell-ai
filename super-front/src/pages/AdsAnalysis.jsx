import React, { useState } from 'react';
import { campaignsData } from '../data/mockData';

function AdsAnalysis() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const displayedCampaigns = (campaignsData || []).filter(camp => {
    const matchStatus = filterStatus === 'all' || camp.status === filterStatus;
    const matchSearch = camp.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const openFacebookCampaign = (campaignId) => {
    window.open(`https://adsmanager.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=${campaignId}`, '_blank');
  };

  return (
    <main className="main-content">
      <div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
             <span className="material-icons-outlined" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-on-surface-variant)', fontSize: '1.2rem' }}>search</span>
             <input 
               type="text" 
               placeholder="Pesquisar campanha..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '0.75rem', border: '1px solid var(--color-surface-container-high)', background: 'white', fontSize: '0.9rem', outline: 'none' }}
             />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '0.75rem 1.25rem', borderRadius: '0.75rem', border: '1px solid var(--color-surface-container-high)', background: 'white', color: 'var(--color-on-surface)', cursor: 'pointer', outline: 'none' }}
          >
            <option value="all">Filtro: Todos os Status</option>
            <option value="active">Ativos</option>
            <option value="paused">Pausados</option>
          </select>
        </div>

        {/* Campaign Cards List */}
        <div className="ads-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
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
                border: '1px solid var(--color-surface-container)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
                zIndex: 1
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-ambient)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: '800', 
                  padding: '4px 10px', 
                  borderRadius: '2rem', 
                  background: item.status === 'active' ? 'rgba(0, 200, 80, 0.1)' : 'rgba(0,0,0,0.05)',
                  color: item.status === 'active' ? '#008542' : '#666'
                }}>
                  {item.status.toUpperCase()}
                </span>
                <span className="material-icons-outlined" style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }}>open_in_new</span>
              </div>
              
              <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--color-on-surface)', margin: '0.25rem 0', lineHeight: '1.2' }}>{item.name}</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', fontWeight: '800', letterSpacing: '0.05em' }}>INVESTIDO</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--color-on-surface)' }}>R$ {item.spent.toLocaleString()}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', fontWeight: '800', letterSpacing: '0.05em' }}>ROAS</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: '900', color: item.roas > 3 ? 'var(--color-secondary)' : 'inherit' }}>{item.roas.toFixed(2)}x</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', fontWeight: '800', letterSpacing: '0.05em' }}>LEADS</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--color-on-surface)' }}>{item.leads}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', fontWeight: '800', letterSpacing: '0.05em' }}>CPA MÉDIO</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--color-on-surface)' }}>R$ {item.cpa.toFixed(2)}</p>
                </div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid var(--color-surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: '800', fontSize: '0.8rem' }}>
                 ABRIR NO GERENCIADOR <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>facebook</span>
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
