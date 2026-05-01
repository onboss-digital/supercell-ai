import React from 'react';

const MetricCard = ({ title, value, prefix, trend, trendColor, subtitle }) => {
  return (
    <div className="card">
      <h4>{title}</h4>
      <div className="value">
        {prefix}{value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#0ea5e9', marginTop: '0.4rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          <span className="material-icons-outlined" style={{ fontSize: '0.8rem' }}>trending_up</span>
          {subtitle}
        </div>
      )}
      {trend && trend !== '—' && (
        <span className="trend" style={{ color: trendColor }}>
          {trend}
        </span>
      )}
    </div>
  );
};

export default MetricCard;
