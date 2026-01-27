import React from 'react';

function ControlPanel({
  buildingType,
  onBuildingTypeChange,
  buildingTypes,
  simulationDate,
  onSimulationDateChange,
  useCroatianTariff,
  onTariffChange,
  showComparison,
  loading,
  loadingComparison,
  backendStatus,
  fleetStats,
  onRunSimulation,
  onToggleComparison,
}) {
  const getDayOfYear = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  return (
    <div className="control-panel">
      <div className="controls">
        <div className="control-group">
          <label>
            Tip zgrade:
            <select
              value={buildingType}
              onChange={(e) => onBuildingTypeChange(e.target.value)}
              disabled={loading || loadingComparison}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                border: '2px solid #667eea',
                borderRadius: '10px',
                backgroundColor: 'white',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              {buildingTypes.length > 0 ? (
                buildingTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="office">Poslovna zgrada</option>
                  <option value="hospital">Bolnica</option>
                  <option value="shopping_center">Trgovački centar</option>
                </>
              )}
            </select>
            <small style={{ marginTop: '8px', display: 'block' }}>
              {buildingTypes.find(t => t.id === buildingType)?.description || 'Odaberite tip zgrade'}
            </small>
          </label>
        </div>

        <div className="control-group">
          <label>
            Datum simulacije (2025):
            <input
              type="date"
              value={simulationDate}
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  // Forsiraj godinu 2025
                  const parts = value.split('-');
                  if (parts[0] !== '2025') {
                    const correctedDate = `2025-${parts[1]}-${parts[2]}`;
                    onSimulationDateChange(correctedDate);
                  } else {
                    onSimulationDateChange(value);
                  }
                }
              }}
              disabled={loading || loadingComparison}
              min="2025-01-01"
              max="2025-12-31"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                border: '2px solid #667eea',
                borderRadius: '10px',
                backgroundColor: 'white',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            />
            <small style={{ marginTop: '5px', display: 'block', color: '#666' }}>
              Podaci su dostupni samo za 2025. godinu
            </small>
          </label>
        </div>

        {!showComparison && (
          <div className="control-group">
            <label style={{ display: 'block', marginBottom: '10px' }}>Tarifa:</label>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <button
                type="button"
                onClick={() => onTariffChange(true)}
                disabled={loading || loadingComparison}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 15px',
                  backgroundColor: useCroatianTariff ? '#dbeafe' : '#f8f9fa',
                  border: useCroatianTariff ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                  borderRadius: '10px',
                  cursor: loading || loadingComparison ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  opacity: loading || loadingComparison ? 0.6 : 1,
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: useCroatianTariff ? '5px solid #3b82f6' : '2px solid #9ca3af',
                  backgroundColor: 'white',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: useCroatianTariff ? '#3b82f6' : '#333'
                  }}>
                    Hrvatska dinamička tarifa (trotarifna naplata)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
                    VT: 0.213 | ST: 0.125 | NT: 0.066 EUR/kWh
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onTariffChange(false)}
                disabled={loading || loadingComparison}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 15px',
                  backgroundColor: !useCroatianTariff ? '#dcfce7' : '#f8f9fa',
                  border: !useCroatianTariff ? '2px solid #10b981' : '2px solid #e5e7eb',
                  borderRadius: '10px',
                  cursor: loading || loadingComparison ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  opacity: loading || loadingComparison ? 0.6 : 1,
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: !useCroatianTariff ? '5px solid #10b981' : '2px solid #9ca3af',
                  backgroundColor: 'white',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: !useCroatianTariff ? '#10b981' : '#333'
                  }}>
                    HEP bijela tarifa (dvotarifna naplata)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
                    VT: 0.122 | NT: 0.062 EUR/kWh
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
        <button
          className="btn-primary"
          onClick={onRunSimulation}
          disabled={loading || loadingComparison || backendStatus !== 'connected' || fleetStats.totalCount === 0}
          style={{ flex: 1 }}
        >
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Simulacija u tijeku...
            </>
          ) : (
            `Pokreni simulaciju (${fleetStats.totalCount} vozila)`
          )}
        </button>

        <button
          className="btn-primary"
          onClick={onToggleComparison}
          disabled={loading || loadingComparison || backendStatus !== 'connected' || fleetStats.totalCount === 0}
          style={{
            flex: 1,
            backgroundColor: showComparison ? '#10b981' : '#667eea'
          }}
        >
          {loadingComparison ? (
            <>
              <span className="loading-spinner"></span>
              Usporedba u tijeku...
            </>
          ) : showComparison ? (
            'Zatvori usporedbu'
          ) : (
            'Usporedi tarife'
          )}
        </button>
      </div>
    </div>
  );
}

export default ControlPanel;
