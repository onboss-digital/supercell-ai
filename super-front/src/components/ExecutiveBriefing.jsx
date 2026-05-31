import React from 'react';

const ExecutiveBriefing = ({ insight, loading }) => {
  if (loading) {
    return (
      <div className="jarvis-briefing-card" style={{ animation: 'pulse 2s infinite ease-in-out' }}>
        <div style={{ height: '24px', width: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '1rem' }}></div>
        <div style={{ height: '16px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '0.5rem' }}></div>
        <div style={{ height: '16px', width: '80%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
      </div>
    );
  }

  if (!insight) return null;

  const hasFala = insight.content && insight.content.includes('[FALA]');
  const cleanText = insight.content ? insight.content.replace(/\[FALA\]\s*/g, '') : '';

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
          <div key={i} className="jarvis-alert-item" style={{ '--border-color': color }}>
            <span className="material-icons-outlined" style={{ color, fontSize: '1.2rem' }}>{icon}</span>
            <div className="jarvis-alert-text">
              {renderHighlightedText(trimmed.replace(/[🔴🟢]|report_problem|check_circle/g, ''))}
            </div>
          </div>
        );
      }

      return (
        <p key={i} className="jarvis-voice-paragraph" style={{ opacity: 0.9 }}>
          {renderHighlightedText(line)}
        </p>
      );
    });
  };

  return (
    <div className="jarvis-briefing-card">
      <div className="jarvis-briefing-header" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '2rem' }}>
        <div className="jarvis-ai-avatar jarvis-ai-pulse">
          <span className="material-icons-outlined" style={{ fontSize: '2.2rem' }}>psychology</span>
        </div>
        <div>
          <h3 className="jarvis-briefing-title" style={{ fontSize: '1.4rem', fontWeight: '900', color: 'white', margin: 0 }}>
            Executive Briefing by J.A.R.V.I.S.
          </h3>
          <span className="jarvis-briefing-date" style={{ fontSize: '0.85rem', color: '#38BDF8', fontWeight: '700' }}>
            RELATÓRIO ESTRATÉGICO DE {new Date(insight.date).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>

      <div className="jarvis-briefing-content">
        {hasFala ? (
          <div className="jarvis-voice-bubble">
            <div className="jarvis-voice-header">
              <span className="material-icons-outlined jarvis-voice-icon">graphic_eq</span>
              <span>Mensagem de Voz do J.A.R.V.I.S.</span>
            </div>
            <div className="jarvis-voice-text">
              {formatContent(cleanText)}
            </div>
          </div>
        ) : (
          formatContent(cleanText)
        )}
      </div>

      <div className="jarvis-footer-container" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="jarvis-action-button">
          Discutir Estratégia no Chat
        </button>
      </div>
    </div>
  );
};

export default ExecutiveBriefing;
