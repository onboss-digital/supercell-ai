import React, { useState, useEffect } from 'react';
import { API_URL } from '../api/config';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ptBR from 'date-fns/locale/pt-BR';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend 
} from 'recharts';
import ExecutiveBriefing from '../components/ExecutiveBriefing';

registerLocale('pt-BR', ptBR);

function Funnel() {
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('hoje');
  const [dataInicio, setDataInicio] = useState(null);
  const [dataFim, setDataFim] = useState(null);
  const [summary, setSummary] = useState({
    totalSpent: 0,
    messages: 0,
    linkClicks: 0,
    purchases: 0,
    faturamentoPDV: 0,
    faturamentoTrafegoPago: 0,
    impressions: 0,
    reach: 0,
    salesByType: [],
    leadsByPlatform: []
  });
  const [dailyData, setDailyData] = useState([]);

  const [triggerFetch, setTriggerFetch] = useState(0);

  const [dailyInsight, setDailyInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(true);

  const fetchDailyInsight = () => {
    setLoadingInsight(true);
    fetch(`${API_URL}/api/daily-insight`)
      .then(res => res.json())
      .then(data => {
        setDailyInsight(data);
        setLoadingInsight(false);
      })
      .catch(err => {
        console.error('Erro ao buscar insight diário', err);
        setLoadingInsight(false);
      });
  };

  useEffect(() => {
    fetchDailyInsight();
  }, []);

  useEffect(() => {
    if (periodo === 'personalizado' && triggerFetch === 0) return;

    setLoading(true);
    let url = `${API_URL}/api/dashboard?actId=todas&periodo=${periodo}`;
    
    if (periodo === 'personalizado' && dataInicio && dataFim) {
      url += `&dateStart=${dataInicio.toISOString()}&dateEnd=${dataFim.toISOString()}`;
    }
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if(data.rawSummary) setSummary(data.rawSummary);
        if(data.dailyData) setDailyData(data.dailyData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar dados do funil:', err);
        setLoading(false);
      });
  }, [periodo, triggerFetch]);

  return (
    <main className="main-content">
      {/* Filters Bar Superior */}
      <div className="filters-bar" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', padding: '1.5rem', background: 'var(--color-surface-container-lowest)', borderRadius: '1rem', border: '1px solid var(--color-surface-container-low)', marginBottom: '2rem' }}>
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
               display: 'flex', alignItems: 'center', gap: '0.8rem', 
               background: 'var(--color-surface-container-lowest)', padding: '0.5rem 1rem', 
               borderRadius: '0.75rem', border: '2px solid #0ea5e9',
               boxShadow: '0 10px 25px rgba(14, 165, 233, 0.15)'
             }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <DatePicker 
                    selected={dataInicio} onChange={(date) => { setDataInicio(date); setTriggerFetch(0); }} 
                    selectsStart startDate={dataInicio} endDate={dataFim} 
                    locale="pt-BR" dateFormat="dd/MM/yyyy" placeholderText="Início"
                    className="custom-datepicker-input"
                  />
                  <span style={{ color: '#94a3b8' }}>→</span>
                  <DatePicker 
                    selected={dataFim} onChange={(date) => { setDataFim(date); setTriggerFetch(0); }} 
                    selectsEnd startDate={dataInicio} endDate={dataFim} minDate={dataInicio}
                    locale="pt-BR" dateFormat="dd/MM/yyyy" placeholderText="Fim"
                    className="custom-datepicker-input"
                  />
                </div>
                <button 
                  onClick={() => setTriggerFetch(prev => prev + 1)}
                  style={{ background: '#0ea5e9', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: '800', cursor: 'pointer' }}
                >
                  APLICAR
                </button>
             </div>
          )}
        </div>
      </div>

      <ExecutiveBriefing insight={dailyInsight} loading={loadingInsight} />

      {loading && <div style={{ marginBottom: '1rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Sincronizando funil omnichannel...</div>}

      {/* Top Metrics Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem',
        opacity: loading ? 0.6 : 1,
        transition: 'opacity 0.3s'
      }}>
        {/* Card 1: Faturamento */}
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-primary)', position: 'relative', overflow: 'hidden' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>FATURAMENTO PDV</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--color-on-surface)', lineHeight: '1' }}>
              R$ {(summary.faturamentoPDV || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </p>
            <p style={{ fontSize: '0.65rem', fontWeight: '700', color: '#0ea5e9', marginTop: '0.4rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span className="material-icons-outlined" style={{ fontSize: '0.8rem' }}>trending_up</span>
              R$ {(summary.faturamentoTrafegoPago || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})} Tráfego Pago
            </p>
          </div>
        </div>

        {/* Card 2: ROAS */}
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>ROAS (RETORNO)</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '900', color: '#10b981' }}>
            {(summary.totalSpent > 0 ? (summary.faturamentoPDV / summary.totalSpent) : 0).toFixed(2)}x
          </p>
          <p style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--color-on-surface-variant)', marginTop: '0.4rem' }}>
            Eficiência do investimento
          </p>
        </div>

        {/* Card 3: Mensagens */}
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-secondary)' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>MENSAGENS DA META</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--color-secondary)' }}>
            {summary.messages || 0} <span style={{fontSize: '0.8rem', fontWeight: '600', opacity: 0.6}}>leads</span>
          </p>
        </div>

        {/* Card 4: CPA */}
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>CUSTO POR VENDA (CPA)</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--color-on-surface)' }}>
            R$ {(summary.purchases > 0 ? (summary.totalSpent / summary.purchases) : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Card 5: Ticket Médio */}
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #8b5cf6' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>TICKET MÉDIO</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--color-on-surface)' }}>
            R$ {(summary.purchases > 0 ? (summary.faturamentoPDV / summary.purchases) : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Card 6: CTR */}
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #ec4899' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>CTR (TAXA DE CLIQUE)</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--color-on-surface)' }}>
            {(summary.impressions > 0 ? (summary.linkClicks / summary.impressions * 100) : 0).toFixed(2)}%
          </p>
        </div>

        {/* Card 7: Investimento */}
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-tertiary)' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>TOTAL INVESTIDO</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--color-on-surface)' }}>
            R$ {(summary.totalSpent || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Card 8: Lucro Líquido */}
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-primary-container)' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>LUCRO ESTIMADO</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--color-primary)' }}>
            R$ {((summary.faturamentoPDV || 0) - summary.totalSpent).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
          </p>
        </div>
      </div>

      <div className="funnel-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Visual Funnel Representation */}
        <section className="card" style={{ padding: 'var(--card-padding, 2rem)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontWeight: '800' }}>Jornada do Usuário</h3>
            <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', background: 'var(--color-surface-container-high)', borderRadius: '1rem', fontWeight: '600' }}>Dados Real-time</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', opacity: loading ? 0.6 : 1, transition: 'opacity 0.3s' }}>
            {(() => {
              const omnichannelSteps = [
                { label: 'Alcance (Meta)', value: summary.reach, color: '#BBF7D0' },
                { label: 'Impressões (Meta)', value: summary.impressions, color: '#86EFAC' },
                { label: 'Cliques no Link (Meta)', value: summary.linkClicks, color: '#4ADE80' },
                { label: 'Mensagens (Meta)', value: summary.messages, color: '#22C55E' },
                { label: 'Vendas (PDV)', value: summary.purchases, color: '#16A34A' }
              ];

              const maxValue = Math.max(...omnichannelSteps.map(s => s.value || 0)) || 1;

              return omnichannelSteps.map((step, index) => {
                // Largura proporcional ao maior valor para evitar overflow e garantir escala correta
                const widthPercentage = Math.min((step.value / maxValue) * 100, 100);
                const conversion = index > 0 ? (step.value / omnichannelSteps[index-1].value) * 100 : 100;
                
                return (
                  <div key={step.label} style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--funnel-gap, 1.5rem)', marginBottom: '0.25rem' }}>
                      <div style={{ width: 'var(--label-width, 180px)', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', lineHeight: '1.2' }}>
                        {step.label}
                      </div>
                      <div style={{ flex: 1, position: 'relative', height: '40px', background: 'var(--color-surface-container-lowest)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${Math.max(widthPercentage, 0.5)}%`, 
                          height: '100%', 
                          background: step.color, 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '0.9rem',
                          fontWeight: '900',
                          border: 'none',
                          transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
                          textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                        }}>
                          {(step.value || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="desktop-only" style={{ width: '70px', textAlign: 'right', fontSize: '1.1rem', fontWeight: '900', color: 'var(--color-on-surface)' }}>
                        {index === 0 ? '100%' : `${conversion.toFixed(1)}%`}
                      </div>
                    </div>
                    {index < omnichannelSteps.length - 1 && (
                      <div style={{ marginLeft: 'var(--connector-margin, 195px)', height: '16px', borderLeft: '2px dashed var(--color-surface-container-highest)', position: 'relative' }}>
                        <span className="material-icons-outlined" style={{ position: 'absolute', top: '-4px', left: '-10px', fontSize: '18px', color: 'var(--color-surface-container-highest)' }}>expand_more</span>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </section>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        {/* Vendas por Origem */}
        <section className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: '800', marginBottom: '1.5rem', fontSize: '1rem' }}>Distribuição de Vendas</h3>
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.salesByType || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(summary.salesByType || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['var(--color-primary)', 'var(--color-secondary)', 'var(--color-tertiary)'][index % 3]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Leads por Plataforma */}
        <section className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: '800', marginBottom: '1.5rem', fontSize: '1rem' }}>Leads por Canal</h3>
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.leadsByPlatform} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} style={{fontSize: '0.7rem', fontWeight: '700'}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" name="Leads" fill="#4ADE80" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        <section className="card" style={{ padding: 'var(--card-padding, 2rem)' }}>
          <h3 style={{ fontWeight: '800', marginBottom: '1.5rem' }}>Mensagens / Leads (Volume Diário)</h3>
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-container-high)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: 'var(--color-on-surface-variant)', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--color-on-surface-variant)', fontSize: 10}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-ambient)', background: 'var(--color-surface)', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card" style={{ padding: 'var(--card-padding, 2rem)' }}>
          <h3 style={{ fontWeight: '800', marginBottom: '1.5rem' }}>Evolução do ROAS Diário</h3>
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData.map(d => ({ ...d, roas: d.spent > 0 ? (d.revenue / d.spent) : 0 }))}>
                <defs>
                  <linearGradient id="colorRoas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-container-high)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: 'var(--color-on-surface-variant)', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--color-on-surface-variant)', fontSize: 10}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-ambient)', background: 'var(--color-surface)', fontSize: '11px' }}
                  formatter={(value) => [`${value.toFixed(2)}x`, 'ROAS']}
                />
                <Area type="monotone" dataKey="roas" name="ROAS" stroke="#10b981" fillOpacity={1} fill="url(#colorRoas)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Funnel;
