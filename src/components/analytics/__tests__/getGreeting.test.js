import { getGreeting } from '../AnalyticsDashboard';

describe('getGreeting', () => {
  it('returns Good morning before noon', () => {
    expect(getGreeting(new Date('2026-07-08T08:00:00'))).toBe('Good morning');
  });

  it('returns Good afternoon from noon to 5pm', () => {
    expect(getGreeting(new Date('2026-07-08T13:00:00'))).toBe('Good afternoon');
  });

  it('returns Good evening from 5pm', () => {
    expect(getGreeting(new Date('2026-07-08T19:00:00'))).toBe('Good evening');
  });
});
