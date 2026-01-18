export const baseChartOptions = {
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

export const peakShavingChartOptions = {
  ...baseChartOptions,
  scales: {
    ...baseChartOptions.scales,
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

export const evActivityChartOptions = {
  ...baseChartOptions,
  scales: {
    ...baseChartOptions.scales,
    y: {
      beginAtZero: false,
      title: {
        display: true,
        text: 'Broj vozila'
      }
    }
  }
};
