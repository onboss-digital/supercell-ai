import React, { useState } from 'react';
import { leadsData } from '../data/mockData';

function CRM() {
  const [leads, setLeads] = useState(leadsData);
  const [selectedLead, setSelectedLead] = useState(null);
  const [filter, setFilter] = useState('Todos');

  const statuses = ['Todos', 'Novo', 'Em Atendimento', 'Qualificado', 'Venda Concluída', 'Perdido'];

  const filteredLeads = filter === 'Todos' 
    ? leads 
    : leads.filter(l => l.status === filter);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Novo': return '#0049db';
      case 'Em Atendimento': return '#C5A059';
      case 'Qualificado': return '#10B981';
      case 'Venda Concluída': return '#10B981';
      case 'Perdido': return '#E11D48';
      default: return 'var(--color-on-surface-variant)';
    }
  };

  const getTempColor = (temp) => {
    switch(temp) {
      case 'Quente': return '#E11D48';
      case 'Morno': return '#C5A059';
      case 'Frio': return '#64748b';
      default: return 'var(--color-on-surface-variant)';
    }
  };

  return (
    <main className="main-content" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', padding: 0 }}>
      {/* Barra de Busca e Filtros */}
      <div style={{ padding: '2rem 1.5rem', background: 'var(--color-surface)' }}>
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          background: 'var(--color-surface-container-low)', 
          padding: '0.4rem', 
          borderRadius: '3rem',
          overflowX: 'auto',
          maxWidth: '100%'
        }} className="hide-scrollbar">
          {statuses.map(s => (
            <button 
              key={s} 
              onClick={() => setFilter(s)}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '2rem',
                border: 'none',
                background: filter === s ? 'white' : 'transparent',
                color: filter === s ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                fontSize: '0.7rem',
                fontWeight: '800',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Tabela de Leads */}
        <section style={{ flex: 1, overflowY: 'auto', padding: '1rem var(--card-padding, 1.5rem)' }}>
          {/* Tabela para Desktop */}
          <div className="desktop-only">
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.75rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--color-on-surface-variant)', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                  <th style={{ padding: '1rem' }}>Identificação</th>
                  <th style={{ padding: '1rem' }}>Produto</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Temp.</th>
                  <th style={{ padding: '1rem' }}>Origem</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr 
                    key={lead.id} 
                    onClick={() => setSelectedLead(lead)}
                    style={{ 
                      background: selectedLead?.id === lead.id ? 'var(--color-surface-container-high)' : 'var(--color-surface-container-lowest)',
                      cursor: 'pointer'
                    }}
                  >
                    <td style={{ padding: '1.25rem 1rem', borderRadius: '1rem 0 0 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontWeight: '900' }}>{lead.name.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '1rem' }}>{lead.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{lead.date}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '600', fontSize: '0.85rem' }}>{lead.product}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: '900', background: `${getStatusColor(lead.status)}15`, color: getStatusColor(lead.status) }}>{lead.status}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                       <span style={{ fontSize: '0.75rem', fontWeight: '800', color: getTempColor(lead.temperature) }}>{lead.temperature}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>{lead.source}</td>
                    <td style={{ padding: '1rem', borderRadius: '0 1rem 1rem 0', textAlign: 'right', fontWeight: '900' }}>R$ {lead.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards para Mobile */}
          <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredLeads.map(lead => (
              <div 
                key={lead.id} 
                onClick={() => setSelectedLead(lead)}
                style={{
                  background: 'white', padding: '1.25rem', borderRadius: '1.25rem',
                  border: selectedLead?.id === lead.id ? '2px solid var(--color-primary)' : '1px solid var(--color-surface-container-low)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: '800', fontSize: '1rem' }}>{lead.name}</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: '900', color: getStatusColor(lead.status) }}>{lead.status.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.8rem' }}>
                   <div style={{ color: 'var(--color-on-surface-variant)' }}>{lead.product}</div>
                   <div style={{ fontWeight: '900' }}>R$ {lead.value.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Modal de Detalhes - Adaptivo */}
        {selectedLead && (
          <div style={{ 
            position: 'absolute', top: 0, right: 0, bottom: 0, 
            width: 'var(--mobile-full-width, 450px)', 
            background: 'white', zIndex: 100, borderLeft: '1px solid #eee',
            display: 'flex', flexDirection: 'column', padding: '2rem',
            boxShadow: 'var(--shadow-ambient)'
          }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '900' }}>DETALHES</span>
                <button onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                   <span className="material-icons-outlined">close</span>
                </button>
             </div>
             <h3 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '0.5rem' }}>{selectedLead.name}</h3>
             <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '2rem' }}>{selectedLead.product}</p>
             
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ background: '#f8f9ff', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #dee9fc' }}>
                   <p style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>ANÁLISE IA</p>
                   <p style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>Foque na disponibilidade imediata. Lead qualificado via {selectedLead.source}.</p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                   <button style={{ padding: '1rem', borderRadius: '0.75rem', border: 'none', background: '#25D366', color: 'white', fontWeight: '800' }}>WHATSAPP</button>
                   <button style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid #ddd', background: 'none', fontWeight: '800' }}>QUALIFICAR</button>
                </div>
             </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default CRM;
