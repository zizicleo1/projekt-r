
import React, { useState, useEffect } from 'react';


import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import './App.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_URL = 'http://localhost:8000';

function App() {
  // STATE VARIABLES
  const [numEVs, setNumEVs] = useState(30);
  const [pvScaling, setPvScaling] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  const [error, setError] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [buildingType, setBuildingType] = useState('office');
  const [useCroatianTariff, setUseCroatianTariff] = useState(true);
  const [buildingTypes, setBuildingTypes] = useState([]);
  const [croatianTariff, setCroatianTariff] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState({ tariff1: null, tariff2: null });
  const [loadingComparison, setLoadingComparison] = useState(false);

  // USEEFFECT - INITIALIZATION
  useEffect(() => {
    checkBackend();
    fetchScenarios();
    fetchBuildingTypes();
    fetchCroatianTariff();
  }, []);

  // API FUNCTIONS
  const checkBackend = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('error');
        setError('Backend ne odgovara ispravno');
      }
    } catch (err) {
      setBackendStatus('error');
      setError('Backend nije dostupan. Pokreni: python main.py');
      console.error('Backend connection failed:', err);
    }
  };

  const fetchScenarios = async () => {
    try {
      const response = await fetch(`${API_URL}/api/scenarios`);
      if (response.ok) {
        const data = await response.json();
        setScenarios(data.scenarios || []);
      }
    } catch (err) {
      console.error('Failed to fetch scenarios:', err);
    }
  };

  const fetchBuildingTypes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/building-types`);
      if (response.ok) {
        const data = await response.json();
        setBuildingTypes(data.building_types || []);
        console.log('Building types loaded:', data.building_types);
      }
    } catch (err) {
      console.error('Failed to fetch building types:', err);
      setBuildingTypes([
        { id: 'office', name: 'Poslovna zgrada', description: 'Uredski prostor' },
        { id: 'hospital', name: 'Bolnica', description: '24/7 rad' },
        { id: 'shopping_center', name: 'Trgovački centar', description: 'Shopping mall' }
      ]);
    }
  };

  const fetchCroatianTariff = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tariff/croatia`);
      if (response.ok) {
        const data = await response.json();
        setCroatianTariff(data.tariff);
        console.log('Croatian tariff loaded:', data.tariff);
      }
    } catch (err) {
      console.error('Failed to fetch Croatian tariff:', err);
    }
  };

  const runSimulation = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Starting ADVANCED simulation: ${numEVs} EVs, ${buildingType}, PV: ${pvScaling}x`);
      
      const response = await fetch(`${API_URL}/api/simulate-advanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          num_evs: numEVs,
          scenario_name: `${buildingType}_${numEVs}EVs`,
          pv_scaling: pvScaling,
          building_type: buildingType,
          use_croatian_tariff: useCroatianTariff
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        setSimulationData(data.data);
        console.log('Simulation completed:', data.data.kpis);
      } else {
        throw new Error(data.error || 'Simulation failed');
      }
    } catch (err) {
      setError(`Greska: ${err.message}`);
      console.error('Simulation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const runTariffComparison = async () => {
    setLoadingComparison(true);
    setError(null);
    setShowComparison(true);

    try {
      console.log(`Running tariff comparison: ${numEVs} EVs, ${buildingType}, PV: ${pvScaling}x`);
      
      const config = {
        num_evs: numEVs,
        scenario_name: `${buildingType}_${numEVs}EVs`,
        pv_scaling: pvScaling,
        building_type: buildingType
      };

      const [response1, response2] = await Promise.all([
        fetch(`${API_URL}/api/simulate-advanced`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...config, use_croatian_tariff: true })
        }),
        fetch(`${API_URL}/api/simulate-advanced`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...config, use_croatian_tariff: false })
        })
      ]);

      if (!response1.ok || !response2.ok) {
        throw new Error('Greška pri usporedbi tarifa');
      }

      const data1 = await response1.json();
      const data2 = await response2.json();

      if (data1.status === 'success' && data2.status === 'success') {
        setComparisonData({
          tariff1: data1.data,
          tariff2: data2.data
        });
        console.log('Comparison completed');
      } else {
        throw new Error('Comparison failed');
      }
    } catch (err) {
      setError(`Greška pri usporedbi: ${err.message}`);
      console.error('Comparison error:', err);
    } finally {
      setLoadingComparison(false);
    }
  };

  const handleNumEVsChange = (value) => {
    const num = parseInt(value);
    if (isNaN(num)) {
      setNumEVs('');
    } else if (num > 100) {
      setNumEVs(100);
    } else if (num < 1) {
      setNumEVs(1);
    } else {
      setNumEVs(num);
    }
  };

  // CHART DATA PREPARATION
  const preparePowerChart = () => {
    if (!simulationData) return null;

    const results = simulationData.results;
    const labels = results.map((r, idx) => idx % 4 === 0 ? r.time : '');

    return {
      labels,
      datasets: [
        {
          label: 'Potrosnja zgrade (kW)',
          data: results.map(r => r.building_load_kw),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'PV proizvodnja (kW)',
          data: results.map(r => r.pv_generation_kw),
          borderColor: 'rgb(75, 192, 75)',
          backgroundColor: 'rgba(75, 192, 75, 0.2)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'EV snaga (kW)',
          data: results.map(r => r.ev_power_kw),
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Grid snaga (kW)',
          data: results.map(r => r.grid_power_kw),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderWidth: 2,
          tension: 0.4,
        },
      ],
    };
  };

  const prepareCostChart = () => {
    if (!simulationData) return null;

    const results = simulationData.results;
    const labels = results.map((r, idx) => idx % 4 === 0 ? r.time : '');

    const offPeak = results.map(r => r.tariff_period === 'off-peak' || r.tariff_period === 'off_peak' ? r.cost_eur : 0);
    const midPeak = results.map(r => r.tariff_period === 'mid-peak' || r.tariff_period === 'mid_peak' ? r.cost_eur : 0);
    const onPeak = results.map(r => r.tariff_period === 'on-peak' || r.tariff_period === 'on_peak' ? r.cost_eur : 0);

    return {
      labels,
      datasets: [
        {
          label: 'Off-Peak (EUR)',
          data: offPeak,
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          stack: 'Stack 0',
        },
        {
          label: 'Mid-Peak (EUR)',
          data: midPeak,
          backgroundColor: 'rgba(255, 206, 86, 0.7)',
          stack: 'Stack 0',
        },
        {
          label: 'On-Peak (EUR)',
          data: onPeak,
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          stack: 'Stack 0',
        },
      ],
    };
  };

  const prepareEVActivityChart = () => {
    if (!simulationData) return null;

    const results = simulationData.results;
    const labels = results.map((r, idx) => idx % 4 === 0 ? r.time : '');

    return {
      labels,
      datasets: [
        {
          label: 'EVs punjenje',
          data: results.map(r => r.num_evs_charging),
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          stack: 'Stack 0',
        },
        {
          label: 'EVs praznjenje (V2B)',
          data: results.map(r => -r.num_evs_discharging),
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          stack: 'Stack 0',
        },
      ],
    };
  };

  const prepareSOCChart = () => {
    if (!simulationData) return null;

    const results = simulationData.results;
    const labels = results.map((r, idx) => idx % 4 === 0 ? r.time : '');

    let avgSOC = simulationData.fleet_summary.avg_initial_soc * 100;
    const socData = results.map(r => {
      if (r.num_evs_charging > 0) {
        avgSOC += 0.5;
      }
      if (r.num_evs_discharging > 0) {
        avgSOC -= 0.3;
      }
      return Math.min(100, Math.max(0, avgSOC));
    });

    return {
      labels,
      datasets: [
        {
          label: 'Prosjecan SOC (%)',
          data: socData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
        },
        {
          label: 'Ciljni SOC (%)',
          data: Array(96).fill(simulationData.fleet_summary.avg_final_soc * 100),
          borderColor: 'rgb(255, 99, 132)',
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    };
  };

  const preparePeakShavingChart = () => {
    if (!simulationData) return null;

    const results = simulationData.results;
    const labels = results.map((r, idx) => idx % 4 === 0 ? r.time : '');

    const baseline = results.map(r => r.building_load_kw - r.pv_generation_kw);
    const withV2B = results.map(r => r.grid_power_kw);
    const reduction = baseline.map((b, idx) => Math.max(0, b - withV2B[idx]));

    return {
      labels,
      datasets: [
        {
          label: 'Baseline opterecenje (bez V2B)',
          data: baseline,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          fill: false,
          tension: 0.4,
          borderWidth: 2,
        },
        {
          label: 'Opterecenje s V2B',
          data: withV2B,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
        },
        {
          label: 'Ustedeno (kW)',
          data: reduction,
          type: 'bar',
          backgroundColor: 'rgba(75, 192, 75, 0.5)',
          yAxisID: 'y1',
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        }
      },
      y: {
        beginAtZero: true,
      }
    }
  };

  const peakShavingOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Snaga (kW)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Smanjenje (kW)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('hr-HR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('hr-HR', {
      maximumFractionDigits: 2
    }).format(value);
  };

  // COMPARISON CHART PREPARATION
  const prepareComparisonPowerChart = (data) => {
    if (!data) return null;

    const results = data.results;
    const labels = results.map((r, idx) => idx % 4 === 0 ? r.time : '');

    return {
      labels,
      datasets: [
        {
          label: 'Potrosnja zgrade (kW)',
          data: results.map(r => r.building_load_kw),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'PV proizvodnja (kW)',
          data: results.map(r => r.pv_generation_kw),
          borderColor: 'rgb(75, 192, 75)',
          backgroundColor: 'rgba(75, 192, 75, 0.2)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'EV snaga (kW)',
          data: results.map(r => r.ev_power_kw),
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Grid snaga (kW)',
          data: results.map(r => r.grid_power_kw),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderWidth: 2,
          tension: 0.4,
        },
      ],
    };
  };

  const prepareComparisonPeakShavingChart = (data) => {
    if (!data) return null;

    const results = data.results;
    const labels = results.map((r, idx) => idx % 4 === 0 ? r.time : '');

    const baseline = results.map(r => r.building_load_kw - r.pv_generation_kw);
    const withV2B = results.map(r => r.grid_power_kw);
    const reduction = baseline.map((b, idx) => Math.max(0, b - withV2B[idx]));

    return {
      labels,
      datasets: [
        {
          label: 'Baseline (bez V2B)',
          data: baseline,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          fill: false,
          tension: 0.4,
          borderWidth: 2,
        },
        {
          label: 'S V2B',
          data: withV2B,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
        },
        {
          label: 'Ušteda (kW)',
          data: reduction,
          type: 'bar',
          backgroundColor: 'rgba(75, 192, 75, 0.5)',
          yAxisID: 'y1',
        },
      ],
    };
  };

  // FIXED: Separate logic for Croatian (3-zone) vs HEP (2-zone) tariff
  const prepareComparisonCostChart = (data, isCroatianTariff) => {
    if (!data) return null;

    const results = data.results;
    const labels = results.map((r, idx) => idx % 4 === 0 ? r.time : '');

    if (isCroatianTariff) {
      // Hrvatska tarifa - 3 zone (VT, ST, NT)
      const offPeak = results.map(r => r.tariff_period === 'off-peak' || r.tariff_period === 'off_peak' ? r.cost_eur : 0);
      const midPeak = results.map(r => r.tariff_period === 'mid-peak' || r.tariff_period === 'mid_peak' ? r.cost_eur : 0);
      const onPeak = results.map(r => r.tariff_period === 'on-peak' || r.tariff_period === 'on_peak' ? r.cost_eur : 0);

      return {
        labels,
        datasets: [
          {
            label: 'NT (Niska tarifa)',
            data: offPeak,
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            stack: 'Stack 0',
          },
          {
            label: 'ST (Srednja tarifa)',
            data: midPeak,
            backgroundColor: 'rgba(255, 206, 86, 0.7)',
            stack: 'Stack 0',
          },
          {
            label: 'VT (Visoka tarifa)',
            data: onPeak,
            backgroundColor: 'rgba(255, 99, 132, 0.7)',
            stack: 'Stack 0',
          },
        ],
      };
    } else {
      // HEP tarifa - 2 zone (VT, NT) - NO MID-PEAK!
      const offPeak = results.map(r => r.tariff_period === 'off-peak' || r.tariff_period === 'off_peak' ? r.cost_eur : 0);
      const onPeak = results.map(r => r.tariff_period === 'on-peak' || r.tariff_period === 'on_peak' ? r.cost_eur : 0);

      return {
        labels,
        datasets: [
          {
            label: 'NT (Niža tarifa)',
            data: offPeak,
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            stack: 'Stack 0',
          },
          {
            label: 'VT (Viša tarifa)',
            data: onPeak,
            backgroundColor: 'rgba(255, 99, 132, 0.7)',
            stack: 'Stack 0',
          },
        ],
      };
    }
  };

  const prepareComparisonEVActivityChart = (data) => {
    if (!data) return null;

    const results = data.results;
    const labels = results.map((r, idx) => idx % 4 === 0 ? r.time : '');

    return {
      labels,
      datasets: [
        {
          label: 'EVs punjenje',
          data: results.map(r => r.num_evs_charging),
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          stack: 'Stack 0',
        },
        {
          label: 'EVs pražnjenje (V2B)',
          data: results.map(r => -r.num_evs_discharging),
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          stack: 'Stack 0',
        },
      ],
    };
  };

  // RENDER
  return (
    <div className="app">
      {/* HEADER */}
      <header className="app-header">
        <h1>V2B Digital Twin</h1>
        <p>Vehicle-to-Building Energy Management System</p>
      </header>

      {/* CONTROL PANEL */}
      <div className="control-panel">
        <div className="controls">
          {/* Number of EVs */}
          <div className="control-group">
            <label>
              Broj elektricnih vozila:
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                value={numEVs}
                onChange={(e) => handleNumEVsChange(e.target.value)}
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

          {/* Building Type */}
          <div className="control-group">
            <label>
              Tip zgrade:
              <select 
                value={buildingType}
                onChange={(e) => setBuildingType(e.target.value)}
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

          {/* PV Scaling */}
          <div className="control-group">
            <label>
              PV skaliranje: <strong>{pvScaling.toFixed(1)}x</strong>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={pvScaling}
                onChange={(e) => setPvScaling(parseFloat(e.target.value))}
                disabled={loading || loadingComparison}
              />
              <small>Min: 0.5x | Max: 2.0x ({(pvScaling * 30).toFixed(0)} kW)</small>
            </label>
          </div>

          {/* Croatian Tariff - Only show when not in comparison mode */}
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
                    onChange={(e) => setUseCroatianTariff(e.target.checked)}
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

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
          <button 
            className="btn-primary" 
            onClick={runSimulation}
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
            onClick={() => {
              setShowComparison(!showComparison);
              if (!showComparison) {
                runTariffComparison();
              }
            }}
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

      {/* ERROR BOX */}
      {error && (
        <div className="error-box">
          {error}
          <button onClick={checkBackend} className="btn-retry">
            Pokusaj ponovno
          </button>
        </div>
      )}

      {/* TARIFF COMPARISON VIEW */}
      {showComparison && comparisonData.tariff1 && comparisonData.tariff2 && (
        <div style={{ marginTop: '30px' }}>
          {/* Financial Comparison Header */}
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
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>
                  Hrvatska tarifa
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                  {formatCurrency(comparisonData.tariff1.kpis.total_cost_eur)}
                </div>
              </div>
              
              <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>
                  Razlika
                </div>
                <div style={{ 
                  fontSize: '2rem', 
                  fontWeight: 'bold',
                  color: comparisonData.tariff1.kpis.total_cost_eur < comparisonData.tariff2.kpis.total_cost_eur ? '#10b981' : '#ef4444'
                }}>
                  {formatCurrency(Math.abs(comparisonData.tariff1.kpis.total_cost_eur - comparisonData.tariff2.kpis.total_cost_eur))}
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: '5px', color: '#666' }}>
                  {comparisonData.tariff1.kpis.total_cost_eur < comparisonData.tariff2.kpis.total_cost_eur 
                    ? 'Hrvatska jeftinija' 
                    : 'HEP jeftinija'}
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#dcfce7', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>
                  HEP tarifa
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                  {formatCurrency(comparisonData.tariff2.kpis.total_cost_eur)}
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-side Charts */}
          <div style={{ marginBottom: '30px' }}>
            {/* Power Flow Comparison */}
            <div style={{
              background: 'white',
              padding: '25px',
              borderRadius: '15px',
              marginBottom: '30px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.3rem', textAlign: 'center' }}>
                Energetski tokovi (24h) - Usporedba
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div>
                  <h4 style={{ 
                    textAlign: 'center', 
                    marginBottom: '15px', 
                    color: '#3b82f6',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}>
                    Hrvatska tarifa (3-zone)
                  </h4>
                  <div style={{ height: '350px' }}>
                    <Line data={prepareComparisonPowerChart(comparisonData.tariff1)} options={chartOptions} />
                  </div>
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '15px', 
                    backgroundColor: '#f0f9ff', 
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}>
                    <div><strong>Vršna snaga:</strong> {formatNumber(comparisonData.tariff1.kpis.peak_load_with_v2b_kw)} kW</div>
                    <div><strong>Ukupni trošak:</strong> {formatCurrency(comparisonData.tariff1.kpis.total_cost_eur)}</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ 
                    textAlign: 'center', 
                    marginBottom: '15px', 
                    color: '#10b981',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}>
                    HEP tarifa (2-zone)
                  </h4>
                  <div style={{ height: '350px' }}>
                    <Line data={prepareComparisonPowerChart(comparisonData.tariff2)} options={chartOptions} />
                  </div>
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '15px', 
                    backgroundColor: '#f0fdf4', 
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}>
                    <div><strong>Vršna snaga:</strong> {formatNumber(comparisonData.tariff2.kpis.peak_load_with_v2b_kw)} kW</div>
                    <div><strong>Ukupni trošak:</strong> {formatCurrency(comparisonData.tariff2.kpis.total_cost_eur)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Peak Shaving Comparison */}
            <div style={{
              background: 'white',
              padding: '25px',
              borderRadius: '15px',
              marginBottom: '30px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.3rem', textAlign: 'center' }}>
                Smanjenje vršnog opterećenja (V2B analiza) - Usporedba
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div>
                  <h4 style={{ 
                    textAlign: 'center', 
                    marginBottom: '15px', 
                    color: '#3b82f6',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}>
                    Hrvatska tarifa
                  </h4>
                  <div style={{ height: '350px' }}>
                    <Line data={prepareComparisonPeakShavingChart(comparisonData.tariff1)} options={peakShavingOptions} />
                  </div>
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '15px', 
                    backgroundColor: '#f0f9ff', 
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}>
                    <div><strong>Smanjenje vršnog opterećenja:</strong> {formatNumber(comparisonData.tariff1.kpis.peak_reduction_percent)}%</div>
                    <div><strong>Ukupno pražnjeno:</strong> {formatNumber(comparisonData.tariff1.kpis.total_ev_energy_discharged_kwh)} kWh</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ 
                    textAlign: 'center', 
                    marginBottom: '15px', 
                    color: '#10b981',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}>
                    HEP tarifa
                  </h4>
                  <div style={{ height: '350px' }}>
                    <Line data={prepareComparisonPeakShavingChart(comparisonData.tariff2)} options={peakShavingOptions} />
                  </div>
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '15px', 
                    backgroundColor: '#f0fdf4', 
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}>
                    <div><strong>Smanjenje vršnog opterećenja:</strong> {formatNumber(comparisonData.tariff2.kpis.peak_reduction_percent)}%</div>
                    <div><strong>Ukupno pražnjeno:</strong> {formatNumber(comparisonData.tariff2.kpis.total_ev_energy_discharged_kwh)} kWh</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cost Distribution Comparison - FIXED */}
            <div style={{
              background: 'white',
              padding: '25px',
              borderRadius: '15px',
              marginBottom: '30px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.3rem', textAlign: 'center' }}>
                Distribucija troškova po tarifama - Usporedba
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div>
                  <h4 style={{ 
                    textAlign: 'center', 
                    marginBottom: '15px', 
                    color: '#3b82f6',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}>
                    Hrvatska tarifa (VT/ST/NT)
                  </h4>
                  <div style={{ height: '350px' }}>
                    <Bar data={prepareComparisonCostChart(comparisonData.tariff1, true)} options={chartOptions} />
                  </div>
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '15px', 
                    backgroundColor: '#f0f9ff', 
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}>
                    <div><strong>VT:</strong> 0.213 EUR/kWh</div>
                    <div><strong>ST:</strong> 0.125 EUR/kWh</div>
                    <div><strong>NT:</strong> 0.066 EUR/kWh</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ 
                    textAlign: 'center', 
                    marginBottom: '15px', 
                    color: '#10b981',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}>
                    HEP tarifa (VT/NT)
                  </h4>
                  <div style={{ height: '350px' }}>
                    <Bar data={prepareComparisonCostChart(comparisonData.tariff2, false)} options={chartOptions} />
                  </div>
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '15px', 
                    backgroundColor: '#f0fdf4', 
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}>
                    <div><strong>VT:</strong> 0.122 EUR/kWh</div>
                    <div><strong>NT:</strong> 0.062 EUR/kWh</div>
                    <div style={{ marginTop: '5px', opacity: 0.5 }}><strong>ST:</strong> N/A</div>
                  </div>
                </div>
              </div>
            </div>

            {/* EV Activity Comparison */}
            <div style={{
              background: 'white',
              padding: '25px',
              borderRadius: '15px',
              marginBottom: '30px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.3rem', textAlign: 'center' }}>
                Aktivnost električnih vozila - Usporedba
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div>
                  <h4 style={{ 
                    textAlign: 'center', 
                    marginBottom: '15px', 
                    color: '#3b82f6',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}>
                    Hrvatska tarifa
                  </h4>
                  <div style={{ height: '350px' }}>
                    <Bar 
                      data={prepareComparisonEVActivityChart(comparisonData.tariff1)} 
                      options={{
                        ...chartOptions,
                        scales: {
                          ...chartOptions.scales,
                          y: {
                            beginAtZero: false,
                            title: {
                              display: true,
                              text: 'Broj vozila'
                            }
                          }
                        }
                      }} 
                    />
                  </div>
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '15px', 
                    backgroundColor: '#f0f9ff', 
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}>
                    <div><strong>Ukupno punjeno:</strong> {formatNumber(comparisonData.tariff1.kpis.total_ev_energy_charged_kwh)} kWh</div>
                    <div><strong>Uspješnost punjenja:</strong> {formatNumber(comparisonData.tariff1.kpis.ev_success_rate_percent)}%</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ 
                    textAlign: 'center', 
                    marginBottom: '15px', 
                    color: '#10b981',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}>
                    HEP tarifa
                  </h4>
                  <div style={{ height: '350px' }}>
                    <Bar 
                      data={prepareComparisonEVActivityChart(comparisonData.tariff2)} 
                      options={{
                        ...chartOptions,
                        scales: {
                          ...chartOptions.scales,
                          y: {
                            beginAtZero: false,
                            title: {
                              display: true,
                              text: 'Broj vozila'
                            }
                          }
                        }
                      }} 
                    />
                  </div>
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '15px', 
                    backgroundColor: '#f0fdf4', 
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}>
                    <div><strong>Ukupno punjeno:</strong> {formatNumber(comparisonData.tariff2.kpis.total_ev_energy_charged_kwh)} kWh</div>
                    <div><strong>Uspješnost punjenja:</strong> {formatNumber(comparisonData.tariff2.kpis.ev_success_rate_percent)}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Comparison Table */}
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
                  <th style={{ textAlign: 'right', padding: '15px', color: '#3b82f6' }}>Hrvatska tarifa</th>
                  <th style={{ textAlign: 'right', padding: '15px', color: '#10b981' }}>HEP tarifa</th>
                  <th style={{ textAlign: 'right', padding: '15px' }}>Razlika</th>
                  <th style={{ textAlign: 'center', padding: '15px' }}>Bolja</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '15px' }}>Ukupni trošak</td>
                  <td style={{ textAlign: 'right', padding: '15px' }}>
                    {formatCurrency(comparisonData.tariff1.kpis.total_cost_eur)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '15px' }}>
                    {formatCurrency(comparisonData.tariff2.kpis.total_cost_eur)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '15px', fontWeight: 'bold' }}>
                    {formatCurrency(Math.abs(comparisonData.tariff1.kpis.total_cost_eur - comparisonData.tariff2.kpis.total_cost_eur))}
                  </td>
                  <td style={{ textAlign: 'center', padding: '15px' }}>
                    <span style={{
                      padding: '5px 15px',
                      borderRadius: '20px',
                      backgroundColor: comparisonData.tariff1.kpis.total_cost_eur < comparisonData.tariff2.kpis.total_cost_eur ? '#dbeafe' : '#dcfce7',
                      color: comparisonData.tariff1.kpis.total_cost_eur < comparisonData.tariff2.kpis.total_cost_eur ? '#3b82f6' : '#10b981',
                      fontWeight: 'bold'
                    }}>
                      {comparisonData.tariff1.kpis.total_cost_eur < comparisonData.tariff2.kpis.total_cost_eur ? 'HRV' : 'HEP'}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '15px' }}>Vršna snaga</td>
                  <td style={{ textAlign: 'right', padding: '15px' }}>
                    {formatNumber(comparisonData.tariff1.kpis.peak_load_with_v2b_kw)} kW
                  </td>
                  <td style={{ textAlign: 'right', padding: '15px' }}>
                    {formatNumber(comparisonData.tariff2.kpis.peak_load_with_v2b_kw)} kW
                  </td>
                  <td style={{ textAlign: 'right', padding: '15px' }}>
                    {formatNumber(Math.abs(comparisonData.tariff1.kpis.peak_load_with_v2b_kw - comparisonData.tariff2.kpis.peak_load_with_v2b_kw))} kW
                  </td>
                  <td style={{ textAlign: 'center', padding: '15px' }}>
                    <span style={{
                      padding: '5px 15px',
                      borderRadius: '20px',
                      backgroundColor: comparisonData.tariff1.kpis.peak_load_with_v2b_kw < comparisonData.tariff2.kpis.peak_load_with_v2b_kw ? '#dbeafe' : '#dcfce7',
                      color: comparisonData.tariff1.kpis.peak_load_with_v2b_kw < comparisonData.tariff2.kpis.peak_load_with_v2b_kw ? '#3b82f6' : '#10b981',
                      fontWeight: 'bold'
                    }}>
                      {comparisonData.tariff1.kpis.peak_load_with_v2b_kw < comparisonData.tariff2.kpis.peak_load_with_v2b_kw ? 'HRV' : 'HEP'}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '15px' }}>Smanjenje vršnog opterećenja</td>
                  <td style={{ textAlign: 'right', padding: '15px' }}>
                    {formatNumber(comparisonData.tariff1.kpis.peak_reduction_percent)}%
                  </td>
                  <td style={{ textAlign: 'right', padding: '15px' }}>
                    {formatNumber(comparisonData.tariff2.kpis.peak_reduction_percent)}%
                  </td>
                  <td style={{ textAlign: 'right', padding: '15px' }}>
                    {formatNumber(Math.abs(comparisonData.tariff1.kpis.peak_reduction_percent - comparisonData.tariff2.kpis.peak_reduction_percent))}%
                  </td>
                  <td style={{ textAlign: 'center', padding: '15px' }}>
                    <span style={{
                      padding: '5px 15px',
                      borderRadius: '20px',
                      backgroundColor: comparisonData.tariff1.kpis.peak_reduction_percent > comparisonData.tariff2.kpis.peak_reduction_percent ? '#dbeafe' : '#dcfce7',
                      color: comparisonData.tariff1.kpis.peak_reduction_percent > comparisonData.tariff2.kpis.peak_reduction_percent ? '#3b82f6' : '#10b981',
                      fontWeight: 'bold'
                    }}>
                      {comparisonData.tariff1.kpis.peak_reduction_percent > comparisonData.tariff2.kpis.peak_reduction_percent ? 'HRV' : 'HEP'}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '15px' }}>Ukupno punjeno</td>
                  <td style={{ textAlign: 'right', padding: '15px' }}>
                    {formatNumber(comparisonData.tariff1.kpis.total_ev_energy_charged_kwh)} kWh
                  </td>
                  <td style={{ textAlign: 'right', padding: '15px' }}>
                    {formatNumber(comparisonData.tariff2.kpis.total_ev_energy_charged_kwh)} kWh
                  </td>
                  <td style={{ textAlign: 'right', padding: '15px' }}>
                    {formatNumber(Math.abs(comparisonData.tariff1.kpis.total_ev_energy_charged_kwh - comparisonData.tariff2.kpis.total_ev_energy_charged_kwh))} kWh
                  </td>
                  <td style={{ textAlign: 'center', padding: '15px', color: '#6b7280' }}>-</td>
                </tr>
                <tr>
                  <td style={{ padding: '15px' }}>Ukupno pražnjeno (V2B)</td>
                  <td style={{ textAlign: 'right', padding: '15px' }}>
                    {formatNumber(comparisonData.tariff1.kpis.total_ev_energy_discharged_kwh)} kWh
                  </td>
                  <td style={{ textAlign: 'right', padding: '15px' }}>
                    {formatNumber(comparisonData.tariff2.kpis.total_ev_energy_discharged_kwh)} kWh
                  </td>
                  <td style={{ textAlign: 'right', padding: '15px' }}>
                    {formatNumber(Math.abs(comparisonData.tariff1.kpis.total_ev_energy_discharged_kwh - comparisonData.tariff2.kpis.total_ev_energy_discharged_kwh))} kWh
                  </td>
                  <td style={{ textAlign: 'center', padding: '15px' }}>
                    <span style={{
                      padding: '5px 15px',
                      borderRadius: '20px',
                      backgroundColor: comparisonData.tariff1.kpis.total_ev_energy_discharged_kwh > comparisonData.tariff2.kpis.total_ev_energy_discharged_kwh ? '#dbeafe' : '#dcfce7',
                      color: comparisonData.tariff1.kpis.total_ev_energy_discharged_kwh > comparisonData.tariff2.kpis.total_ev_energy_discharged_kwh ? '#3b82f6' : '#10b981',
                      fontWeight: 'bold'
                    }}>
                      {comparisonData.tariff1.kpis.total_ev_energy_discharged_kwh > comparisonData.tariff2.kpis.total_ev_energy_discharged_kwh ? 'HRV' : 'HEP'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SIMULATION RESULTS (only show when not in comparison mode) */}
      {!showComparison && simulationData && (
        <>
          {/* Simulation Parameters Info Box */}
          <div className="info-box" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '25px',
            borderRadius: '15px',
            marginBottom: '30px',
            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
          }}>
            <h3 style={{ marginBottom: '15px', fontSize: '1.3rem', fontWeight: '700' }}>
              Parametri simulacije
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '20px' 
            }}>
              <div>
                <strong style={{ fontSize: '0.9rem', opacity: '0.9' }}>Tip zgrade:</strong>
                <div style={{ fontSize: '1.1rem', marginTop: '5px' }}>
                  {buildingTypes.find(t => t.id === buildingType)?.name || buildingType}
                </div>
              </div>
              <div>
                <strong style={{ fontSize: '0.9rem', opacity: '0.9' }}>Broj vozila:</strong>
                <div style={{ fontSize: '1.1rem', marginTop: '5px' }}>
                  {simulationData.fleet_summary.num_evs} EV
                </div>
              </div>
              <div>
                <strong style={{ fontSize: '0.9rem', opacity: '0.9' }}>PV sustav:</strong>
                <div style={{ fontSize: '1.1rem', marginTop: '5px' }}>
                  {pvScaling}x ({(pvScaling * 30).toFixed(0)} kW)
                </div>
              </div>
              <div>
                <strong style={{ fontSize: '0.9rem', opacity: '0.9' }}>Tarifa:</strong>
                <div style={{ fontSize: '1.1rem', marginTop: '5px' }}>
                  {useCroatianTariff ? 'Hrvatska (3-zone)' : 'HEP (2-zone)'}
                </div>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="kpi-container">
            <div className="kpi-card">
              <div className="kpi-icon" style={{ fontSize: '2rem' }}>EUR</div>
              <div className="kpi-value">{simulationData.kpis.total_cost_eur.toFixed(2)} EUR</div>
              <div className="kpi-label">Ukupni trosak</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ fontSize: '2rem' }}>%</div>
              <div className="kpi-value">{simulationData.kpis.peak_reduction_percent.toFixed(1)}%</div>
              <div className="kpi-label">Smanjenje vrsnog opterecenja</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ fontSize: '2rem' }}>kW</div>
              <div className="kpi-value">{simulationData.kpis.peak_load_with_v2b_kw.toFixed(1)} kW</div>
              <div className="kpi-label">Vrsno opterecenje (s V2B)</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ fontSize: '2rem' }}>OK</div>
              <div className="kpi-value">{simulationData.kpis.ev_success_rate_percent.toFixed(1)}%</div>
              <div className="kpi-label">Uspjesnost punjenja EV-ova</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ fontSize: '2rem' }}>+</div>
              <div className="kpi-value">{simulationData.kpis.total_ev_energy_charged_kwh.toFixed(1)} kWh</div>
              <div className="kpi-label">Ukupno punjeno</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ fontSize: '2rem' }}>-</div>
              <div className="kpi-value">{simulationData.kpis.total_ev_energy_discharged_kwh.toFixed(1)} kWh</div>
              <div className="kpi-label">Ukupno prazneno (V2B)</div>
            </div>
          </div>

          {/* Charts */}
          <div className="charts-container">
            {/* Power Flow Chart */}
            <div className="chart-wrapper">
              <h2>Energetski tokovi (24h)</h2>
              <div className="chart-box">
                <Line data={preparePowerChart()} options={chartOptions} />
              </div>
            </div>

            {/* Peak Shaving Chart */}
            <div className="chart-wrapper">
              <h2>Smanjenje vrsnog opterecenja (V2B analiza)</h2>
              <div className="chart-box">
                <Line data={preparePeakShavingChart()} options={peakShavingOptions} />
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

            {/* SOC Tracking Chart */}
            <div className="chart-wrapper">
              <h2>Napunjenost vozila kroz dan (SOC)</h2>
              <div className="chart-box">
                <Line data={prepareSOCChart()} options={chartOptions} />
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

            {/* Cost Distribution Chart */}
            <div className="chart-wrapper">
              <h2>Distribucija troskova po tarifama</h2>
              <div className="chart-box">
                <Bar data={prepareCostChart()} options={chartOptions} />
              </div>
            </div>

            {/* EV Activity Chart */}
            <div className="chart-wrapper">
              <h2>Aktivnost elektricnih vozila</h2>
              <div className="chart-box">
                <Bar 
                  data={prepareEVActivityChart()} 
                  options={{
                    ...chartOptions,
                    scales: {
                      ...chartOptions.scales,
                      y: {
                        beginAtZero: false,
                        title: {
                          display: true,
                          text: 'Broj vozila (punjenje: +, praznjenje: -)'
                        }
                      }
                    }
                  }} 
                />
              </div>
            </div>
          </div>

          {/* Fleet Summary */}
          <div className="summary-box">
            <h3>Sazetak flote:</h3>
            <div className="summary-grid">
              <div>
                <strong>Ukupno vozila:</strong> {simulationData.fleet_summary.num_evs}
              </div>
              <div>
                <strong>Prosjecan pocetni SOC:</strong> {(simulationData.fleet_summary.avg_initial_soc * 100).toFixed(1)}%
              </div>
              <div>
                <strong>Prosjecan zavrsni SOC:</strong> {(simulationData.fleet_summary.avg_final_soc * 100).toFixed(1)}%
              </div>
              <div>
                <strong>Prosjecna dnevna udaljenost:</strong> {simulationData.fleet_summary.avg_trip_distance_km.toFixed(1)} km
              </div>
            </div>
          </div>
        </>
      )}

   
    </div>
  );
}

export default App;