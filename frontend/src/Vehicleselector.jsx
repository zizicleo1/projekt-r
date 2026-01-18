import React, { useState, useEffect } from 'react';

const VehicleSelector = ({ onSelectionChange, disabled = false }) => {
  const [evCatalog, setEvCatalog] = useState([]);
  const [vehicleConfig, setVehicleConfig] = useState({
    'Tesla Model 3 SR': 0,
    'Kia EV6 LR': 0,
    'Opel Corsa-e': 0,
    'Renault Megane E-Tech': 0
  });
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEVCatalog();
  }, []);

  useEffect(() => {
    const total = Object.values(vehicleConfig).reduce((sum, count) => sum + count, 0);
    setTotalVehicles(total);
    
    if (onSelectionChange) {
      onSelectionChange({
        config: vehicleConfig,
        total: total
      });
    }
  }, [vehicleConfig]);

  const fetchEVCatalog = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/profiles');
      if (response.ok) {
        const data = await response.json();
        setEvCatalog(data.data.ev_catalog || []);
      }
    } catch (err) {
      console.error('Failed to fetch EV catalog:', err);
      setEvCatalog([
        { id: 1, manufacturer: 'Tesla', model: 'Model 3 SR', battery_capacity_kwh: 55.0, max_charging_power_kw: 11.0, price_eur: 42990 },
        { id: 2, manufacturer: 'Kia', model: 'EV6 LR', battery_capacity_kwh: 77.4, max_charging_power_kw: 11.0, price_eur: 51900 },
        { id: 3, manufacturer: 'Opel', model: 'Corsa-e', battery_capacity_kwh: 50.0, max_charging_power_kw: 11.0, price_eur: 33900 },
        { id: 4, manufacturer: 'Renault', model: 'Megane E-Tech', battery_capacity_kwh: 60.0, max_charging_power_kw: 22.0, price_eur: 39500 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleCountChange = (modelKey, value) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(0, Math.min(100, numValue));
    
    setVehicleConfig(prev => ({
      ...prev,
      [modelKey]: clampedValue
    }));
  };

  const incrementVehicle = (modelKey) => {
    setVehicleConfig(prev => ({
      ...prev,
      [modelKey]: Math.min(100, prev[modelKey] + 1)
    }));
  };

  const decrementVehicle = (modelKey) => {
    setVehicleConfig(prev => ({
      ...prev,
      [modelKey]: Math.max(0, prev[modelKey] - 1)
    }));
  };

  const resetAll = () => {
    const resetConfig = {};
    Object.keys(vehicleConfig).forEach(key => {
      resetConfig[key] = 0;
    });
    setVehicleConfig(resetConfig);
  };

  const setEqualDistribution = () => {
    const count = Math.floor(totalVehicles / Object.keys(vehicleConfig).length);
    const newConfig = {};
    Object.keys(vehicleConfig).forEach(key => {
      newConfig[key] = count;
    });
    setVehicleConfig(newConfig);
  };

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#666'
      }}>
        Učitavam katalog vozila...
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
        borderBottom: '2px solid #e5e7eb'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#333' }}>
          Odabir vozila po modelu
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            padding: '10px 20px',
            backgroundColor: totalVehicles > 0 ? '#667eea' : '#e5e7eb',
            color: 'white',
            borderRadius: '10px',
            fontWeight: 'bold',
            fontSize: '1.1rem'
          }}>
            Ukupno: {totalVehicles} vozila
          </div>
          <button
            onClick={resetAll}
            disabled={disabled || totalVehicles === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: disabled || totalVehicles === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: disabled || totalVehicles === 0 ? 0.5 : 1
            }}
          >
            Resetiraj
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {evCatalog.map((ev) => {
          const modelKey = `${ev.manufacturer} ${ev.model}`;
          const count = vehicleConfig[modelKey] || 0;

          return (
            <div
              key={`${ev.manufacturer}-${ev.model}`}
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
                    <div>Punjač: {ev.max_charging_power_kw} kW</div>
                    <div>Cijena: {ev.price_eur?.toLocaleString('hr-HR')} EUR</div>
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
                  onClick={() => decrementVehicle(modelKey)}
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
                  onChange={(e) => handleVehicleCountChange(modelKey, e.target.value)}
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
                  onClick={() => incrementVehicle(modelKey)}
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

      {totalVehicles > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f0fdf4',
          borderRadius: '10px',
          border: '2px solid #10b981'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#166534' }}>
            Odabrana konfiguracija:
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
            fontSize: '0.9rem'
          }}>
            {Object.entries(vehicleConfig)
              .filter(([_, count]) => count > 0)
              .map(([model, count]) => (
                <div key={model} style={{ color: '#166534' }}>
                  <strong>{model}:</strong> {count} vozila
                </div>
              ))}
          </div>
        </div>
      )}

      {totalVehicles === 0 && (
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
};

export default VehicleSelector;