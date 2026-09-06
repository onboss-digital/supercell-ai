import React, { useState, useEffect } from 'react';
import { API_URL } from '../api/config';

function PDV() {
  const [data, setData] = useState({
    metrics: {
      faturamento: 0,
      qtd_vendas: 0,
      lucro_total: 0,
      ticket_medio: 0,
      perc_lucro: 0
    },
    recentSales: []
  });
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    telefoneCliente: '',
    nomeCliente: '',
    vendedor: '',
    produto: '',
    valorTotal: '',
    lucro: '',
    tipoVenda: 'Offline'
  });
  const [submitting, setSubmitting] = useState(false);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    period: 'Hoje'
  });

  const fetchData = async () => {
    try {
      let url = `${API_URL}/api/pdv/dashboard`;
      if (filters.startDate && filters.endDate) {
        url += `?startDate=${filters.startDate}&endDate=${filters.endDate}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao buscar dados do PDV:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [filters.startDate, filters.endDate]); // Recarrega quando os filtros de data mudam

  const setPeriod = (period) => {
    const today = new Date().toISOString().split('T')[0];
    let start = today;
    let end = today;

    if (period === '7D') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (period === '15D') {
      const d = new Date();
      d.setDate(d.getDate() - 15);
      start = d.toISOString().split('T')[0];
    } else if (period === '30D') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    } else if (period === 'Personalizado') {
      // Não altera start/end imediatamente, apenas abre o seletor visual
      setFilters({ ...filters, period: 'Personalizado' });
      return;
    }

    setFilters({ startDate: start, endDate: end, period });
  };

  const handleSale = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/webhooks/mercadophone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ telefoneCliente: '', nomeCliente: '', vendedor: '', produto: '', valorTotal: '', lucro: '', tipoVenda: 'Offline' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatPhone = (phone) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `(${cleaned.substring(2, 4)}) ${cleaned.substring(4, 9)}-${cleaned.substring(9)}`;
    }
    if (cleaned.length === 11) {
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    }
    return phone;
  };

  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_URL}/api/pdv/sync`);
      const json = await res.json();
      if (json.status === 'success') {
        fetchData();
        // Opcional: mostrar uma notificação de sucesso
        console.log(`Sincronizado! ${json.new_sales} novas vendas.`);
      }
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
    } finally {
      setSyncing(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  // Filtra as vendas recentes pela busca (nome ou telefone)
  const filteredSales = (data.recentSales || []).filter(sale => 
    (sale.nomeCliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.telefoneCliente || '').includes(searchTerm) ||
    (sale.id.toString()).includes(searchTerm)
  );

  if (!data || !data.metrics) {
    return (
      <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p style={{ color: '#94a3b8', fontSize: '1.2rem', fontWeight: 'bold' }}>
          {loading ? 'Carregando Dados Otimizados...' : 'Erro ao carregar dados do PDV (Verifique o servidor).'}
        </p>
      </main>
    );
  }

  return (
    <main className="main-content">
      <div style={{ maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
      <div className="pdv-header">
        <div className="pdv-title-section">
          <h2>Dashboard de Vendas (PDV)</h2>
          <div className="pdv-subtitle-container">
            <p>Espelhamento em tempo real do MercadoPhone</p>
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="pdv-sync-btn"
              style={{ opacity: syncing ? 0.5 : 1 }}
            >
              <span className={`material-icons-outlined ${syncing ? 'spin' : ''}`} style={{ fontSize: '0.9rem' }}>sync</span>
              {syncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR AGORA'}
            </button>
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="pdv-filters-bar">
          <div className="pdv-period-buttons">
            {['Hoje', '7D', '15D', '30D'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="pdv-period-btn"
                style={{
                  background: filters.period === p ? '#38bdf8' : 'transparent',
                  color: filters.period === p ? '#0f172a' : '#94a3b8'
                }}
              >
                {p}
              </button>
            ))}
          </div>
          
          <div className="pdv-period-divider"></div>

          <div className="pdv-date-picker-group">
            <input 
              type="date" 
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value, period: 'Personalizado' })}
              className="pdv-date-input"
            />
            <span className="pdv-date-separator">até</span>
            <input 
              type="date" 
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value, period: 'Personalizado' })}
              className="pdv-date-input"
            />
          </div>

          <button 
            onClick={() => setShowForm(true)}
            title="Registrar Venda Manual"
            className="pdv-add-btn"
          >
            <span className="material-icons-outlined">add</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'var(--metrics-grid, repeat(4, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Faturamento', value: formatCurrency(data?.metrics?.faturamento), color: '#10b981', icon: 'payments' },
          { label: 'Lucro Total', value: formatCurrency(data?.metrics?.lucro_total), color: '#38bdf8', icon: 'trending_up' },
          { label: 'Qtd. Vendas', value: data?.metrics?.qtd_vendas || 0, color: '#f59e0b', icon: 'shopping_basket' },
          { label: 'Ticket Médio', value: formatCurrency(data?.metrics?.ticket_medio), color: '#8b5cf6', icon: 'attach_money' }
        ].map((m, i) => (
          <div key={i} style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155', position: 'relative', overflow: 'hidden' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{m.label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>{m.value}</p>
            <span className="material-icons-outlined" style={{ position: 'absolute', right: '-0.5rem', bottom: '-0.5rem', fontSize: '4rem', color: m.color, opacity: 0.1 }}>{m.icon}</span>
            <div style={{ position: 'absolute', left: 0, bottom: 0, height: '4px', width: '100%', background: m.color, opacity: 0.3 }}></div>
          </div>
        ))}
      </div>

      {/* SEÇÃO DE INTELIGÊNCIA (GRÁFICOS E RANKINGS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'var(--main-grid, 1fr 1fr 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Gráfico de Origem (Tipo de Venda) */}
        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '900', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-icons-outlined" style={{ color: '#38bdf8' }}>pie_chart</span>
            Origem das Vendas (R$)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.byType?.map((t, i) => {
              const perc = (t.value / (data.metrics.faturamento || 1)) * 100;
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: '700' }}>{t.name}</span>
                    <span style={{ color: '#94a3b8' }}>{perc.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: '8px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${perc}%`, height: '100%', background: i === 0 ? '#38bdf8' : '#8b5cf6', borderRadius: '4px' }}></div>
                  </div>
                </div>
              );
            })}
            {(!data.byType || data.byType.length === 0) && <p style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center' }}>Sem dados no período</p>}
          </div>
        </div>

        {/* Ranking de Vendedores */}
        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '900', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-icons-outlined" style={{ color: '#10b981' }}>groups</span>
            Top Vendedores
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {data.bySeller?.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#0f172a', padding: '0.6rem', borderRadius: '0.75rem' }}>
                <div style={{ width: '2rem', height: '2rem', background: '#1e293b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#10b981', fontSize: '0.8rem' }}>
                  {i + 1}º
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700' }}>{s.name}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>{s.sales} vendas</p>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '900', color: '#f8fafc' }}>{formatCurrency(s.total)}</p>
              </div>
            ))}
            {(!data.bySeller || data.bySeller.length === 0) && <p style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center' }}>Sem vendas registradas</p>}
          </div>
        </div>

        {/* Top Produtos */}
        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '900', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-icons-outlined" style={{ color: '#f59e0b' }}>inventory_2</span>
            Produtos Mais Vendidos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {data.byProduct?.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>{p.name}</p>
                  <div style={{ height: '4px', background: '#0f172a', borderRadius: '2px', marginTop: '4px' }}>
                    <div style={{ width: `${(p.count / (data.byProduct[0]?.count || 1)) * 100}%`, height: '100%', background: '#f59e0b', borderRadius: '2px' }}></div>
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8' }}>{p.count}x</span>
              </div>
            ))}
            {(!data.byProduct || data.byProduct.length === 0) && <p style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center' }}>Sem dados de produtos</p>}
          </div>
        </div>

      </div>

      {/* Seção da Tabela com Busca */}
      <div style={{ background: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', overflow: 'hidden' }}>
        <div className="pdv-table-header">
          <h3>Histórico de Vendas Recentes</h3>
          
          {/* BUSCA INTELIGENTE */}
          <div className="pdv-search-container">
            <span className="material-icons-outlined" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '1.2rem' }}>search</span>
            <input 
              type="text" 
              placeholder="Buscar por nome, WhatsApp ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabela de Vendas para Desktop */}
        <div className="table-responsive desktop-only" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '1rem' }}>Cód.</th>
                <th style={{ padding: '1rem' }}>Cliente</th>
                <th style={{ padding: '1rem' }}>WhatsApp</th>
                <th style={{ padding: '1rem' }}>Vendedor</th>
                <th style={{ padding: '1rem' }}>Data da venda</th>
                <th style={{ padding: '1rem' }}>Tipo de venda</th>
                <th style={{ padding: '1rem' }}>Valor (R$)</th>
                <th style={{ padding: '1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '1rem', fontWeight: '700' }}>{sale.id}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '700' }}>{sale.nomeCliente || 'Cliente Final'}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>call</span>
                      {formatPhone(sale.telefoneCliente)}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>{sale.vendedor || '-'}</td>
                  <td style={{ padding: '1rem' }}>{new Date(sale.createdAt).toLocaleString('pt-BR')}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: '800',
                      background: sale.tipoVenda === 'Trafego Pago' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                      color: sale.tipoVenda === 'Trafego Pago' ? '#0ea5e9' : '#94a3b8'
                    }}>
                      {sale.tipoVenda}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: '900' }}>{formatCurrency(sale.valorTotal)}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ background: '#083344', color: '#22d3ee', padding: '0.3rem 0.8rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '800' }}>
                      {sale.statusVenda}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Lista de Vendas para Mobile */}
        <div className="mobile-only pdv-mobile-sales-list">
          {filteredSales.map((sale) => (
            <div key={sale.id} className="pdv-mobile-sale-card">
              <div className="pdv-mobile-sale-card-header">
                <span className="pdv-sale-id">#{sale.id}</span>
                <span className="pdv-sale-status-badge">
                  {sale.statusVenda}
                </span>
              </div>
              
              <div className="pdv-mobile-sale-card-body">
                <h4 className="pdv-sale-client-name">{sale.nomeCliente || 'Cliente Final'}</h4>
                <span className="pdv-sale-type-badge" data-type={sale.tipoVenda}>
                  {sale.tipoVenda}
                </span>
              </div>
              
              <div className="pdv-mobile-sale-card-details">
                <div className="pdv-detail-item">
                  <span className="material-icons-outlined">call</span>
                  <a href={`tel:${sale.telefoneCliente}`} className="pdv-phone-link">
                    {formatPhone(sale.telefoneCliente)}
                  </a>
                </div>
                <div className="pdv-detail-item">
                  <span className="material-icons-outlined">person</span>
                  <span>{sale.vendedor || 'Sem Vendedor'}</span>
                </div>
              </div>
              
              <div className="pdv-mobile-sale-card-footer">
                <span className="pdv-sale-date">{new Date(sale.createdAt).toLocaleString('pt-BR')}</span>
                <span className="pdv-sale-value">{formatCurrency(sale.valorTotal)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Mensagem caso não encontre vendas */}
        {filteredSales.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <span className="material-icons-outlined" style={{ fontSize: '3rem', marginBottom: '1rem' }}>search_off</span>
            <p>Nenhuma venda encontrada para "{searchTerm}"</p>
          </div>
        )}
      </div>

      {/* Modal de Venda Manual */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#1e293b', width: '90%', maxWidth: '500px', borderRadius: '1.5rem', padding: '2rem', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ margin: 0, fontWeight: '900' }}>Registrar Venda Manual</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'transparent', color: '#94a3b8' }}>
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSale} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                placeholder="WhatsApp do Cliente" 
                value={form.telefoneCliente} 
                onChange={e => setForm({...form, telefoneCliente: e.target.value})} 
                style={{ padding: '0.8rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: 'white' }} 
              />
              <input 
                placeholder="Nome do Cliente" 
                value={form.nomeCliente} 
                onChange={e => setForm({...form, nomeCliente: e.target.value})} 
                style={{ padding: '0.8rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: 'white' }} 
              />
              <input 
                placeholder="Vendedor" 
                value={form.vendedor} 
                onChange={e => setForm({...form, vendedor: e.target.value})} 
                style={{ padding: '0.8rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: 'white' }} 
              />
              <input 
                placeholder="Produto" 
                value={form.produto} 
                onChange={e => setForm({...form, produto: e.target.value})} 
                style={{ padding: '0.8rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: 'white' }} 
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="number" step="0.01" placeholder="Valor Total" 
                  value={form.valorTotal} 
                  onChange={e => setForm({...form, valorTotal: e.target.value})} 
                  style={{ flex: 1, padding: '0.8rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: 'white' }} 
                />
                <select 
                  value={form.tipoVenda} 
                  onChange={e => setForm({...form, tipoVenda: e.target.value})}
                  style={{ flex: 1, padding: '0.8rem', borderRadius: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                >
                  <option value="Offline">Direto na Loja</option>
                  <option value="Trafego Pago">Tráfego Pago</option>
                  <option value="Indicação">Indicação</option>
                  <option value="Parcerias">Parcerias</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #334155', background: 'transparent', color: 'white', cursor: 'pointer' }}>CANCELAR</button>
                <button type="submit" disabled={submitting} style={{ flex: 1, padding: '0.8rem', borderRadius: '0.5rem', border: 'none', background: '#0ea5e9', color: 'white', fontWeight: '800', cursor: 'pointer' }}>
                  {submitting ? 'SALVANDO...' : 'SALVAR VENDA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}

export default PDV;
