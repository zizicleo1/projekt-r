const getHourLabels = (results) => {
  return results.map((r, idx) => {
    const hour = Math.floor(idx / 4);
    if (idx % 4 === 0) {
      return `${hour}h`;
    }
    return '';
  });
};

export const preparePowerChart = (simulationData) => {
  if (!simulationData) return null;

  const results = simulationData.results;
  const labels = getHourLabels(results);

  return {
    labels,
    datasets: [
      {
        label: 'Potrošnja zgrade (kW)',
        data: results.map(r => r.building_load_kw),
        borderColor: 'rgb(255, 0, 0)',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        fill: false,
        stepped: true,
        borderWidth: 2,
      },
      {
        label: 'Opterećenje s V2B (kW)',
        data: results.map(r => r.grid_power_kw),
        borderColor: 'rgb(0, 0, 255)',
        backgroundColor: 'rgba(0, 100, 255, 0.3)',
        fill: true,
        stepped: true,
        borderWidth: 2,
      },
      {
        label: 'PV proizvodnja (kW)',
        data: results.map(r => r.pv_generation_kw),
        borderColor: 'rgb(0, 180, 0)',
        backgroundColor: 'rgba(0, 200, 0, 0.4)',
        fill: true,
        stepped: true,
        borderWidth: 1,
      },
    ],
  };
};

export const prepareCostChart = (simulationData) => {
  if (!simulationData) return null;

  const results = simulationData.results;
  const labels = getHourLabels(results);

  const offPeak = results.map(r => r.tariff_period === 'off-peak' || r.tariff_period === 'off_peak' ? r.cost_eur : 0);
  const midPeak = results.map(r => r.tariff_period === 'mid-peak' || r.tariff_period === 'mid_peak' ? r.cost_eur : 0);
  const onPeak = results.map(r => r.tariff_period === 'on-peak' || r.tariff_period === 'on_peak' ? r.cost_eur : 0);

  // Detect if 2-tariff or 3-tariff mode
  const hasMidPeak = midPeak.some(v => v > 0);

  if (hasMidPeak) {
    // 3-tarifni model (Croatian) - show NT, ST, VT
    return {
      labels,
      datasets: [
        {
          label: 'NT - Niska tarifa (EUR)',
          data: offPeak,
          backgroundColor: 'rgba(75, 192, 75, 0.8)',
          borderColor: 'rgb(0, 150, 0)',
          borderWidth: 1,
          stack: 'Stack 0',
        },
        {
          label: 'ST - Srednja tarifa (EUR)',
          data: midPeak,
          backgroundColor: 'rgba(255, 200, 50, 0.8)',
          borderColor: 'rgb(200, 150, 0)',
          borderWidth: 1,
          stack: 'Stack 0',
        },
        {
          label: 'VT - Visoka tarifa (EUR)',
          data: onPeak,
          backgroundColor: 'rgba(255, 80, 80, 0.8)',
          borderColor: 'rgb(200, 0, 0)',
          borderWidth: 1,
          stack: 'Stack 0',
        },
      ],
    };
  } else {
    // 2-tarifni model - show only NT and VT
    return {
      labels,
      datasets: [
        {
          label: 'NT - Niska tarifa (EUR)',
          data: offPeak,
          backgroundColor: 'rgba(75, 192, 75, 0.8)',
          borderColor: 'rgb(0, 150, 0)',
          borderWidth: 1,
          stack: 'Stack 0',
        },
        {
          label: 'VT - Visoka tarifa (EUR)',
          data: onPeak,
          backgroundColor: 'rgba(255, 80, 80, 0.8)',
          borderColor: 'rgb(200, 0, 0)',
          borderWidth: 1,
          stack: 'Stack 0',
        },
      ],
    };
  }
};

