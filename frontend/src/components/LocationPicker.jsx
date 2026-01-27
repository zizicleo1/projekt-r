import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng
      });
    },
  });
  return null;
}

function LocationPicker({
  onLocationChange,
  onFetchPVGIS,
  pvgisData,
  loading,
  disabled = false
}) {
  const [position, setPosition] = useState({ latitude: 45.815, longitude: 15.982 });
  const [peakPower, setPeakPower] = useState(30);

  const handleLocationSelect = (loc) => {
    if (disabled) return;
    setPosition(loc);
    if (onLocationChange) {
      onLocationChange(loc);
    }
  };

  const handleFetchPVGIS = () => {
    if (onFetchPVGIS) {
      onFetchPVGIS({
        latitude: position.latitude,
        longitude: position.longitude,
        peakpower: peakPower,
        loss: 14,
        angle: 35,
        aspect: 0
      });
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '15px',
      padding: '25px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '1.3rem', color: '#333' }}>
        Odabir lokacije za PV sustav (PVGIS)
      </h3>

      <div style={{
        height: '350px',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '2px solid #e5e7eb',
        marginBottom: '20px'
      }}>
        <MapContainer
          center={[position.latitude, position.longitude]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[position.latitude, position.longitude]} />
          <MapClickHandler onLocationSelect={handleLocationSelect} />
        </MapContainer>
      </div>

      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'flex-end'
      }}>
        <div style={{
          padding: '15px',
          backgroundColor: '#f0f9ff',
          borderRadius: '10px',
          border: '2px solid #667eea',
          flex: '1',
          minWidth: '180px'
        }}>
          <strong style={{ color: '#667eea' }}>Odabrana lokacija:</strong>
          <div style={{ marginTop: '10px', fontSize: '0.9rem' }}>
            <div>Lat: {position.latitude.toFixed(4)}°</div>
            <div>Lon: {position.longitude.toFixed(4)}°</div>
          </div>
        </div>

        <div style={{ flex: '1', minWidth: '180px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
            PV kapacitet (kWp):
          </label>
          <input
            type="number"
            min="1"
            max="1000"
            step="1"
            value={peakPower}
            onChange={(e) => setPeakPower(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={disabled || loading}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #667eea',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              textAlign: 'center'
            }}
          />
        </div>

        <button
          onClick={handleFetchPVGIS}
          disabled={disabled || loading}
          style={{
            padding: '15px 30px',
            backgroundColor: loading ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: disabled || loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            minWidth: '200px'
          }}
        >
          {loading ? 'Dohvaćam...' : 'Dohvati PV profil'}
        </button>
      </div>

      {pvgisData && (
        <div style={{
          padding: '20px',
          backgroundColor: '#f0fdf4',
          borderRadius: '10px',
          border: '2px solid #10b981'
        }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#166534' }}>
            PVGIS rezultati za lokaciju ({pvgisData.location?.latitude.toFixed(2)}°, {pvgisData.location?.longitude.toFixed(2)}°)
          </h4>

          {pvgisData.monthly_production_kwh && (
            <div>
              <strong style={{ color: '#166534' }}>Mjesečna proizvodnja (kWh):</strong>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '8px',
                marginTop: '10px'
              }}>
                {['Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj', 'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac'].map((month, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px',
                      backgroundColor: '#dcfce7',
                      borderRadius: '5px',
                      textAlign: 'center',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: '#166534' }}>{month}</div>
                    <div>{pvgisData.monthly_production_kwh[`month_${i + 1}`]}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default LocationPicker;
