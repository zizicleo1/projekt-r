import React from 'react';

function KPICards({ kpis }) {
  const costSavings = kpis.cost_savings_eur || 0;
  const savingsPercent = kpis.total_cost_baseline_eur > 0
    ? ((costSavings / kpis.total_cost_baseline_eur) * 100).toFixed(1)
    : 0;

  return (
    <div className="kpi-container">
      <div className="kpi-card" style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b' }}>
        <div className="kpi-icon" style={{ fontSize: '1.5rem', color: '#d97706' }}>BEZ V2B</div>
        <div className="kpi-value" style={{ color: '#d97706' }}>{(kpis.total_cost_baseline_eur || 0).toFixed(2)} EUR</div>
        <div className="kpi-label">Trošak bez optimizacije</div>
      </div>

      <div className="kpi-card" style={{ backgroundColor: '#d1fae5', borderColor: '#10b981' }}>
        <div className="kpi-icon" style={{ fontSize: '1.5rem', color: '#059669' }}>S V2B</div>
        <div className="kpi-value" style={{ color: '#059669' }}>{kpis.total_cost_eur.toFixed(2)} EUR</div>
        <div className="kpi-label">Trošak s optimizacijom</div>
      </div>

      <div className="kpi-card" style={{ backgroundColor: costSavings >= 0 ? '#dbeafe' : '#fee2e2', borderColor: costSavings >= 0 ? '#3b82f6' : '#ef4444' }}>
        <div className="kpi-icon" style={{ fontSize: '1.5rem', color: costSavings >= 0 ? '#2563eb' : '#dc2626' }}>{costSavings >= 0 ? 'UŠTEDA' : 'GUBITAK'}</div>
        <div className="kpi-value" style={{ color: costSavings >= 0 ? '#2563eb' : '#dc2626' }}>{Math.abs(costSavings).toFixed(2)} EUR ({savingsPercent}%)</div>
        <div className="kpi-label">{costSavings >= 0 ? 'Ušteda s V2B' : 'Dodatni trošak'}</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon" style={{ fontSize: '2rem' }}>kW</div>
        <div className="kpi-value">{kpis.peak_load_with_v2b_kw.toFixed(1)} kW</div>
        <div className="kpi-label">Vršno opterećenje (s V2B)</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon" style={{ fontSize: '2rem' }}>+</div>
        <div className="kpi-value">{kpis.total_ev_energy_charged_kwh.toFixed(1)} kWh</div>
        <div className="kpi-label">Ukupno punjeno</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon" style={{ fontSize: '2rem' }}>-</div>
        <div className="kpi-value">{kpis.total_ev_energy_discharged_kwh.toFixed(1)} kWh</div>
        <div className="kpi-label">Ukupno pražnjeno (V2B)</div>
      </div>
    </div>
  );
}

export default KPICards;
