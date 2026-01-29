import { API_URL } from '../constants';

export const checkBackendHealth = async () => {
  const response = await fetch(`${API_URL}/api/health`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Backend ne odgovara ispravno');
  }

  return response.json();
};

export const fetchScenarios = async () => {
  const response = await fetch(`${API_URL}/api/scenarios`);
  if (!response.ok) {
    throw new Error('Failed to fetch scenarios');
  }
  const data = await response.json();
  return data.scenarios || [];
};

export const fetchBuildingTypes = async () => {
  const response = await fetch(`${API_URL}/api/building-types`);
  if (!response.ok) {
    throw new Error('Failed to fetch building types');
  }
  const data = await response.json();
  return data.building_types || [];
};

export const fetchCroatianTariff = async () => {
  const response = await fetch(`${API_URL}/api/tariff/croatia`);
  if (!response.ok) {
    throw new Error('Failed to fetch Croatian tariff');
  }
  const data = await response.json();
  return data.tariff;
};

export const fetchEvCatalog = async () => {
  const response = await fetch(`${API_URL}/api/profiles`);
  if (!response.ok) {
    throw new Error('Failed to fetch EV catalog');
  }
  const data = await response.json();
  return data.data?.ev_catalog || [];
};

export const runAdvancedSimulation = async (config) => {
  console.log('Sending config to API:', config);
  const response = await fetch(`${API_URL}/api/simulate-advanced`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
    } catch (parseErr) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  const data = await response.json();

  if (data.status !== 'success') {
    throw new Error(data.error || 'Simulation failed');
  }

  return data.data;
};

export const fetchPVGISData = async (params) => {
  const response = await fetch(`${API_URL}/api/pvgis/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || `PVGIS error: ${response.status}`);
  }

  return response.json();
};

export const getCurrentPVLocation = async () => {
  const response = await fetch(`${API_URL}/api/pvgis/current-location`);
  if (!response.ok) {
    throw new Error('Failed to fetch current PV location');
  }
  return response.json();
};