export const prepareEVActivityChart = (simulationData) => {
  if (!simulationData) return null;

  const results = simulationData.results;
  const labels = getHourLabels(results);

  return {
    labels,
    datasets: [
      {
        label: 'EVs punjenje',
        data: results.map(r => r.num_evs_charging),
        backgroundColor: 'rgba(255, 100, 100, 0.8)',
        borderColor: 'rgb(255, 0, 0)',
        borderWidth: 1,
        stack: 'Stack 0',
      },
      {
        label: 'EVs praznjenje (V2B)',
        data: results.map(r => -r.num_evs_discharging),
        backgroundColor: 'rgba(100, 100, 255, 0.8)',
        borderColor: 'rgb(0, 0, 255)',
        borderWidth: 1,
        stack: 'Stack 0',
      },
    ],
  };
};

export const prepareSOCChart = (simulationData) => {
  if (!simulationData) return null;

  const results = simulationData.results;
  const labels = getHourLabels(results);

  // Procijeni prosječni kapacitet baterije (kWh) i broj EV-ova
  const numEVs = simulationData.kpis.total_evs || 10;
  const avgBattery = 60; // kWh - prosječna baterija
  const dt = 0.25; // 15 min = 0.25h
  const eta = 0.90; // učinkovitost

  let avgSOC = simulationData.fleet_summary.avg_initial_soc * 100;
  const socData = results.map(r => {
    // ev_power_kw je ukupna snaga svih EV-ova
    // Pozitivno = punjenje, Negativno = praznjenje
    const evPower = r.ev_power_kw || 0;

    // deltaSOC = (dt / B) * eta * P * 100 / numEVs
    // Pojednostavljena formula za prosječni SOC
    const deltaSOC = (dt / avgBattery) * eta * evPower * 100 / Math.max(1, numEVs);
    avgSOC += deltaSOC;

    // Ogranici na [10, 90]
    avgSOC = Math.min(90, Math.max(10, avgSOC));
    return avgSOC;
  });

  return {
    labels,
    datasets: [
      {
        label: 'Prosječni SOC (%)',
        data: socData,
        borderColor: 'rgb(0, 150, 150)',
        backgroundColor: 'rgba(0, 150, 150, 0.2)',
        fill: true,
        stepped: true,
        borderWidth: 2,
      },
      {
        label: 'Ciljni SOC (80%)',
        data: Array(96).fill(80),
        borderColor: 'rgb(255, 0, 0)',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      },
      {
        label: 'Minimalni SOC (10%)',
        data: Array(96).fill(10),
        borderColor: 'rgb(255, 150, 0)',
        borderDash: [3, 3],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
      },
    ],
  };
};

export const preparePeakShavingChart = (simulationData) => {
  if (!simulationData) return null;

  const results = simulationData.results;
  const labels = getHourLabels(results);

  const buildingDemand = results.map(r => r.building_load_kw);
  const withV2B = results.map(r => r.grid_power_kw);
  const pvOutput = results.map(r => r.pv_generation_kw);
  const evCharged = results.map(r => Math.max(0, r.ev_power_kw));
  const evDischarged = results.map(r => Math.min(0, r.ev_power_kw));

  return {
    labels,
    datasets: [
      {
        label: 'Potrošnja zgrade',
        data: buildingDemand,
        borderColor: 'rgb(255, 0, 0)',
        backgroundColor: 'transparent',
        fill: false,
        stepped: true,
        borderWidth: 2,
        order: 1,
      },
      {
        label: 'Opterećenje s V2B',
        data: withV2B,
        borderColor: 'rgb(0, 0, 255)',
        backgroundColor: 'rgba(0, 100, 255, 0.3)',
        fill: true,
        stepped: true,
        borderWidth: 2,
        order: 2,
      },
      {
        label: 'PV proizvodnja',
        data: pvOutput,
        borderColor: 'rgb(0, 150, 0)',
        backgroundColor: 'rgba(0, 200, 0, 0.5)',
        fill: true,
        stepped: true,
        borderWidth: 1,
        order: 3,
      },
      {
        label: 'EV punjenje',
        data: evCharged,
        type: 'bar',
        backgroundColor: 'rgba(255, 100, 100, 0.7)',
        borderColor: 'rgb(255, 0, 0)',
        borderWidth: 1,
        yAxisID: 'y1',
        order: 4,
      },
      {
        label: 'EV praznjenje (V2B)',
        data: evDischarged,
        type: 'bar',
        backgroundColor: 'rgba(100, 100, 255, 0.7)',
        borderColor: 'rgb(0, 0, 255)',
        borderWidth: 1,
        yAxisID: 'y1',
        order: 5,
      },
    ],
  };
};

