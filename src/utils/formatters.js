import { format } from 'date-fns';

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(value || 0);
};

export const EXPIRY_SOON_DAYS = 30;

const DAY_MS = 86400000;

export const getDaysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  const dateObj = expiryDate?.toDate ? expiryDate.toDate() :
    expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  if (isNaN(dateObj.getTime())) return null;
  const expiry = new Date(dateObj);
  expiry.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / DAY_MS);
};

export const getExpiryStatus = (expiryDate) => {
  const days = getDaysUntilExpiry(expiryDate);
  if (days === null) return null;
  if (days < 0) return 'expired';
  if (days <= EXPIRY_SOON_DAYS) return 'expiring';
  return 'ok';
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
