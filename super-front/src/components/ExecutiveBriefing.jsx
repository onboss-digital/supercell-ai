import React from 'react';

const ExecutiveBriefing = ({ insight, loading }) => {
  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '2.5rem',
        animation: 'pulse 2s infinite ease-in-out'
      }}>
        <div style={{ height: '24px', width: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '1rem' }}></div>
        <div style={{ height: '16px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '0.5rem' }}></div>
        <div style={{ height: '16px', width: '80%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
      </div>
    );
  }

  if (!insight) return null;

  // Função para destacar palavras-chave e métricas com cores
  const renderHighlightedText = (text) => {
    if (!text) return null;

    // 1. Processar Negritos (**texto**)
    let parts = text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: 'white', fontWeight: '900' }}>{part.slice(2, -2)}</strong>;
      }

      // 2. Processar palavras-chave dentro das partes que não são negrito
      const subParts = part.split(/(\b(?:Atenção|Preocupante|Crítico|Zero|Prejuízo|Gargalo|Urgente|Parar|Excelente|Saudável|Lucro|Positivo|Sucesso|Escalar|Batendo meta|Ótimo|R\$\s?[\d.,]+|[\d.,]+%|[\d.,]+\b))/gi);
      
      return subParts.map((sub, j) => {
        const lower = sub.toLowerCase();
        
        // Vermelho para Negativos/Alertas
        if (['atenção', 'preocupante', 'crítico', 'zero', 'prejuízo', 'gargalo', 'urgente', 'parar'].includes(lower)) {
          return <span key={`${i}-${j}`} style={{ color: '#fb7185', fontWeight: '800' }}>{sub}</span>;
        }
        
        // Verde para Positivos
        if (['excelente', 'saudável', 'lucro', 'positivo', 'sucesso', 'escalar', 'batendo meta', 'ótimo'].includes(lower)) {
          return <span key={`${i}-${j}`} style={{ color: '#34d399', fontWeight: '800' }}>{sub}</span>;
        }

        // Ciano para Métricas (R$, %, Números)
        if (sub.includes('R$') || sub.includes('%') || /^\d+[.,]?\d*$/.test(sub.trim())) {
          return <span key={`${i}-${j}`} style={{ color: '#38bdf8', fontWeight: '800', background: 'rgba(56, 189, 248, 0.1)', padding: '0 4px', borderRadius: '4px' }}>{sub}</span>;
        }

        return sub;
      });
    });

    return parts;
  };

  const formatContent = (text) => {
    if (!text) return "Aguardando processamento estratégico...";
    
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={i} />;

      // Ícones baseados no conteúdo da linha
      let icon = null;
      let color = '#F1F5F9';

      if (trimmed.includes('🔴') || trimmed.includes('report_problem') || /crítico|urgente|atenção/i.test(trimmed)) {
        icon = 'report_problem';
        color = '#fb7185';
      } else if (trimmed.includes('🟢') || trimmed.includes('check_circle') || /excelente|sucesso|ótimo/i.test(trimmed)) {
        icon = 'check_circle';
        color = '#34d399';
      }

      if (icon) {
        return (
          <div key={i} style={{ 
            display: 'flex', gap: '0.8rem', 
            background: 'rgba(255,255,255,0.03)',
            padding: '1rem', borderRadius: '0.75rem',
            marginBottom: '1rem', borderLeft: `4px solid ${color}`
          }}>
            <span className="material-icons-outlined" style={{ color, fontSize: '1.2rem' }}>{icon}</span>
            <div style={{ flex: 1, color: '#fff', fontSize: '0.95rem' }}>
              {renderHighlightedText(trimmed.replace(/[🔴🟢]|report_problem|check_circle/g, ''))}
            </div>
          </div>
        );
      }

      return (
        <p key={i} style={{ 
          marginBottom: '1.2rem', color: '#F1F5F9', 
          lineHeight: '1.7', fontSize: '1rem', opacity: 0.9 
        }}>
          {renderHighlightedText(line)}
        </p>
      );
    });
  };

  return (
    <div style={{
      padding: '2.5rem',
      background: '#1e293b', // Fundo sólido para garantir visibilidade
      borderRadius: '1.5rem',
      border: '1px solid #38bdf8',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
      marginBottom: '3rem',
      color: 'white'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '2rem' }}>
        <div style={{ 
          width: '56px', height: '56px', borderRadius: '16px', 
          background: '#0EA5E9', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          color: 'white'
        }}>
          <span className="material-icons-outlined" style={{ fontSize: '2.2rem' }}>psychology</span>
        </div>
        <div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '900', color: 'white', margin: 0 }}>
            Executive Briefing by J.A.R.V.I.S.
          </h3>
          <span style={{ fontSize: '0.85rem', color: '#38BDF8', fontWeight: '700' }}>
            RELATÓRIO ESTRATÉGICO DE {new Date(insight.date).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>

      <div style={{ 
        fontSize: '1.1rem', 
        color: '#ffffff', // Branco Puro
        background: 'rgba(0,0,0,0.2)', // Fundo leve para o texto
        padding: '1.5rem',
        borderRadius: '1rem',
        lineHeight: '1.8'
      }}>
        {formatContent(insight.content)}
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button style={{
          background: '#0ea5e9',
          color: 'white',
          border: 'none',
          padding: '0.8rem 1.5rem',
          borderRadius: '0.75rem',
          fontWeight: '800',
          cursor: 'pointer'
        }}>
          Discutir Estratégia no Chat
        </button>
      </div>
    </div>
  );
};

export default ExecutiveBriefing;
