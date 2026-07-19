// Pure helpers shared by the Shop and Personal transaction tabs.

export const toJsDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

// Effective date of a ledger entry: explicit date (recurring/personal) or createdAt
export const txDate = (tx) => toJsDate(tx.date) || toJsDate(tx.createdAt);

export const isInMonth = (tx, { year, monthIndex }) => {
  const d = txDate(tx);
  return !!d && d.getFullYear() === year && d.getMonth() === monthIndex;
};

export const addMonths = ({ year, monthIndex }, delta) => {
  const d = new Date(year, monthIndex + delta, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
};

export const monthLabel = ({ year, monthIndex }) =>
  new Date(year, monthIndex, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

export const monthTotals = (transactions) => {
  let cashIn = 0, cashOut = 0, inCount = 0, outCount = 0;
  transactions.forEach((tx) => {
    const amount = parseFloat(tx.amount) || 0;
    if (tx.type === 'cashIn') { cashIn += amount; inCount++; }
    else if (tx.type === 'cashOut') { cashOut += amount; outCount++; }
  });
  return { cashIn, cashOut, net: cashIn - cashOut, inCount, outCount };
};

// Cash-out totals grouped by category, largest first
export const spendByCategory = (transactions) => {
  const totals = {};
  transactions.forEach((tx) => {
    if (tx.type !== 'cashOut') return;
    const category = tx.category || 'other';
    totals[category] = (totals[category] || 0) + (parseFloat(tx.amount) || 0);
  });
  return Object.entries(totals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
};

// Last n Mon–Sun weeks (oldest first): [{ start, end, label: '06–12 Jul', totalOut }]
export const lastNWeeks = (transactions, n = 4, now = new Date()) => {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mondayOffset = (day.getDay() + 6) % 7;
  const currentMonday = new Date(day.getFullYear(), day.getMonth(), day.getDate() - mondayOffset);
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(currentMonday);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const dayNum = (d) => String(d.getDate()).padStart(2, '0');
    const label = `${dayNum(start)}–${dayNum(end)} ${end.toLocaleString('en-IN', { month: 'short' })}`;
    weeks.push({ start, end, label, totalOut: 0 });
  }
  transactions.forEach((tx) => {
    if (tx.type !== 'cashOut') return;
    const d = txDate(tx);
    if (!d) return;
    const week = weeks.find((w) => d >= w.start && d < new Date(w.end.getFullYear(), w.end.getMonth(), w.end.getDate() + 1));
    if (week) week.totalOut += parseFloat(tx.amount) || 0;
  });
  return weeks;
};

const csvEscape = (value) => {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const exportCsv = (filename, headers, rows) => {
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};
