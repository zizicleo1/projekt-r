import React from 'react';

function FleetSummary({ fleetSummary }) {
  return (
    <div className="summary-box">
      <h3>Sazetak flote:</h3>
      <div className="summary-grid">
        <div>
          <strong>Ukupno vozila:</strong> {fleetSummary.num_evs}
        </div>
        <div>
          <strong>Prosjecan pocetni SOC:</strong> {(fleetSummary.avg_initial_soc * 100).toFixed(1)}%
        </div>
        <div>
          <strong>Prosjecan zavrsni SOC:</strong> {(fleetSummary.avg_final_soc * 100).toFixed(1)}%
        </div>
        <div>
          <strong>Prosjecna dnevna udaljenost:</strong> {fleetSummary.avg_trip_distance_km.toFixed(1)} km
        </div>
      </div>
    </div>
  );
}

export default FleetSummary;
