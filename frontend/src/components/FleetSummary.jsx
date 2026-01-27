import React from 'react';

function FleetSummary({ fleetSummary }) {
  return (
    <div className="summary-box">
      <h3>Sažetak flote:</h3>
      <div className="summary-grid">
        <div>
          <strong>Ukupno vozila:</strong> {fleetSummary.num_evs}
        </div>
        <div>
          <strong>Prosječan početni SOC:</strong> {(fleetSummary.avg_initial_soc * 100).toFixed(1)}%
        </div>
        <div>
          <strong>Prosječan završni SOC:</strong> {(fleetSummary.avg_final_soc * 100).toFixed(1)}%
        </div>
        <div>
          <strong>Prosječna dnevna udaljenost:</strong> {fleetSummary.avg_trip_distance_km.toFixed(1)} km
        </div>
      </div>
    </div>
  );
}

export default FleetSummary;
