import React from 'react';

function VehicleSelector({
  evCatalog,
  evFleetConfig,
  onUpdateCount,
  fleetStats,
  disabled = false
}) {
  const incrementVehicle = (modelId) => {
    const current = evFleetConfig[modelId] || 0;
    onUpdateCount(modelId, Math.min(100, current + 1));
  };

  const decrementVehicle = (modelId) => {
    const current = evFleetConfig[modelId] || 0;
    onUpdateCount(modelId, Math.max(0, current - 1));
  };

  const resetAll = () => {
    evCatalog.forEach(ev => {
      onUpdateCount(ev.id, 0);
    });
  };

  if (!evCatalog || evCatalog.length === 0) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#666',
        backgroundColor: 'white',
        borderRadius: '15px',
      }}>
        Ucitavam katalog vozila...
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '15px',
      padding: '25px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '15px',
        borderBottom: '2px solid #e5e7eb',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#333' }}>
          Odabir vozila po modelu
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            padding: '10px 20px',
            backgroundColor: fleetStats.totalCount > 0 ? '#667eea' : '#e5e7eb',
            color: 'white',
            borderRadius: '10px',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}>
            Ukupno: {fleetStats.totalCount} vozila
          </div>
          <button
            onClick={resetAll}
            disabled={disabled || fleetStats.totalCount === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: disabled || fleetStats.totalCount === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: disabled || fleetStats.totalCount === 0 ? 0.5 : 1
            }}
          >
            Resetiraj
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {evCatalog.map((ev) => {
          const count = evFleetConfig[ev.id] || 0;

          return (
            <div
              key={ev.id}
              style={{
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                backgroundColor: count > 0 ? '#f0f9ff' : '#ffffff',
                transition: 'all 0.3s ease',
                borderColor: count > 0 ? '#667eea' : '#e5e7eb'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '15px'
              }}>
                <div>
                  <h4 style={{
                    margin: '0 0 5px 0',
                    fontSize: '1.1rem',
                    color: '#333'
                  }}>
                    {ev.manufacturer} {ev.model}
                  </h4>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#666',
                    marginTop: '5px'
                  }}>
                    <div>Baterija: {ev.battery_capacity_kwh} kWh</div>
                    <div>Punjac: {ev.max_charging_power_kw} kW</div>
                    {ev.max_range_km && <div>Domet: {ev.max_range_km} km</div>}
                    {ev.price_eur && <div style={{ color: '#667eea', fontWeight: '600', marginTop: '3px' }}>Cijena: {ev.price_eur.toLocaleString('hr-HR')} EUR</div>}
                  </div>
                </div>
                <div style={{
                  backgroundColor: count > 0 ? '#667eea' : '#e5e7eb',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '8px 15px',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  minWidth: '50px',
                  textAlign: 'center'
                }}>
                  {count}
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => decrementVehicle(ev.id)}
                  disabled={disabled || count === 0}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: disabled || count === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    opacity: disabled || count === 0 ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  -
                </button>

                <input
                  type="number"
                  min="0"
                  max="100"
                  value={count}
                  onChange={(e) => onUpdateCount(ev.id, e.target.value)}
                  disabled={disabled}
                  style={{
                    flex: 2,
                    padding: '12px',
                    fontSize: '1.1rem',
                    textAlign: 'center',
                    border: '2px solid #667eea',
                    borderRadius: '8px',
                    fontWeight: 'bold'
                  }}
                />

                <button
                  onClick={() => incrementVehicle(ev.id)}
                  disabled={disabled || count >= 100}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: disabled || count >= 100 ? 'not-allowed' : 'pointer',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    opacity: disabled || count >= 100 ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {fleetStats.totalCount > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f0fdf4',
          borderRadius: '10px',
          border: '2px solid #10b981'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#166534' }}>
            Sumarni pregled flote:
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px',
            fontSize: '0.9rem'
          }}>
            <div style={{ color: '#166534' }}>
              <strong>Ukupno vozila:</strong> {fleetStats.totalCount}
            </div>
            <div style={{ color: '#166534' }}>
              <strong>Ukupni kapacitet:</strong> {fleetStats.totalCapacity.toFixed(1)} kWh
            </div>
            <div style={{ color: '#166534' }}>
              <strong>Ukupna snaga punjenja:</strong> {fleetStats.totalChargingPower.toFixed(1)} kW
            </div>
            <div style={{ color: '#166534' }}>
              <strong>Prosjecni kapacitet:</strong> {fleetStats.avgCapacity.toFixed(1)} kWh
            </div>
            {fleetStats.totalPrice > 0 && (
              <div style={{ color: '#166534' }}>
                <strong>Ukupna cijena flote:</strong> {fleetStats.totalPrice.toLocaleString('hr-HR')} EUR
              </div>
            )}
          </div>
        </div>
      )}

      {fleetStats.totalCount === 0 && (
        <div style={{
          marginTop: '20px',
          padding: '20px',
          backgroundColor: '#fef2f2',
          borderRadius: '10px',
          textAlign: 'center',
          color: '#991b1b',
          fontWeight: '600'
        }}>
          Niste odabrali nijedno vozilo. Odaberite barem jedno vozilo za simulaciju.
        </div>
      )}
    </div>
  );
}

export default VehicleSelector;