export const prepareComparisonChart = (simulationData) => {
  if (!simulationData) return null;

  const results = simulationData.results;
  const labels = getHourLabels(results);

  // Baseline: potrošnja zgrade - PV (bez V2B)
  const baseline = results.map(r => Math.max(0, r.building_load_kw - r.pv_generation_kw));
  // S V2B optimizacijom
  const withV2B = results.map(r => r.grid_power_kw);

  return {
    labels,
    datasets: [
      {
        label: 'Bez V2B (baseline)',
        data: baseline,
        borderColor: 'rgb(255, 0, 0)',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        fill: false,
        stepped: true,
        borderWidth: 2,
      },
      {
        label: 'S V2B optimizacijom',
        data: withV2B,
        borderColor: 'rgb(0, 100, 255)',
        backgroundColor: 'rgba(0, 100, 255, 0.3)',
        fill: true,
        stepped: true,
        borderWidth: 2,
      },
    ],
  };
};

export const prepareComparisonCostChart = (data, isCroatianTariff) => {
  if (!data) return null;

  const results = data.results;
  const labels = getHourLabels(results);

  if (isCroatianTariff) {
    const offPeak = results.map(r => r.tariff_period === 'off-peak' || r.tariff_period === 'off_peak' ? r.cost_eur : 0);
    const midPeak = results.map(r => r.tariff_period === 'mid-peak' || r.tariff_period === 'mid_peak' ? r.cost_eur : 0);
    const onPeak = results.map(r => r.tariff_period === 'on-peak' || r.tariff_period === 'on_peak' ? r.cost_eur : 0);

    return {
      labels,
      datasets: [
        {
          label: 'NT (Niska tarifa)',
          data: offPeak,
          backgroundColor: 'rgba(75, 192, 75, 0.8)',
          borderColor: 'rgb(0, 150, 0)',
          borderWidth: 1,
          stack: 'Stack 0',
        },
        {
          label: 'ST (Srednja tarifa)',
          data: midPeak,
          backgroundColor: 'rgba(255, 200, 50, 0.8)',
          borderColor: 'rgb(200, 150, 0)',
          borderWidth: 1,
          stack: 'Stack 0',
        },
        {
          label: 'VT (Visoka tarifa)',
          data: onPeak,
          backgroundColor: 'rgba(255, 80, 80, 0.8)',
          borderColor: 'rgb(200, 0, 0)',
          borderWidth: 1,
          stack: 'Stack 0',
        },
      ],
    };
  } else {
    const offPeak = results.map(r => r.tariff_period === 'off-peak' || r.tariff_period === 'off_peak' ? r.cost_eur : 0);
    const onPeak = results.map(r => r.tariff_period === 'on-peak' || r.tariff_period === 'on_peak' ? r.cost_eur : 0);

    return {
      labels,
      datasets: [
        {
          label: 'NT (Niža tarifa)',
          data: offPeak,
          backgroundColor: 'rgba(75, 192, 75, 0.8)',
          borderColor: 'rgb(0, 150, 0)',
          borderWidth: 1,
          stack: 'Stack 0',
        },
        {
          label: 'VT (Viša tarifa)',
          data: onPeak,
          backgroundColor: 'rgba(255, 80, 80, 0.8)',
          borderColor: 'rgb(200, 0, 0)',
          borderWidth: 1,
          stack: 'Stack 0',
        },
      ],
    };
  }
};
