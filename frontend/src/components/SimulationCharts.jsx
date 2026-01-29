import React from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { baseChartOptions, peakShavingChartOptions, evActivityChartOptions, socChartOptions, comparisonChartOptions } from '../utils/chartConfig';
import {
  preparePowerChart,
  prepareCostChart,
  prepareEVActivityChart,
  prepareSOCChart,
  preparePeakShavingChart,
  prepareComparisonChart
} from '../utils/chartDataPreparation';

function SimulationCharts({ simulationData }) {
  // Detektiraj da li je dvotarifni ili trotarifni model
  const hasMidPeak = simulationData.results.some(r =>
    r.tariff_period === 'mid-peak' || r.tariff_period === 'mid_peak'
  );

  // Generiraj jedinstveni ključ za forsiranje re-renderanja chartova
  // Koristi hash od prvih nekoliko vrijednosti building_load
  const chartKey = simulationData.results.slice(0, 10).map(r => r.building_load_kw.toFixed(1)).join('-');

  return (
    <div className="charts-container">
      <div className="chart-wrapper">
        <h2>Energetska bilanca sustava</h2>
        <div className="chart-box">
          <Line key={`power-${chartKey}`} data={preparePowerChart(simulationData)} options={baseChartOptions} />
        </div>
        <div className="chart-info">
          <p><strong>Crvena:</strong> Potrošnja zgrade (P_zgrada)</p>
          <p><strong>Plava:</strong> Opterećenje s V2B optimizacijom (P_mreža)</p>
          <p><strong>Zelena:</strong> PV proizvodnja (P_PV)</p>
        </div>
      </div>

      <div className="chart-wrapper">
        <h2>V2B Peak Shaving - Smanjenje vršnog opterećenja</h2>
        <div className="chart-box">
          <Line key={`peak-${chartKey}`} data={preparePeakShavingChart(simulationData)} options={peakShavingChartOptions} />
        </div>
        <div className="chart-info">
          <p><strong>Crvena linija:</strong> Potrošnja zgrade bez optimizacije</p>
          <p><strong>Plava površina:</strong> Opterećenje s V2B (smanjeno)</p>
          <p><strong>Zelena površina:</strong> PV proizvodnja</p>
          <p><strong>Crveni stupci:</strong> EV punjenje (+{simulationData.kpis.total_ev_energy_charged_kwh.toFixed(1)} kWh)</p>
          <p><strong>Plavi stupci:</strong> EV pražnjenje V2B (-{simulationData.kpis.total_ev_energy_discharged_kwh.toFixed(1)} kWh)</p>
        </div>
      </div>

      <div className="chart-wrapper">
        <h2>Stanje napunjenosti baterija (SOC)</h2>
        <div className="chart-box">
          <Line key={`soc-${chartKey}`} data={prepareSOCChart(simulationData)} options={socChartOptions} />
        </div>
        <div className="chart-info">
          <p><strong>Formula:</strong> SoC_k+1 = SoC_k + (Δt/B) · (η_punj · P_punj - P_praž/η_praž)</p>
          <p><strong>Početni SOC:</strong> {(simulationData.fleet_summary.avg_initial_soc * 100).toFixed(1)}%</p>
          <p><strong>Završni SOC:</strong> {(simulationData.fleet_summary.avg_final_soc * 100).toFixed(1)}%</p>
        </div>
      </div>

      <div className="chart-wrapper">
        <h2>Distribucija troškova po tarifnim zonama</h2>
        <div className="chart-box">
          <Bar key={`cost-${chartKey}`} data={prepareCostChart(simulationData)} options={baseChartOptions} />
        </div>
        <div className="chart-info">
          {hasMidPeak ? (
            <>
              <p><strong>NT (Niska):</strong> 23:00-09:00 - 0.066 EUR/kWh</p>
              <p><strong>ST (Srednja):</strong> 09:00-10:00, 12:00-13:00, 17:00-23:00 - 0.125 EUR/kWh</p>
              <p><strong>VT (Visoka):</strong> 10:00-12:00, 13:00-17:00 - 0.213 EUR/kWh</p>
            </>
          ) : (
            <>
              <p><strong>NT (Niska tarifa):</strong> 21:00-07:00 - 0.066 EUR/kWh</p>
              <p><strong>VT (Visoka tarifa):</strong> 07:00-21:00 - 0.150 EUR/kWh</p>
            </>
          )}
        </div>
      </div>

      <div className="chart-wrapper">
        <h2>Aktivnost EV flote kroz dan</h2>
        <div className="chart-box">
          <Bar key={`ev-${chartKey}`} data={prepareEVActivityChart(simulationData)} options={evActivityChartOptions} />
        </div>
        <div className="chart-info">
          <p><strong>Crveno (+):</strong> Broj vozila koja se pune</p>
          <p><strong>Plavo (-):</strong> Broj vozila koja prazne bateriju (V2B)</p>
        </div>
      </div>

      <div className="chart-wrapper">
        <h2>Usporedba: Bez V2B vs S V2B</h2>
        <div className="chart-box">
          <Line key={`comp-${chartKey}`} data={prepareComparisonChart(simulationData)} options={comparisonChartOptions} />
        </div>
        <div className="chart-info">
          <p><strong>Crvena linija:</strong> Opterećenje mreže BEZ V2B (P_zgrada - P_PV)</p>
          <p><strong>Plava površina:</strong> Opterećenje mreže S V2B optimizacijom</p>
          
        </div>
      </div>
    </div>
  );
}

export default SimulationCharts;
