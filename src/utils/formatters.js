import { format } from 'date-fns';

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(value || 0);
};

export const formatDate = (date) => {
  if (!date) return '-';
  try {
    const dateObj = date?.toDate ? date.toDate() :
      date instanceof Date ? date : new Date(date);
    return format(dateObj, 'dd MMM yyyy');
  } catch {
    return '-';
  }
};
