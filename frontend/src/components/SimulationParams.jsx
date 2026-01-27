import React from 'react';

function SimulationParams({ buildingTypes, buildingType, fleetSummary, useCroatianTariff }) {
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr.includes('default')) return dateStr;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('hr-HR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

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
          <strong style={{ fontSize: '0.9rem', opacity: '0.9' }}>Datum simulacije:</strong>
          <div style={{ fontSize: '1.1rem', marginTop: '5px' }}>
            {formatDate(fleetSummary.simulation_date)}
          </div>
        </div>
        <div>
          <strong style={{ fontSize: '0.9rem', opacity: '0.9' }}>Tarifa:</strong>
          <div style={{ fontSize: '1.1rem', marginTop: '5px' }}>
            {useCroatianTariff ? 'Trotarifna naplata' : 'Dvotarifna naplata'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimulationParams;
