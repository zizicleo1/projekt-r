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
      labels: {
        usePointStyle: true,
        padding: 15,
      }
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
      title: {
        display: true,
        text: 'Vrijeme (h)',
        font: { weight: 'bold' }
      },
      ticks: {
        maxRotation: 0,
        minRotation: 0,
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)',
      }
    },
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Snaga (kW)',
        font: { weight: 'bold' }
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)',
      }
    }
  }
};

export const peakShavingChartOptions = {
  ...baseChartOptions,
  scales: {
    x: {
      title: {
        display: true,
        text: 'Vrijeme (h)',
        font: { weight: 'bold' }
      },
      ticks: {
        maxRotation: 0,
        minRotation: 0,
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)',
      }
    },
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      beginAtZero: true,
      title: {
        display: true,
        text: 'Potrošnja snage (kW)',
        font: { weight: 'bold' }
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)',
      }
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      title: {
        display: true,
        text: 'EV snaga (kW)',
        font: { weight: 'bold' }
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
    x: {
      title: {
        display: true,
        text: 'Vrijeme (h)',
        font: { weight: 'bold' }
      },
      ticks: {
        maxRotation: 0,
        minRotation: 0,
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)',
      }
    },
    y: {
      beginAtZero: false,
      title: {
        display: true,
        text: 'Broj vozila',
        font: { weight: 'bold' }
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)',
      }
    }
  }
};

export const socChartOptions = {
  ...baseChartOptions,
  scales: {
    x: {
      title: {
        display: true,
        text: 'Vrijeme (h)',
        font: { weight: 'bold' }
      },
      ticks: {
        maxRotation: 0,
        minRotation: 0,
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)',
      }
    },
    y: {
      beginAtZero: true,
      max: 100,
      title: {
        display: true,
        text: 'SOC (%)',
        font: { weight: 'bold' }
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)',
      }
    }
  }
};

export const comparisonChartOptions = {
  ...baseChartOptions,
  scales: {
    x: {
      title: {
        display: true,
        text: 'Vrijeme (h)',
        font: { weight: 'bold' }
      },
      ticks: {
        maxRotation: 0,
        minRotation: 0,
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)',
      }
    },
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Opterećenje mreže (kW)',
        font: { weight: 'bold' }
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)',
      }
    }
  }
};
