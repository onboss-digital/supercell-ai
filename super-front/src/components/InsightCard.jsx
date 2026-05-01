import React from 'react';

const InsightCard = ({ title, subtitle, text }) => {
  // Função simples para formatar negrito e quebras de linha (Markdown básico)
  const formatText = (rawText) => {
    if (!rawText) return "O Jarvis está analisando os dados... Aguarde um momento.";
    
    return rawText.split('\n').map((line, i) => {
      // Processa negrito: **texto** -> <strong>texto</strong>
      const processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Processa listas com bullet: * texto -> • texto
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        return <li key={i} style={{ marginBottom: '0.5rem', listStyle: 'none' }}>• {processedLine.replace(/^(\*|-)\s/, '')}</li>;
      }
      
      return <p key={i} style={{ marginBottom: '1rem' }} dangerouslySetInnerHTML={{ __html: processedLine }}></p>;
    });
  };

  return (
    <div className="card insight-card" style={{ height: 'auto', minHeight: '100%' }}>
      <div className="card-header">
        <div className="pulse-dot"></div>
        <h3 style={{ color: 'white', margin: 0 }}>{title}</h3>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>{subtitle}</p>
      </div>
      <div className="insight-content">
        {formatText(text)}
      </div>
    </div>
  );
};

export default InsightCard;
