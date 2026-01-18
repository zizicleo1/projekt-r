import React from 'react';

function SimulationParams({ buildingTypes, buildingType, fleetSummary, pvScaling, useCroatianTariff }) {
  return (
    <div className="info-box" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '25px',
      borderRadius: '15px',
      marginBottom: '30px',
      boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
    }}>
      <h3 style={{ marginBottom: '15px', fontSize: '1.3rem', fontWeight: '700' }}>
        Parametri simulacije
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        <div>
          <strong style={{ fontSize: '0.9rem', opacity: '0.9' }}>Tip zgrade:</strong>
          <div style={{ fontSize: '1.1rem', marginTop: '5px' }}>
            {buildingTypes.find(t => t.id === buildingType)?.name || buildingType}
          </div>
        </div>
        <div>
          <strong style={{ fontSize: '0.9rem', opacity: '0.9' }}>Broj vozila:</strong>
          <div style={{ fontSize: '1.1rem', marginTop: '5px' }}>
            {fleetSummary.num_evs} EV
          </div>
        </div>
        <div>
          <strong style={{ fontSize: '0.9rem', opacity: '0.9' }}>PV sustav:</strong>
          <div style={{ fontSize: '1.1rem', marginTop: '5px' }}>
            {pvScaling}x ({(pvScaling * 30).toFixed(0)} kW)
          </div>
        </div>
        <div>
          <strong style={{ fontSize: '0.9rem', opacity: '0.9' }}>Tarifa:</strong>
          <div style={{ fontSize: '1.1rem', marginTop: '5px' }}>
            {useCroatianTariff ? 'Hrvatska (3-zone)' : 'HEP (2-zone)'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimulationParams;
