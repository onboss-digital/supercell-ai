import React, { useState } from 'react';

function Reports() {
  const [activeReport, setActiveReport] = useState(null);

  const reports = [
    {
      id: 1,
      title: "Como estão as vendas de iPhones?",
      icon: "smartphone",
      color: "#0049db",
      date: "Hoje, 08:30",
      category: "Veredito da IA",
      summary: "Suas vendas de iPhone 13 estão ótimas, mas o iPhone 15 Pro está parado. A IA percebeu que as pessoas acham o preço do 15 Pro alto demais no seu anúncio atual.",
      action: "Criar oferta de parcelamento em 18x para o iPhone 15 Pro",
      stats: { positive: "85%", labels: ["iPhone 13", "iPhone 11"], issue: "iPhone 15 Pro" }
    },
    {
      id: 2,
      title: "Seu dinheiro está sendo bem gasto?",
      icon: "payments",
      color: "#10B981",
      date: "Ontem",
      category: "Financeiro Simples",
      summary: "Você investiu R$ 200,00 e voltaram R$ 1.200,00 em pedidos. Cada lead (interessado) custou R$ 6,50 para o seu WhatsApp. Isso é excelente!",
      action: "Aumentar investimento em R$ 50,00 na campanha de WhatsApp",
      stats: { positive: "ROAS 6.0", labels: ["Investido: R$200", "Retorno: R$1200"], issue: "Nenhum" }
    },
    {
      id: 3,
      title: "O que os clientes estão perguntando?",
      icon: "forum",
      color: "#F59E0B",
      date: "05 Abr",
      category: "Atendimento",
      summary: "Muitos clientes perguntam sobre 'Garantia' e 'Troca'. Você não menciona isso nos anúncios. Eles estão com medo de comprar e não ter suporte.",
      action: "Adicionar selo de '1 Ano de Garantia' em todos os criativos",
      stats: { positive: "Dúvida Comum", labels: ["Garantia", "Saúde da Bateria"], issue: "Medo de compra" }
    }
  ];

  return (
    <main className="main-content">

      {/* Destaque do Dia */}
      <section style={{ 
        background: 'white', 
        padding: 'var(--card-padding, 2.5rem)', 
        borderRadius: '2rem', 
        border: '1px solid #e2e8f0',
        marginBottom: '3rem',
        display: 'flex',
        flexDirection: 'var(--highlight-flex, row)',
        alignItems: 'var(--mobile-flex-align, center)',
        gap: 'var(--highlight-gap, 3rem)',
        boxShadow: '0 10px 25px rgba(0,0,0,0.02)'
      }}>
        <div style={{ 
          width: '64px', 
          height: '64px', 
          background: 'var(--color-primary)', 
          borderRadius: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <span className="material-icons-outlined" style={{ fontSize: '2rem', color: 'white' }}>lightbulb</span>
        </div>
        <div style={{ flex: 1, textAlign: 'var(--mobile-text-align, left)' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Dica de Ouro de Hoje</span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '0.5rem 0' }}>
            "Anúncios de domingo rendem 2x mais vendas."
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Sugestão: Guarde mais verba para o final de semana.
          </p>
        </div>
        <button style={{
          padding: '1rem 2rem',
          borderRadius: '1rem',
          background: 'var(--color-primary)',
          color: 'white',
          border: 'none',
          fontWeight: '800',
          cursor: 'pointer',
          width: 'var(--mobile-full-width, auto)'
        }}>
          Aplicar
        </button>
      </section>

      {/* Lista de Relatórios Simplificados */}
      <h4 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a', marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>Relatórios Detalhados</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'var(--report-grid, repeat(auto-fit, minmax(400px, 1fr)))', gap: '2rem' }}>
        {reports.map(report => (
          <div 
            key={report.id} 
            onClick={() => setActiveReport(report.id === activeReport ? null : report.id)}
            style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '1.8rem',
              border: activeReport === report.id ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
               <div style={{ 
                 width: '40px', 
                 height: '40px', 
                 background: `${report.color}10`, 
                 borderRadius: '10px', 
                 display: 'flex', 
                 alignItems: 'center', 
                 justifyContent: 'center' 
               }}>
                  <span className="material-icons-outlined" style={{ color: report.color, fontSize: '1.25rem' }}>{report.icon}</span>
               </div>
               <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8' }}>{report.date}</span>
            </div>

            <span style={{ fontSize: '0.65rem', fontWeight: '900', color: report.color, textTransform: 'uppercase' }}>
              {report.category}
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a', margin: '0.5rem 0 1rem 0', letterSpacing: '-0.02em' }}>
              {report.title}
            </h3>
            
            <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#475569', marginBottom: '1rem' }}>
              {report.summary}
            </p>

            {/* Parte Interativa */}
            <div style={{ 
              maxHeight: activeReport === report.id ? '500px' : '0', 
              overflow: 'hidden', 
              transition: 'all 0.4s ease-in-out',
              opacity: activeReport === report.id ? 1 : 0
            }}>
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', display: 'block' }}>POSITIVO</label>
                    <span style={{ color: '#10B981', fontWeight: '800', fontSize: '1rem' }}>{report.stats.positive}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', display: 'block' }}>PROBLEMA</label>
                    <span style={{ color: '#E11D48', fontWeight: '800', fontSize: '1rem' }}>{report.stats.issue}</span>
                  </div>
                </div>
                
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>RECOMENDAÇÃO</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', fontWeight: '700', fontSize: '0.85rem' }}>
                    <span className="material-icons-outlined" style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>play_circle</span>
                    {report.action}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
               <span className="material-icons-outlined" style={{ 
                 color: '#cbd5e1', 
                 transform: activeReport === report.id ? 'rotate(180deg)' : 'rotate(0)',
                 transition: 'transform 0.3s'
               }}>
                 expand_more
               </span>
            </div>
          </div>
        ))}
      </div>

      <footer style={{ 
        marginTop: '3rem', 
        padding: '2rem', 
        background: 'white', 
        borderRadius: '2rem', 
        textAlign: 'center',
        border: '1px solid #e2e8f0'
      }}>
        <h4 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a' }}>Dúvidas?</h4>
        <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '1.5rem' }}>Fale com o Jarvis.</p>
        <button style={{
          padding: '1rem 2rem',
          borderRadius: '1rem',
          background: '#0f172a',
          color: 'white',
          border: 'none',
          fontWeight: '800',
          fontSize: '1rem',
          cursor: 'pointer',
          width: '100%'
        }}>
          CHAT COM JARVIS
        </button>
      </footer>
    </main>
  );
}

export default Reports;
