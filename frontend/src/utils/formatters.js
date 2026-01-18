export const formatCurrency = (value) => {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
};

export const formatNumber = (value) => {
  return new Intl.NumberFormat('hr-HR', {
    maximumFractionDigits: 2
  }).format(value);
};
