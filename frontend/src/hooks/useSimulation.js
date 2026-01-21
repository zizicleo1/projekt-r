import { useState, useEffect, useCallback, useMemo } from 'react';
import { DEFAULT_BUILDING_TYPES } from '../constants';
import * as api from '../api/simulationApi';

const BASE_PV_KW = 30;

export function useSimulation() {
  const [pvCapacityKw, setPvCapacityKw] = useState(30);
  const [loading, setLoading] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  const [error, setError] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [buildingType, setBuildingType] = useState('office');
  const [useCroatianTariff, setUseCroatianTariff] = useState(true);
  const [buildingTypes, setBuildingTypes] = useState([]);
  const [evCatalog, setEvCatalog] = useState([]);
  const [evFleetConfig, setEvFleetConfig] = useState({});
  const [croatianTariff, setCroatianTariff] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState({ tariff1: null, tariff2: null });
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [simulationDate, setSimulationDate] = useState('2025-06-21');
  const [pvgisData, setPvgisData] = useState(null);
  const [loadingPvgis, setLoadingPvgis] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState({ latitude: 45.815, longitude: 15.982 });

  const checkBackend = useCallback(async () => {
    try {
      await api.checkBackendHealth();
      setBackendStatus('connected');
    } catch (err) {
      setBackendStatus('error');
      setError('Backend nije dostupan. Pokreni: python main.py');
    }
  }, []);

  const loadScenarios = useCallback(async () => {
    try {
      const data = await api.fetchScenarios();
      setScenarios(data);
    } catch (err) {}
  }, []);

  const loadBuildingTypes = useCallback(async () => {
    try {
      const data = await api.fetchBuildingTypes();
      setBuildingTypes(data);
    } catch (err) {
      setBuildingTypes(DEFAULT_BUILDING_TYPES);
    }
  }, []);

  const loadCroatianTariff = useCallback(async () => {
    try {
      const data = await api.fetchCroatianTariff();
      setCroatianTariff(data);
    } catch (err) {}
  }, []);

  const loadEvCatalog = useCallback(async () => {
    try {
      const data = await api.fetchEvCatalog();
      setEvCatalog(data);
      const initialConfig = {};
      data.forEach(ev => {
        initialConfig[ev.id] = 0;
      });
      setEvFleetConfig(initialConfig);
    } catch (err) {}
  }, []);

  useEffect(() => {
    checkBackend();
    loadScenarios();
    loadBuildingTypes();
    loadCroatianTariff();
    loadEvCatalog();
  }, [checkBackend, loadScenarios, loadBuildingTypes, loadCroatianTariff, loadEvCatalog]);

  const fleetStats = useMemo(() => {
    let totalCount = 0;
    let totalCapacity = 0;
    let totalChargingPower = 0;
    let totalPrice = 0;

    evCatalog.forEach(ev => {
      const count = evFleetConfig[ev.id] || 0;
      totalCount += count;
      totalCapacity += count * ev.battery_capacity_kwh;
      totalChargingPower += count * ev.max_charging_power_kw;
      totalPrice += count * (ev.price_eur || 0);
    });

    return {
      totalCount,
      totalCapacity,
      totalChargingPower,
      totalPrice,
      avgCapacity: totalCount > 0 ? totalCapacity / totalCount : 0,
      avgChargingPower: totalCount > 0 ? totalChargingPower / totalCount : 0,
    };
  }, [evCatalog, evFleetConfig]);

  const updateEvCount = (modelId, count) => {
    const num = parseInt(count);
    setEvFleetConfig(prev => ({
      ...prev,
      [modelId]: isNaN(num) || num < 0 ? 0 : num
    }));
  };

  const getEvFleetConfigForApi = () => {
    const config = [];
    Object.entries(evFleetConfig).forEach(([modelId, count]) => {
      if (count > 0) {
        config.push({ model_id: parseInt(modelId), count });
      }
    });
    return config.length > 0 ? config : null;
  };

  const runSimulation = async () => {
    if (fleetStats.totalCount === 0) {
      setError('Molimo odaberite barem jedno vozilo');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pvScaling = pvCapacityKw / BASE_PV_KW;
      const evFleetConfigApi = getEvFleetConfigForApi();

      const data = await api.runAdvancedSimulation({
        ev_fleet_config: evFleetConfigApi,
        scenario_name: `${buildingType}_${fleetStats.totalCount}EVs`,
        pv_scaling: pvScaling,
        building_type: buildingType,
        use_croatian_tariff: useCroatianTariff,
        simulation_date: simulationDate
      });

      setSimulationData(data);
    } catch (err) {
      setError(`Greska: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runTariffComparison = async () => {
    if (fleetStats.totalCount === 0) {
      setError('Molimo odaberite barem jedno vozilo');
      return;
    }

    setLoadingComparison(true);
    setError(null);
    setShowComparison(true);

    try {
      const pvScaling = pvCapacityKw / BASE_PV_KW;
      const evFleetConfigApi = getEvFleetConfigForApi();

      const config = {
        ev_fleet_config: evFleetConfigApi,
        scenario_name: `${buildingType}_${fleetStats.totalCount}EVs`,
        pv_scaling: pvScaling,
        building_type: buildingType,
        simulation_date: simulationDate
      };

      const [data1, data2] = await Promise.all([
        api.runAdvancedSimulation({ ...config, use_croatian_tariff: true }),
        api.runAdvancedSimulation({ ...config, use_croatian_tariff: false })
      ]);

      setComparisonData({ tariff1: data1, tariff2: data2 });
    } catch (err) {
      setError(`Greška pri usporedbi: ${err.message}`);
    } finally {
      setLoadingComparison(false);
    }
  };

  const handlePvCapacityChange = (value) => {
    const num = parseInt(value);
    if (isNaN(num) || value === '') {
      setPvCapacityKw('');
    } else if (num > 200) {
      setPvCapacityKw(200);
    } else if (num < 0) {
      setPvCapacityKw(0);
    } else {
      setPvCapacityKw(num);
    }
  };

  const fetchPVGISData = async (params) => {
    setLoadingPvgis(true);
    setError(null);

    try {
      const data = await api.fetchPVGISData(params);
      setPvgisData(data);
      setSelectedLocation({
        latitude: params.latitude,
        longitude: params.longitude
      });

      if (params.peakpower) {
        setPvCapacityKw(params.peakpower);
      }

      return data;
    } catch (err) {
      setError(`PVGIS greska: ${err.message}`);
      throw err;
    } finally {
      setLoadingPvgis(false);
    }
  };

  const handleLocationChange = (location) => {
    setSelectedLocation(location);
  };

  return {
    evCatalog,
    evFleetConfig,
    updateEvCount,
    fleetStats,
    pvCapacityKw,
    setPvCapacityKw,
    handlePvCapacityChange,
    pvgisData,
    loadingPvgis,
    selectedLocation,
    fetchPVGISData,
    handleLocationChange,
    loading,
    simulationData,
    error,
    scenarios,
    backendStatus,
    buildingType,
    setBuildingType,
    buildingTypes,
    simulationDate,
    setSimulationDate,
    useCroatianTariff,
    setUseCroatianTariff,
    croatianTariff,
    showComparison,
    setShowComparison,
    comparisonData,
    loadingComparison,
    checkBackend,
    runSimulation,
    runTariffComparison,
  };
}
