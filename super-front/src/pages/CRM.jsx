import React, { useState, useEffect } from 'react';
import { API_URL } from '../api/config';

function CRM() {
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState('list'); // 'list' ou 'kanban'

  // Estados de Filtro
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [platformFilter, setPlatformFilter] = useState('Todos');
  const [tempFilter, setTempFilter] = useState('Todos');
  const [campaignSearch, setCampaignSearch] = useState('');
  const [adSearch, setAdSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const statuses = ['Novo', 'Em Atendimento', 'Qualificado', 'Venda Concluída', 'Perdido'];

  useEffect(() => {
    fetchLeads();
  }, []);

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

  const filteredLeads = leads.filter(l => {
    const matchStatus = statusFilter === 'Todos' || l.status === statusFilter;
    const matchPlatform = platformFilter === 'Todos' || l.platform === platformFilter;
    const matchTemp = tempFilter === 'Todos' || (l.temperature || (l.id.charCodeAt(0) % 2 === 0 ? 'Quente' : 'Morno')) === tempFilter;
    const matchCampaign = !campaignSearch || (l.campaignName || '').toLowerCase().includes(campaignSearch.toLowerCase());
    const matchAd = !adSearch || (l.adName || '').toLowerCase().includes(adSearch.toLowerCase());
    return matchStatus && matchPlatform && matchTemp && matchCampaign && matchAd;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'Novo': return '#0049db';
      case 'Em Atendimento': return '#C5A059';
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
  const onDragStart = (e, leadId) => { e.dataTransfer.setData('leadId', leadId); e.target.style.opacity = '0.5'; };
  const onDragEnd = (e) => { e.target.style.opacity = '1'; };
  const onDragOver = (e) => { e.preventDefault(); };
  const onDrop = (e, newStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    updateLeadStatus(leadId, newStatus);
  };

  return (
    <main className="main-content" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', padding: 0, position: 'relative' }}>
      
      {/* Jarvis Insights Header */}
      <div style={{ padding: '1.5rem 1.5rem 0 1.5rem' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
          borderRadius: '1.25rem', padding: '1.5rem', color: 'white',
          display: 'flex', flexDirection: 'column', gap: '1rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'var(--color-primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-icons-outlined" style={{ fontSize: '1.2rem', color: 'white' }}>psychology</span>
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '900', letterSpacing: '0.05em' }}>LEADS DA SUPERCELL</h2>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', padding: '0.3rem', borderRadius: '2rem', gap: '0.3rem' }}>
                <button onClick={() => setViewType('list')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 1rem', borderRadius: '2rem', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '800', transition: '0.3s', background: viewType === 'list' ? 'white' : 'transparent', color: viewType === 'list' ? '#0f172a' : 'white' }}>
                   Lista
                </button>
                <button onClick={() => setViewType('kanban')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 1rem', borderRadius: '2rem', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '800', transition: '0.3s', background: viewType === 'kanban' ? 'white' : 'transparent', color: viewType === 'kanban' ? '#0f172a' : 'white' }}>
                   Kanban
                </button>
              </div>
              
              <button 
                onClick={() => setShowFilters(true)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', borderRadius: '2rem', 
                  border: '1px solid rgba(255,255,255,0.2)', background: (statusFilter !== 'Todos' || platformFilter !== 'Todos' || tempFilter !== 'Todos' || campaignSearch || adSearch) ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)', 
                  color: 'white', cursor: 'pointer', fontWeight: '800', fontSize: '0.75rem', transition: '0.3s'
                }}
              >
                <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>filter_list</span>
                FILTRAR {(statusFilter !== 'Todos' || platformFilter !== 'Todos' || tempFilter !== 'Todos' || campaignSearch || adSearch) && "•"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {viewType === 'list' ? (
          <section style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.75rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--color-on-surface-variant)', fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <th style={{ padding: '0.75rem 0.5rem 0.75rem 1rem' }}>Identificação</th>
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
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--color-surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontWeight: '900', fontSize: '0.8rem' }}>{(lead.name || 'L').charAt(0)}</div>
                            <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: lead.platform === 'instagram' ? 'linear-gradient(45deg, #f09433 0%, #dc2743 100%)' : '#25D366', color: 'white', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid white' }}>
                              {lead.platform === 'instagram' ? (
                                <svg viewBox="0 0 24 24" width="8" height="8" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                              ) : (
                                <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                              )}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontWeight: '800', fontSize: '0.85rem' }}>{lead.name}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: '700' }}>{lead.phone}</div>
                            <div style={{ fontSize: '0.6rem', color: '#64748b' }}>{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</div>
                          </div>
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
          </section>
        ) : (
          <section style={{ flex: 1, display: 'flex', padding: '1.5rem', gap: '1.5rem', overflowX: 'auto', background: '#f8fafc', alignItems: 'flex-start' }} className="kanban-scroll">
            {statuses.map(status => (
              <div key={status} onDragOver={onDragOver} onDrop={(e) => onDrop(e, status)} style={{ flexShrink: 0, width: '300px', display: 'flex', flexDirection: 'column', background: 'rgba(241, 245, 249, 0.5)', borderRadius: '1.25rem', height: '100%', border: '1px solid #e2e8f0' }}>
                <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(status) }}></div>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: '900', color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{status}</h3>
                   </div>
                   <span style={{ background: '#e2e8f0', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: '800', color: '#64748b' }}>{filteredLeads.filter(l => l.status === status).length}</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.75rem 1.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="hide-scrollbar">
                   {filteredLeads.filter(l => l.status === status).map(lead => (
                     <div key={lead.id} draggable onDragStart={(e) => onDragStart(e, lead.id)} onDragEnd={onDragEnd} onClick={() => setSelectedLead(lead)} style={{ background: 'white', padding: '1rem', borderRadius: '0.85rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', cursor: 'grab', transition: '0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                           <span style={{ fontWeight: '800', fontSize: '0.85rem', color: '#0f172a' }}>{lead.name}</span>
                           <div style={{ color: lead.platform === 'instagram' ? '#dc2743' : '#25D366' }}>
                              {lead.platform === 'instagram' ? (
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                              ) : (
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                              )}
                           </div>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', marginBottom: '0.6rem' }}>{lead.phone}</div>
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                           <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: '700' }}>{lead.campaignName || 'Direto'}</span>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getTempColor(lead.temperature) }}></div>
                              <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: '800' }}>{lead.temperature}</span>
                           </div>
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
                <button onClick={() => { setStatusFilter('Todos'); setPlatformFilter('Todos'); setTempFilter('Todos'); setCampaignSearch(''); setAdSearch(''); }} style={{ flex: 1, padding: '1rem', borderRadius: '1rem', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: '800', cursor: 'pointer' }}>LIMPAR</button>
                <button onClick={() => setShowFilters(false)} style={{ flex: 1, padding: '1rem', borderRadius: '1rem', border: 'none', background: '#0f172a', color: 'white', fontWeight: '800', cursor: 'pointer' }}>APLICAR</button>
             </div>
          </div>
        </div>
      )}

      {/* Selected Lead Modal */}
      {selectedLead && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }} onClick={() => setSelectedLead(null)}>
            <div style={{ width: '100%', maxWidth: '540px', background: 'white', borderRadius: '2rem', display: 'flex', flexDirection: 'column', padding: '2rem', boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.3)', position: 'relative', animation: 'modalFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)', border: '1px solid rgba(255,255,255,0.2)' }} onClick={(e) => e.stopPropagation()}>
               <style>{`@keyframes modalFadeIn { from { opacity: 0; transform: scale(0.98) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
               
               <button onClick={() => setSelectedLead(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f1f5f9', border: 'none', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-icons-outlined" style={{ fontSize: '1.1rem', color: '#64748b' }}>close</span>
               </button>

               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ background: selectedLead.platform === 'instagram' ? 'linear-gradient(45deg, #f09433 0%, #bc1888 100%)' : '#25D366', color: 'white', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     {selectedLead.platform === 'instagram' ? <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> : <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>}
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Identificação de Lead</span>
               </div>

               <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.85rem', fontWeight: '900', color: '#0f172a', lineHeight: '1.1', marginBottom: '0.6rem' }}>{selectedLead.name}</h3>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f1f5f9', color: '#334155', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>call</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '900' }}>{selectedLead.phone}</span>
                     </div>
                     <span style={{ padding: '0.4rem 0.75rem', borderRadius: '0.5rem', background: '#f8fafc', color: '#64748b', fontSize: '0.65rem', fontWeight: '900', border: '1px solid #e2e8f0' }}>{selectedLead.status.toUpperCase()}</span>
                  </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1rem', borderRadius: '1rem', border: '1px solid #f1f5f9', background: '#f8fafc' }}>
                     <p style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Campanha</p>
                     <p style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b' }}>{selectedLead.campaignName || 'Tráfego Direto'}</p>
                  </div>
                  <div style={{ padding: '1rem', borderRadius: '1rem', border: '1px solid #f1f5f9', background: '#f8fafc' }}>
                     <p style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Público / Adset</p>
                     <p style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b' }}>{selectedLead.adsetName || 'Público Geral'}</p>
                  </div>
                  <div style={{ padding: '1rem', borderRadius: '1rem', border: '1px solid #f1f5f9', background: '#f8fafc' }}>
                     <p style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Anúncio</p>
                     <p style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b' }}>{selectedLead.adName || '—'}</p>
                  </div>
                  <div style={{ padding: '1rem', borderRadius: '1rem', border: '1px solid #f1f5f9', background: '#f8fafc' }}>
                     <p style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Temp & Data</p>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getTempColor(selectedLead.temperature) }}></div>
                        <p style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b' }}>{selectedLead.temperature} • {new Date(selectedLead.createdAt).toLocaleDateString('pt-BR')}</p>
                     </div>
                  </div>
               </div>

               <div style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '1.5rem', color: 'white', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                     <span className="material-icons-outlined" style={{ fontSize: '0.9rem', color: 'var(--color-primary)' }}>auto_awesome</span>
                     <p style={{ fontSize: '0.7rem', fontWeight: '900', letterSpacing: '0.05em' }}>JARVIS ANALYTICS</p>
                  </div>
                  <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'rgba(255,255,255,0.85)', fontWeight: '500' }}>
                     Analisando a jornada: <strong>{selectedLead.name}</strong> converteu através da campanha <strong>"{selectedLead.campaignName || 'Direto'}"</strong> via <strong>{selectedLead.platform.toUpperCase()}</strong>.
                     {selectedLead.temperature === 'Quente' ? " Alta prontidão de compra." : " Necessita de acompanhamento."}
                     <br /><br />
                     <span style={{ color: 'var(--color-primary)', fontWeight: '800' }}>TÁTICA:</span> {selectedLead.platform === 'instagram' ? 'Abordagem via Direct.' : 'Abordagem via WhatsApp.'}
                  </p>
               </div>

               <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <a 
                    href={selectedLead.platform === 'instagram' ? `https://instagram.com/direct/t/${selectedLead.phone}` : `https://wa.me/${selectedLead.phone ? selectedLead.phone.replace(/\D/g, '') : ''}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ flex: 1, textDecoration: 'none', padding: '1rem', borderRadius: '1.25rem', background: selectedLead.platform === 'instagram' ? 'linear-gradient(45deg, #f09433 0%, #dc2743 100%)' : '#25D366', color: 'white', fontWeight: '900', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  >
                     <span className="material-icons-outlined">chat</span>
                     CONTATAR
                  </a>
                  <button onClick={() => setSelectedLead(null)} style={{ padding: '1rem 1.5rem', borderRadius: '1.25rem', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}>FECHAR</button>
               </div>
            </div>
          </div>
      )}

      <style>{`.kanban-scroll::-webkit-scrollbar { height: 8px; } .kanban-scroll::-webkit-scrollbar-track { background: #f1f5f9; } .kanban-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; } .hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </main>
  );
}

export default CRM;
