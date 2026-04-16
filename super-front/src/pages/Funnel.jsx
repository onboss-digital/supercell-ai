import React from 'react';
import { dashboardData } from '../data/mockData';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

function Funnel() {
  const { funnel, summary } = dashboardData;

  const historicalData = [
    { day: '01/04', leads: 20, conversions: 2, cpa: 12.5 },
    { day: '02/04', leads: 25, conversions: 3, cpa: 10.2 },
    { day: '03/04', leads: 18, conversions: 1, cpa: 15.8 },
    { day: '04/04', leads: 30, conversions: 4, cpa: 9.5 },
    { day: '05/04', leads: 22, conversions: 2, cpa: 11.4 },
    { day: '06/04', leads: 35, conversions: 5, cpa: 8.8 },
    { day: '07/04', leads: 30, conversions: 3, cpa: 10.1 },
  ];

  return (
    <main className="main-content">
      {/* Top Metrics Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'var(--metrics-grid, repeat(4, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>CPC MÉDIO</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '800' }}>R$ {(summary.totalSpent / funnel.conversionSteps[1].value).toFixed(2)}</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-primary-container)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>CUSTO POR CHECKOUT</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '800' }}>R$ {(summary.totalSpent / funnel.conversionSteps[2].value).toFixed(2)}</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-secondary)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>CUSTO POR LEAD (CPL)</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '800' }}>R$ {summary.averageCPA.toFixed(2)}</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-tertiary)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>CAC (AQUISIÇÃO)</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '800' }}>R$ {(summary.totalSpent / funnel.conversionSteps[4].value).toFixed(2)}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'var(--main-grid, 1.4fr 1fr)', gap: '2rem', marginBottom: '2rem' }}>
        {/* Visual Funnel Representation */}
        <section className="card" style={{ padding: 'var(--card-padding, 2rem)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontWeight: '800' }}>Jornada do Usuário</h3>
            <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', background: 'var(--color-surface-container-high)', borderRadius: '1rem', fontWeight: '600' }}>Dados Real-time</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {funnel.conversionSteps.map((step, index) => {
              const maxWidth = 100 - (index * 8); // Slightly adjusted for mobile
              const conversion = index > 0 ? (step.value / funnel.conversionSteps[index-1].value) * 100 : 100;
              
              return (
                <div key={step.label} style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--funnel-gap, 1.5rem)', marginBottom: '0.25rem' }}>
                    <div style={{ width: 'var(--label-width, 150px)', fontSize: '0.7rem', fontWeight: '700', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase' }}>
                      {step.label}
                    </div>
                    <div style={{ flex: 1, position: 'relative', height: '36px', background: 'var(--color-surface-container-lowest)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${maxWidth}%`, 
                        height: '100%', 
                        background: step.color, 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.8rem',
                        fontWeight: '800',
                        boxShadow: '4px 0 15px rgba(0,0,0,0.1)',
                        transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}>
                        {step.value.toLocaleString()}
                      </div>
                    </div>
                    <div className="desktop-only" style={{ width: '60px', textAlign: 'right', fontSize: '1rem', fontWeight: '900', color: 'var(--color-on-surface)' }}>
                      {index === 0 ? '100%' : `${conversion.toFixed(1)}%`}
                    </div>
                  </div>
                  {index < funnel.conversionSteps.length - 1 && (
                    <div style={{ marginLeft: 'var(--connector-margin, 165px)', height: '12px', borderLeft: '2px dashed var(--color-surface-container-highest)', position: 'relative' }}>
                      <span className="material-icons-outlined" style={{ position: 'absolute', top: '-6px', left: '-10px', fontSize: '18px', color: 'var(--color-surface-container-highest)' }}>expand_more</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* AI Recommendations for Funnel */}
        <section className="card" style={{ background: 'var(--color-surface-container-low)', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem' }}>
            <span className="material-icons-outlined" style={{ color: 'var(--color-primary)', fontSize: '24px' }}>psychology</span>
            Análise Proativa do Funil
          </h3>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1.25rem', background: 'var(--color-surface)', borderRadius: '12px', borderLeft: '4px solid var(--color-error)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--color-error)' }}>ALERTA CRÍTICO</span>
              </div>
              <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>Abandono no Checkout: 73%</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                Sugestão: Testar "Frete Grátis acima de R$ 200" por 48h.
              </p>
            </div>

            <div style={{ padding: '1.25rem', background: 'var(--color-surface)', borderRadius: '12px', borderLeft: '4px solid var(--color-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--color-secondary)' }}>OPORTUNIDADE</span>
              </div>
              <p style={{ fontWeight: '700', fontSize: '0.95rem' }}>Aumentar ROAS em 15%</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                Sugestão: Realocar R$ 40 do Feed para Stories agora.
              </p>
            </div>

            <button style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-container))', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              fontWeight: '700', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <span className="material-icons-outlined">auto_fix_high</span> Executar Otimização
            </button>
          </div>
        </section>
      </div>

      <section className="card" style={{ padding: 'var(--card-padding, 2rem)' }}>
        <h3 style={{ fontWeight: '800', marginBottom: '1.5rem' }}>Eficiência do Investimento</h3>
        <div style={{ width: '100%', height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData}>
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
              <Area type="monotone" dataKey="leads" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  );
}

export default Funnel;
