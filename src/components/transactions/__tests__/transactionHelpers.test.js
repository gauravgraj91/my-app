import {
  toJsDate,
  txDate,
  isInMonth,
  addMonths,
  monthLabel,
  monthTotals,
  spendByCategory
} from '../transactionHelpers';
import { advanceNextDue } from '../../../firebase/recurringService';

describe('transactionHelpers', () => {
  test('toJsDate handles Date, Timestamp-like, string, and null', () => {
    const d = new Date(2026, 6, 15);
    expect(toJsDate(d)).toEqual(d);
    expect(toJsDate({ toDate: () => d })).toEqual(d);
    expect(toJsDate('2026-07-15').getFullYear()).toBe(2026);
    expect(toJsDate(null)).toBeNull();
    expect(toJsDate('not a date')).toBeNull();
  });

  test('txDate prefers date over createdAt', () => {
    const date = new Date(2026, 5, 1);
    const createdAt = { toDate: () => new Date(2026, 6, 2) };
    expect(txDate({ date, createdAt })).toEqual(date);
    expect(txDate({ createdAt })).toEqual(new Date(2026, 6, 2));
  });

  test('isInMonth matches year and month', () => {
    const month = { year: 2026, monthIndex: 6 };
    expect(isInMonth({ date: new Date(2026, 6, 31) }, month)).toBe(true);
    expect(isInMonth({ date: new Date(2026, 7, 1) }, month)).toBe(false);
    expect(isInMonth({ date: new Date(2025, 6, 15) }, month)).toBe(false);
    expect(isInMonth({}, month)).toBe(false);
  });

  test('addMonths wraps across year boundaries', () => {
    expect(addMonths({ year: 2026, monthIndex: 0 }, -1)).toEqual({ year: 2025, monthIndex: 11 });
    expect(addMonths({ year: 2026, monthIndex: 11 }, 1)).toEqual({ year: 2027, monthIndex: 0 });
  });

  test('monthLabel formats month and year', () => {
    expect(monthLabel({ year: 2026, monthIndex: 6 })).toMatch(/July 2026/);
  });

  test('monthTotals sums by type and counts', () => {
    const totals = monthTotals([
      { type: 'cashIn', amount: 100 },
      { type: 'cashIn', amount: '50' },
      { type: 'cashOut', amount: 30 },
      { type: 'cashOut', amount: 'bad' }
    ]);
    expect(totals).toEqual({ cashIn: 150, cashOut: 30, net: 120, inCount: 2, outCount: 2 });
  });

  test('spendByCategory groups cashOut only, sorted descending', () => {
    const rows = spendByCategory([
      { type: 'cashOut', category: 'food', amount: 40 },
      { type: 'cashOut', category: 'food', amount: 60 },
      { type: 'cashOut', amount: 10 },
      { type: 'cashIn', category: 'food', amount: 500 }
    ]);
    expect(rows).toEqual([
      { category: 'food', total: 100 },
      { category: 'other', total: 10 }
    ]);
  });
});

describe('advanceNextDue', () => {
  test('weekly adds 7 days', () => {
    expect(advanceNextDue(new Date(2026, 6, 15), 'weekly')).toEqual(new Date(2026, 6, 22));
  });

  test('monthly keeps the day when it fits', () => {
    const next = advanceNextDue(new Date(2026, 6, 15, 9, 0), 'monthly');
    expect(next.getMonth()).toBe(7);
    expect(next.getDate()).toBe(15);
  });

  test('monthly clamps the 31st to shorter months', () => {
    const next = advanceNextDue(new Date(2026, 0, 31), 'monthly'); // Jan 31 → Feb 28
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(28);
  });

  test('monthly wraps December into January', () => {
    const next = advanceNextDue(new Date(2026, 11, 10), 'monthly');
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(0);
  });
});
