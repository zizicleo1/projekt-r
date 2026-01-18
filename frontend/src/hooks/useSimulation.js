import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_BUILDING_TYPES } from '../constants';
import * as api from '../api/simulationApi';

export function useSimulation() {
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

  const checkBackend = useCallback(async () => {
    try {
      await api.checkBackendHealth();
      setBackendStatus('connected');
    } catch (err) {
      setBackendStatus('error');
      setError('Backend nije dostupan. Pokreni: python main.py');
      console.error('Backend connection failed:', err);
    }
  }, []);

  const loadScenarios = useCallback(async () => {
    try {
      const data = await api.fetchScenarios();
      setScenarios(data);
    } catch (err) {
      console.error('Failed to fetch scenarios:', err);
    }
  }, []);

  const loadBuildingTypes = useCallback(async () => {
    try {
      const data = await api.fetchBuildingTypes();
      setBuildingTypes(data);
      console.log('Building types loaded:', data);
    } catch (err) {
      console.error('Failed to fetch building types:', err);
      setBuildingTypes(DEFAULT_BUILDING_TYPES);
    }
  }, []);

  const loadCroatianTariff = useCallback(async () => {
    try {
      const data = await api.fetchCroatianTariff();
      setCroatianTariff(data);
      console.log('Croatian tariff loaded:', data);
    } catch (err) {
      console.error('Failed to fetch Croatian tariff:', err);
    }
  }, []);

  useEffect(() => {
    checkBackend();
    loadScenarios();
    loadBuildingTypes();
    loadCroatianTariff();
  }, [checkBackend, loadScenarios, loadBuildingTypes, loadCroatianTariff]);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Starting ADVANCED simulation: ${numEVs} EVs, ${buildingType}, PV: ${pvScaling}x`);

      const data = await api.runAdvancedSimulation({
        num_evs: numEVs,
        scenario_name: `${buildingType}_${numEVs}EVs`,
        pv_scaling: pvScaling,
        building_type: buildingType,
        use_croatian_tariff: useCroatianTariff
      });

      setSimulationData(data);
      console.log('Simulation completed:', data.kpis);
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

      const [data1, data2] = await Promise.all([
        api.runAdvancedSimulation({ ...config, use_croatian_tariff: true }),
        api.runAdvancedSimulation({ ...config, use_croatian_tariff: false })
      ]);

      setComparisonData({ tariff1: data1, tariff2: data2 });
      console.log('Comparison completed');
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

  return {
    numEVs,
    setNumEVs,
    pvScaling,
    setPvScaling,
    loading,
    simulationData,
    error,
    scenarios,
    backendStatus,
    buildingType,
    setBuildingType,
    useCroatianTariff,
    setUseCroatianTariff,
    buildingTypes,
    croatianTariff,
    showComparison,
    setShowComparison,
    comparisonData,
    loadingComparison,
    checkBackend,
    runSimulation,
    runTariffComparison,
    handleNumEVsChange,
  };
}
