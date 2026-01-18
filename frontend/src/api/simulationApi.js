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

export const runAdvancedSimulation = async (config) => {
  const response = await fetch(`${API_URL}/api/simulate-advanced`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== 'success') {
    throw new Error(data.error || 'Simulation failed');
  }

  return data.data;
};
