import { getDaysUntilExpiry, getExpiryStatus, EXPIRY_SOON_DAYS } from '../formatters';

describe('expiry helpers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Late evening local time — catches UTC-midnight off-by-one bugs
    jest.setSystemTime(new Date(2026, 6, 18, 23, 30, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getDaysUntilExpiry', () => {
    it('returns null for null/undefined/empty', () => {
      expect(getDaysUntilExpiry(null)).toBeNull();
      expect(getDaysUntilExpiry(undefined)).toBeNull();
      expect(getDaysUntilExpiry('')).toBeNull();
    });

    it('returns null for invalid dates', () => {
      expect(getDaysUntilExpiry('not-a-date')).toBeNull();
      expect(getDaysUntilExpiry(new Date('invalid'))).toBeNull();
    });

    it('handles Firestore Timestamp-like objects', () => {
      const timestamp = { toDate: () => new Date(2026, 6, 20) };
      expect(getDaysUntilExpiry(timestamp)).toBe(2);
    });

    it('handles Date instances', () => {
      expect(getDaysUntilExpiry(new Date(2026, 6, 17))).toBe(-1);
      expect(getDaysUntilExpiry(new Date(2026, 6, 18))).toBe(0);
      expect(getDaysUntilExpiry(new Date(2026, 6, 25))).toBe(7);
    });

    it('handles YYYY-MM-DD strings without UTC off-by-one at late local evening', () => {
      // new Date('2026-07-18') is UTC midnight; local "today" is still 18 Jul
      expect(getDaysUntilExpiry('2026-07-18')).toBe(0);
      expect(getDaysUntilExpiry('2026-07-19')).toBe(1);
      expect(getDaysUntilExpiry('2026-07-17')).toBe(-1);
    });
  });

  describe('getExpiryStatus', () => {
    it('returns null when unset or invalid', () => {
      expect(getExpiryStatus(null)).toBeNull();
      expect(getExpiryStatus('')).toBeNull();
      expect(getExpiryStatus('garbage')).toBeNull();
    });

    it('returns expired for past dates', () => {
      expect(getExpiryStatus(new Date(2026, 6, 17))).toBe('expired');
      expect(getExpiryStatus(new Date(2025, 0, 1))).toBe('expired');
    });

    it('returns expiring from today through the soon threshold', () => {
      expect(getExpiryStatus(new Date(2026, 6, 18))).toBe('expiring');
      const atThreshold = new Date(2026, 6, 18 + EXPIRY_SOON_DAYS);
      expect(getExpiryStatus(atThreshold)).toBe('expiring');
    });

    it('returns ok beyond the soon threshold', () => {
      const pastThreshold = new Date(2026, 6, 18 + EXPIRY_SOON_DAYS + 1);
      expect(getExpiryStatus(pastThreshold)).toBe('ok');
    });
  });
});
