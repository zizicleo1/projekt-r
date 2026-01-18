import React from 'react';

function KPICards({ kpis }) {
  return (
    <div className="kpi-container">
      <div className="kpi-card">
        <div className="kpi-icon" style={{ fontSize: '2rem' }}>EUR</div>
        <div className="kpi-value">{kpis.total_cost_eur.toFixed(2)} EUR</div>
        <div className="kpi-label">Ukupni trosak</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon" style={{ fontSize: '2rem' }}>%</div>
        <div className="kpi-value">{kpis.peak_reduction_percent.toFixed(1)}%</div>
        <div className="kpi-label">Smanjenje vrsnog opterecenja</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon" style={{ fontSize: '2rem' }}>kW</div>
        <div className="kpi-value">{kpis.peak_load_with_v2b_kw.toFixed(1)} kW</div>
        <div className="kpi-label">Vrsno opterecenje (s V2B)</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon" style={{ fontSize: '2rem' }}>OK</div>
        <div className="kpi-value">{kpis.ev_success_rate_percent.toFixed(1)}%</div>
        <div className="kpi-label">Uspjesnost punjenja EV-ova</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon" style={{ fontSize: '2rem' }}>+</div>
        <div className="kpi-value">{kpis.total_ev_energy_charged_kwh.toFixed(1)} kWh</div>
        <div className="kpi-label">Ukupno punjeno</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon" style={{ fontSize: '2rem' }}>-</div>
        <div className="kpi-value">{kpis.total_ev_energy_discharged_kwh.toFixed(1)} kWh</div>
        <div className="kpi-label">Ukupno prazneno (V2B)</div>
      </div>
    </div>
  );
}

export default KPICards;
