import React from 'react';

const InsightCard = ({ title, subtitle, suggestion }) => {
  return (
    <div className="card insight-card">
      <div className="card-header">
        <div className="pulse-dot"></div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <div className="insight-content">
        "{suggestion}"
      </div>
    </div>
  );
};

export default InsightCard;
