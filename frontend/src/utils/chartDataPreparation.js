const getTimeLabels = (results) => {
  return results.map((r, idx) => idx % 4 === 0 ? r.time : '');
};

export const preparePowerChart = (simulationData) => {
  if (!simulationData) return null;

  const results = simulationData.results;
  const labels = getTimeLabels(results);

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

export const prepareCostChart = (simulationData) => {
  if (!simulationData) return null;

  const results = simulationData.results;
  const labels = getTimeLabels(results);

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

export const prepareEVActivityChart = (simulationData) => {
  if (!simulationData) return null;

  const results = simulationData.results;
  const labels = getTimeLabels(results);

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

export const prepareSOCChart = (simulationData) => {
  if (!simulationData) return null;

  const results = simulationData.results;
  const labels = getTimeLabels(results);

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

export const preparePeakShavingChart = (simulationData) => {
  if (!simulationData) return null;

  const results = simulationData.results;
  const labels = getTimeLabels(results);

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

export const prepareComparisonCostChart = (data, isCroatianTariff) => {
  if (!data) return null;

  const results = data.results;
  const labels = getTimeLabels(results);

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
