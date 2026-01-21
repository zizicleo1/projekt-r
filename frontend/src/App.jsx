import React from 'react';
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

import { useSimulation } from './hooks/useSimulation';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import VehicleSelector from './components/VehicleSelector';
import LocationPicker from './components/LocationPicker';
import ErrorBox from './components/ErrorBox';
import KPICards from './components/KPICards';
import SimulationParams from './components/SimulationParams';
import SimulationCharts from './components/SimulationCharts';
import FleetSummary from './components/FleetSummary';
import TariffComparison from './components/TariffComparison';

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

function App() {
  const {
    evCatalog,
    evFleetConfig,
    updateEvCount,
    fleetStats,
    pvgisData,
    loadingPvgis,
    fetchPVGISData,
    handleLocationChange,
    loading,
    simulationData,
    error,
    backendStatus,
    buildingType,
    setBuildingType,
    buildingTypes,
    simulationDate,
    setSimulationDate,
    useCroatianTariff,
    setUseCroatianTariff,
    showComparison,
    setShowComparison,
    comparisonData,
    loadingComparison,
    checkBackend,
    runSimulation,
    runTariffComparison,
  } = useSimulation();

  const handleToggleComparison = () => {
    setShowComparison(!showComparison);
    if (!showComparison) {
      runTariffComparison();
    }
  };

  return (
    <div className="app">
      <Header />

      <VehicleSelector
        evCatalog={evCatalog}
        evFleetConfig={evFleetConfig}
        onUpdateCount={updateEvCount}
        fleetStats={fleetStats}
        disabled={loading || loadingComparison}
      />

      <LocationPicker
        onLocationChange={handleLocationChange}
        onFetchPVGIS={fetchPVGISData}
        pvgisData={pvgisData}
        loading={loadingPvgis}
        disabled={loading || loadingComparison}
      />

      <ControlPanel
        buildingType={buildingType}
        onBuildingTypeChange={setBuildingType}
        buildingTypes={buildingTypes}
        simulationDate={simulationDate}
        onSimulationDateChange={setSimulationDate}
        useCroatianTariff={useCroatianTariff}
        onTariffChange={setUseCroatianTariff}
        showComparison={showComparison}
        loading={loading}
        loadingComparison={loadingComparison}
        backendStatus={backendStatus}
        fleetStats={fleetStats}
        onRunSimulation={runSimulation}
        onToggleComparison={handleToggleComparison}
      />

      <ErrorBox error={error} onRetry={checkBackend} />

      {showComparison && comparisonData.tariff1 && comparisonData.tariff2 && (
        <TariffComparison comparisonData={comparisonData} />
      )}

      {!showComparison && simulationData && (
        <>
          <SimulationParams
            buildingTypes={buildingTypes}
            buildingType={buildingType}
            fleetSummary={simulationData.fleet_summary}
            useCroatianTariff={useCroatianTariff}
          />

          <KPICards kpis={simulationData.kpis} />

          <SimulationCharts simulationData={simulationData} />

          <FleetSummary fleetSummary={simulationData.fleet_summary} />
        </>
      )}
    </div>
  );
}

export default App;
