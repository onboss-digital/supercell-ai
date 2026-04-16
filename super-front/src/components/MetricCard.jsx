import React from 'react';

const MetricCard = ({ title, value, prefix, trend, trendColor }) => {
  return (
    <div className="card">
      <h4>{title}</h4>
      <div className="value">
        {prefix}{value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      {trend && (
        <span className="trend" style={{ color: trendColor }}>
          {trend}
        </span>
      )}
    </div>
  );
};

export default MetricCard;
