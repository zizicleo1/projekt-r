import React from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { baseChartOptions, peakShavingChartOptions, evActivityChartOptions } from '../utils/chartConfig';
import { preparePowerChart, preparePeakShavingChart, prepareEVActivityChart, prepareComparisonCostChart } from '../utils/chartDataPreparation';

function TariffComparison({ comparisonData }) {
  const { tariff1, tariff2 } = comparisonData;

  return (
    <div style={{ marginTop: '30px' }}>
      <FinancialComparisonHeader tariff1={tariff1} tariff2={tariff2} />
      <PowerFlowComparison tariff1={tariff1} tariff2={tariff2} />
      <PeakShavingComparison tariff1={tariff1} tariff2={tariff2} />
      <CostDistributionComparison tariff1={tariff1} tariff2={tariff2} />
      <EVActivityComparison tariff1={tariff1} tariff2={tariff2} />
      <DetailedComparisonTable tariff1={tariff1} tariff2={tariff2} />
    </div>
  );
}

function FinancialComparisonHeader({ tariff1, tariff2 }) {
  const diff = Math.abs(tariff1.kpis.total_cost_eur - tariff2.kpis.total_cost_eur);
  const troCheaper = tariff1.kpis.total_cost_eur < tariff2.kpis.total_cost_eur;

  return (
    <div style={{
      background: 'white',
      padding: '25px',
      borderRadius: '15px',
      marginBottom: '30px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>Financijska usporedba</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#dbeafe', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>Trotarifna naplata</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
            {formatCurrency(tariff1.kpis.total_cost_eur)}
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>Razlika</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: troCheaper ? '#10b981' : '#ef4444' }}>
            {formatCurrency(diff)}
          </div>
          <div style={{ fontSize: '0.85rem', marginTop: '5px', color: '#666' }}>
            {troCheaper ? 'Trotarifna jeftinija' : 'Dvotarifna jeftinija'}
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#dcfce7', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>Dvotarifna naplata</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
            {formatCurrency(tariff2.kpis.total_cost_eur)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartSection({ title, children }) {
  return (
    <div style={{
      background: 'white',
      padding: '25px',
      borderRadius: '15px',
      marginBottom: '30px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginBottom: '20px', fontSize: '1.3rem', textAlign: 'center' }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {children}
      </div>
    </div>
  );
}

function ChartColumn({ title, color, bgColor, children, stats }) {
  return (
    <div>
      <h4 style={{ textAlign: 'center', marginBottom: '15px', color, fontSize: '1.1rem', fontWeight: '600' }}>
        {title}
      </h4>
      <div style={{ height: '350px' }}>{children}</div>
      {stats && (
        <div style={{ marginTop: '15px', padding: '15px', backgroundColor: bgColor, borderRadius: '8px', fontSize: '0.9rem' }}>
          {stats}
        </div>
      )}
    </div>
  );
}

function PowerFlowComparison({ tariff1, tariff2 }) {
  return (
    <ChartSection title="Energetski tokovi (24h) - Usporedba">
      <ChartColumn
        title="Trotarifna naplata (VT/ST/NT)"
        color="#3b82f6"
        bgColor="#f0f9ff"
        stats={
          <>
            <div><strong>Vršna snaga:</strong> {formatNumber(tariff1.kpis.peak_load_with_v2b_kw)} kW</div>
            <div><strong>Ukupni trošak:</strong> {formatCurrency(tariff1.kpis.total_cost_eur)}</div>
          </>
        }
      >
        <Line data={preparePowerChart(tariff1)} options={baseChartOptions} />
      </ChartColumn>

      <ChartColumn
        title="Dvotarifna naplata (VT/NT)"
        color="#10b981"
        bgColor="#f0fdf4"
        stats={
          <>
            <div><strong>Vršna snaga:</strong> {formatNumber(tariff2.kpis.peak_load_with_v2b_kw)} kW</div>
            <div><strong>Ukupni trošak:</strong> {formatCurrency(tariff2.kpis.total_cost_eur)}</div>
          </>
        }
      >
        <Line data={preparePowerChart(tariff2)} options={baseChartOptions} />
      </ChartColumn>
    </ChartSection>
  );
}

function PeakShavingComparison({ tariff1, tariff2 }) {
  return (
    <ChartSection title="Smanjenje vršnog opterećenja (V2B analiza) - Usporedba">
      <ChartColumn
        title="Trotarifna naplata"
        color="#3b82f6"
        bgColor="#f0f9ff"
        stats={
          <>
            <div><strong>Smanjenje vršnog opterećenja:</strong> {formatNumber(tariff1.kpis.peak_reduction_percent)}%</div>
            <div><strong>Ukupno pražnjeno:</strong> {formatNumber(tariff1.kpis.total_ev_energy_discharged_kwh)} kWh</div>
          </>
        }
      >
        <Line data={preparePeakShavingChart(tariff1)} options={peakShavingChartOptions} />
      </ChartColumn>

      <ChartColumn
        title="Dvotarifna naplata"
        color="#10b981"
        bgColor="#f0fdf4"
        stats={
          <>
            <div><strong>Smanjenje vršnog opterećenja:</strong> {formatNumber(tariff2.kpis.peak_reduction_percent)}%</div>
            <div><strong>Ukupno pražnjeno:</strong> {formatNumber(tariff2.kpis.total_ev_energy_discharged_kwh)} kWh</div>
          </>
        }
      >
        <Line data={preparePeakShavingChart(tariff2)} options={peakShavingChartOptions} />
      </ChartColumn>
    </ChartSection>
  );
}

function CostDistributionComparison({ tariff1, tariff2 }) {
  return (
    <ChartSection title="Distribucija troškova po tarifama - Usporedba">
      <ChartColumn
        title="Trotarifna naplata (VT/ST/NT)"
        color="#3b82f6"
        bgColor="#f0f9ff"
        stats={
          <>
            <div><strong>VT:</strong> 0.213 EUR/kWh</div>
            <div><strong>ST:</strong> 0.125 EUR/kWh</div>
            <div><strong>NT:</strong> 0.066 EUR/kWh</div>
          </>
        }
      >
        <Bar data={prepareComparisonCostChart(tariff1, true)} options={baseChartOptions} />
      </ChartColumn>

      <ChartColumn
        title="Dvotarifna naplata (VT/NT)"
        color="#10b981"
        bgColor="#f0fdf4"
        stats={
          <>
            <div><strong>VT:</strong> 0.150 EUR/kWh</div>
            <div><strong>NT:</strong> 0.066 EUR/kWh</div>
            <div style={{ marginTop: '5px', opacity: 0.5 }}><strong>ST:</strong> N/A</div>
          </>
        }
      >
        <Bar data={prepareComparisonCostChart(tariff2, false)} options={baseChartOptions} />
      </ChartColumn>
    </ChartSection>
  );
}

function EVActivityComparison({ tariff1, tariff2 }) {
  return (
    <ChartSection title="Aktivnost električnih vozila - Usporedba">
      <ChartColumn
        title="Trotarifna naplata"
        color="#3b82f6"
        bgColor="#f0f9ff"
        stats={
          <>
            <div><strong>Ukupno punjeno:</strong> {formatNumber(tariff1.kpis.total_ev_energy_charged_kwh)} kWh</div>
            <div><strong>Uspješnost punjenja:</strong> {formatNumber(tariff1.kpis.ev_success_rate_percent)}%</div>
          </>
        }
      >
        <Bar data={prepareEVActivityChart(tariff1)} options={evActivityChartOptions} />
      </ChartColumn>

      <ChartColumn
        title="Dvotarifna naplata"
        color="#10b981"
        bgColor="#f0fdf4"
        stats={
          <>
            <div><strong>Ukupno punjeno:</strong> {formatNumber(tariff2.kpis.total_ev_energy_charged_kwh)} kWh</div>
            <div><strong>Uspješnost punjenja:</strong> {formatNumber(tariff2.kpis.ev_success_rate_percent)}%</div>
          </>
        }
      >
        <Bar data={prepareEVActivityChart(tariff2)} options={evActivityChartOptions} />
      </ChartColumn>
    </ChartSection>
  );
}

function DetailedComparisonTable({ tariff1, tariff2 }) {
  const rows = [
    {
      label: 'Ukupni trošak',
      val1: formatCurrency(tariff1.kpis.total_cost_eur),
      val2: formatCurrency(tariff2.kpis.total_cost_eur),
      diff: formatCurrency(Math.abs(tariff1.kpis.total_cost_eur - tariff2.kpis.total_cost_eur))
    },
    {
      label: 'Vršna snaga',
      val1: `${formatNumber(tariff1.kpis.peak_load_with_v2b_kw)} kW`,
      val2: `${formatNumber(tariff2.kpis.peak_load_with_v2b_kw)} kW`,
      diff: `${formatNumber(Math.abs(tariff1.kpis.peak_load_with_v2b_kw - tariff2.kpis.peak_load_with_v2b_kw))} kW`
    },
    {
      label: 'Smanjenje vršnog opterećenja',
      val1: `${formatNumber(tariff1.kpis.peak_reduction_percent)}%`,
      val2: `${formatNumber(tariff2.kpis.peak_reduction_percent)}%`,
      diff: `${formatNumber(Math.abs(tariff1.kpis.peak_reduction_percent - tariff2.kpis.peak_reduction_percent))}%`
    },
    {
      label: 'Ukupno punjeno',
      val1: `${formatNumber(tariff1.kpis.total_ev_energy_charged_kwh)} kWh`,
      val2: `${formatNumber(tariff2.kpis.total_ev_energy_charged_kwh)} kWh`,
      diff: `${formatNumber(Math.abs(tariff1.kpis.total_ev_energy_charged_kwh - tariff2.kpis.total_ev_energy_charged_kwh))} kWh`
    },
    {
      label: 'Ukupno pražnjeno (V2B)',
      val1: `${formatNumber(tariff1.kpis.total_ev_energy_discharged_kwh)} kWh`,
      val2: `${formatNumber(tariff2.kpis.total_ev_energy_discharged_kwh)} kWh`,
      diff: `${formatNumber(Math.abs(tariff1.kpis.total_ev_energy_discharged_kwh - tariff2.kpis.total_ev_energy_discharged_kwh))} kWh`
    }
  ];

  return (
    <div style={{
      background: 'white',
      padding: '25px',
      borderRadius: '15px',
      marginBottom: '30px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>Detaljna usporedba parametara</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ textAlign: 'left', padding: '15px' }}>Parametar</th>
            <th style={{ textAlign: 'right', padding: '15px', color: '#3b82f6' }}>Trotarifna</th>
            <th style={{ textAlign: 'right', padding: '15px', color: '#10b981' }}>Dvotarifna</th>
            <th style={{ textAlign: 'right', padding: '15px' }}>Razlika</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} style={{ borderBottom: idx < rows.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
              <td style={{ padding: '15px' }}>{row.label}</td>
              <td style={{ textAlign: 'right', padding: '15px' }}>{row.val1}</td>
              <td style={{ textAlign: 'right', padding: '15px' }}>{row.val2}</td>
              <td style={{ textAlign: 'right', padding: '15px', fontWeight: 'bold' }}>{row.diff}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TariffComparison;
