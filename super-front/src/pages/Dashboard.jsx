import React, { useState } from 'react';
import MetricCard from '../components/MetricCard';
import InsightCard from '../components/InsightCard';
import { dashboardData } from '../data/mockData';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

function Dashboard() {
  const { summary, aiInsights, funnel } = dashboardData;
  const [periodo, setPeriodo] = useState('hoje');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  return (
    <main className="main-content">

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="filter-group">
          <label className="filter-label">Período:</label>
          <select 
            className="filter-select" 
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          >
            <option value="hoje">Hoje</option>
            <option value="7dias">Últimos 7 dias</option>
            <option value="mes">Este Mês</option>
            <option value="personalizado">Personalizado</option>
          </select>
          
          {periodo === 'personalizado' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="date" 
                className="filter-select" 
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
              <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>até</span>
              <input 
                type="date" 
                className="filter-select" 
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="filter-group">
          <label className="filter-label">Origem:</label>
          <select className="filter-select" defaultValue="todos">
            <option value="todos">Todos os Canais</option>
            <option value="meta">Meta Ads</option>
            <option value="organico">Orgânico</option>
          </select>
        </div>
      </div>

      <section className="dashboard-grid">
        <MetricCard 
          title="Gasto Hoje" 
          prefix="R$ " 
          value={summary.totalSpent} 
          trend="+5% vs ontem" 
          trendColor="var(--color-tertiary)"
        />
        <MetricCard 
          title="CPA Médio" 
          prefix="R$ " 
          value={summary.averageCPA} 
          trend="-12% vs média" 
          trendColor="var(--color-secondary)"
        />
        <MetricCard 
          title="Total Leads" 
          value={summary.totalLeads} 
          trend="+8 leads hoje" 
          trendColor="var(--color-secondary)"
        />
        <MetricCard 
          title="ROAS Real" 
          value={summary.roas} 
          prefix=""
          trend="Meta: 5.0x" 
          trendColor="var(--color-on-surface-variant)"
        />
        
        <InsightCard 
          title={aiInsights.title} 
          subtitle={aiInsights.subtitle} 
          suggestion={aiInsights.suggestion}
        />

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h4>Funil de Conversão</h4>
          <div style={{ width: '100%', height: '240px', marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel.conversionSteps} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="label" 
                  width={100} 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: 'var(--color-surface-container-low)' }}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: 'var(--shadow-ambient)' 
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {funnel.conversionSteps.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="dashboard-grid" style={{ marginTop: 'var(--spacing-4)' }}>
         <div className="card" style={{ gridColumn: 'span 4' }}>
            <h4>Principais Recomendações do Jarvis</h4>
            <ul style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {aiInsights.prioritySuggestions.map((sug, i) => (
                <li key={i} style={{ 
                  padding: '1rem', 
                  background: 'var(--color-surface-container-low)', 
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <span className="material-icons-outlined" style={{ color: 'var(--color-primary)' }}>tips_and_updates</span>
                  {sug}
                </li>
              ))}
            </ul>
         </div>
      </section>
    </main>
  );
}

export default Dashboard;
