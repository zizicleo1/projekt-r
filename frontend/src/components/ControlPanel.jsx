import React from 'react';

function ControlPanel({
  buildingType,
  onBuildingTypeChange,
  buildingTypes,
  simulationDate,
  onSimulationDateChange,
  buildingScale,
  onBuildingScaleChange,
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
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <select
                value={simulationDate ? simulationDate.split('-')[2] : '15'}
                onChange={(e) => {
                  const currentMonth = simulationDate ? simulationDate.split('-')[1] : '06';
                  onSimulationDateChange(`2025-${currentMonth}-${e.target.value}`);
                }}
                disabled={loading || loadingComparison}
                style={{
                  width: '80px',
                  padding: '12px',
                  fontSize: '1rem',
                  border: '2px solid #667eea',
                  borderRadius: '10px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                {Array.from({ length: new Date(2025, parseInt(simulationDate?.split('-')[1] || '6'), 0).getDate() }, (_, i) => (
                  <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                    {i + 1}
                  </option>
                ))}
              </select>
              <select
                value={simulationDate ? simulationDate.split('-')[1] : '06'}
                onChange={(e) => {
                  const currentDay = simulationDate ? simulationDate.split('-')[2] : '15';
                  const newMonth = e.target.value;
                  const daysInMonth = new Date(2025, parseInt(newMonth), 0).getDate();
                  const validDay = Math.min(parseInt(currentDay), daysInMonth).toString().padStart(2, '0');
                  onSimulationDateChange(`2025-${newMonth}-${validDay}`);
                }}
                disabled={loading || loadingComparison}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '1rem',
                  border: '2px solid #667eea',
                  borderRadius: '10px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="01">Siječanj</option>
                <option value="02">Veljača</option>
                <option value="03">Ožujak</option>
                <option value="04">Travanj</option>
                <option value="05">Svibanj</option>
                <option value="06">Lipanj</option>
                <option value="07">Srpanj</option>
                <option value="08">Kolovoz</option>
                <option value="09">Rujan</option>
                <option value="10">Listopad</option>
                <option value="11">Studeni</option>
                <option value="12">Prosinac</option>
              </select>
            </div>
            <small style={{ marginTop: '5px', display: 'block', color: '#666' }}>
              Podaci su dostupni samo za 2025. godinu
            </small>
          </label>
        </div>

        <div className="control-group">
          <label>
            Skaliranje potrošnje zgrade:
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={buildingScale}
                onChange={(e) => onBuildingScaleChange(parseFloat(e.target.value))}
                disabled={loading || loadingComparison}
                style={{
                  flex: 1,
                  height: '8px',
                  cursor: loading || loadingComparison ? 'not-allowed' : 'pointer'
                }}
              />
              <span style={{
                minWidth: '60px',
                padding: '8px 12px',
                backgroundColor: '#667eea',
                color: 'white',
                borderRadius: '8px',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                {buildingScale.toFixed(1)}x
              </span>
            </div>
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
                    HEP trotarifna naplata
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
                    HEP dvotarifna naplata
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
          onClick={() => {
            console.log('Button clicked!', { loading, loadingComparison, backendStatus, fleetStats });
            onRunSimulation();
          }}
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
