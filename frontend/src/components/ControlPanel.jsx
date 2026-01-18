import React from 'react';

function ControlPanel({
  numEVs,
  onNumEVsChange,
  buildingType,
  onBuildingTypeChange,
  buildingTypes,
  pvScaling,
  onPvScalingChange,
  useCroatianTariff,
  onTariffChange,
  showComparison,
  loading,
  loadingComparison,
  backendStatus,
  onRunSimulation,
  onToggleComparison,
}) {
  return (
    <div className="control-panel">
      <div className="controls">
        <div className="control-group">
          <label>
            Broj elektricnih vozila:
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              value={numEVs}
              onChange={(e) => onNumEVsChange(e.target.value)}
              disabled={loading || loadingComparison}
              className="number-input"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1.1rem',
                border: '2px solid #667eea',
                borderRadius: '10px',
                marginTop: '10px'
              }}
            />
            <small>Min: 1 | Max: 100</small>
          </label>
        </div>

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
            PV skaliranje: <strong>{pvScaling.toFixed(1)}x</strong>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={pvScaling}
              onChange={(e) => onPvScalingChange(parseFloat(e.target.value))}
              disabled={loading || loadingComparison}
            />
            <small>Min: 0.5x | Max: 2.0x ({(pvScaling * 30).toFixed(0)} kW)</small>
          </label>
        </div>

        {!showComparison && (
          <div className="control-group">
            <label>
              Tarifa:
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <input
                  type="checkbox"
                  checked={useCroatianTariff}
                  onChange={(e) => onTariffChange(e.target.checked)}
                  disabled={loading || loadingComparison}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.95rem', color: '#333', fontWeight: '600' }}>
                  {useCroatianTariff ? 'Hrvatska dinamicka tarifa (3-zone)' : 'HEP bijela tarifa (2-zone)'}
                </span>
              </div>
              <small style={{ marginTop: '8px', display: 'block' }}>
                {useCroatianTariff
                  ? 'VT: 0.213 | ST: 0.125 | NT: 0.066 EUR/kWh'
                  : 'VT: 0.122 | NT: 0.062 EUR/kWh'}
              </small>
            </label>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
        <button
          className="btn-primary"
          onClick={onRunSimulation}
          disabled={loading || loadingComparison || backendStatus !== 'connected'}
          style={{ flex: 1 }}
        >
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Simulacija u tijeku...
            </>
          ) : (
            'Pokreni simulaciju'
          )}
        </button>

        <button
          className="btn-primary"
          onClick={onToggleComparison}
          disabled={loading || loadingComparison || backendStatus !== 'connected'}
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
