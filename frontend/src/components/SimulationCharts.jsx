import React from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { baseChartOptions, peakShavingChartOptions, evActivityChartOptions } from '../utils/chartConfig';
import {
  preparePowerChart,
  prepareCostChart,
  prepareEVActivityChart,
  prepareSOCChart,
  preparePeakShavingChart
} from '../utils/chartDataPreparation';

function SimulationCharts({ simulationData }) {
  return (
    <div className="charts-container">
      <div className="chart-wrapper">
        <h2>Energetski tokovi (24h)</h2>
        <div className="chart-box">
          <Line data={preparePowerChart(simulationData)} options={baseChartOptions} />
        </div>
      </div>

      <div className="chart-wrapper">
        <h2>Smanjenje vrsnog opterecenja (V2B analiza)</h2>
        <div className="chart-box">
          <Line data={preparePeakShavingChart(simulationData)} options={peakShavingChartOptions} />
        </div>
        <div className="chart-info">
          <p>
            <strong>Baseline:</strong> Opterecenje bez V2B (crvena linija)
          </p>
          <p>
            <strong>S V2B:</strong> Smanjeno opterecenje koristenjem baterija vozila (zelena linija)
          </p>
          <p>
            <strong>Ustedeno:</strong> Razlika energije (zeleni barovi) = {simulationData.kpis.total_ev_energy_discharged_kwh.toFixed(1)} kWh
          </p>
        </div>
      </div>

      <div className="chart-wrapper">
        <h2>Napunjenost vozila kroz dan (SOC)</h2>
        <div className="chart-box">
          <Line data={prepareSOCChart(simulationData)} options={baseChartOptions} />
        </div>
        <div className="chart-info">
          <p>
            <strong>Pocetni SOC:</strong> {(simulationData.fleet_summary.avg_initial_soc * 100).toFixed(1)}%
          </p>
          <p>
            <strong>Zavrsni SOC:</strong> {(simulationData.fleet_summary.avg_final_soc * 100).toFixed(1)}%
          </p>
          <p>
            <strong>Vozila s ciljanim SOC-om:</strong> {simulationData.kpis.evs_meeting_target} / {simulationData.kpis.total_evs} ({simulationData.kpis.ev_success_rate_percent.toFixed(1)}%)
          </p>
        </div>
      </div>

      <div className="chart-wrapper">
        <h2>Distribucija troskova po tarifama</h2>
        <div className="chart-box">
          <Bar data={prepareCostChart(simulationData)} options={baseChartOptions} />
        </div>
      </div>

      <div className="chart-wrapper">
        <h2>Aktivnost elektricnih vozila</h2>
        <div className="chart-box">
          <Bar data={prepareEVActivityChart(simulationData)} options={evActivityChartOptions} />
        </div>
      </div>
    </div>
  );
}

export default SimulationCharts;
