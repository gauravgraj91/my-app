import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, monthLabel } from './transactionHelpers';

const chevronStyle = {
  width: 36,
  height: 36,
  borderRadius: 'var(--radius-pill)',
  border: '1px solid var(--border)',
  background: 'var(--card)',
  color: 'var(--foreground)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const MonthBar = ({ value, onChange }) => {
  const now = new Date();
  const atCurrentMonth = value.year === now.getFullYear() && value.monthIndex === now.getMonth();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <button aria-label="Previous month" style={chevronStyle} onClick={() => onChange(addMonths(value, -1))}>
        <ChevronLeft size={18} />
      </button>
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '-0.02em',
        fontSize: 19, color: 'var(--foreground)', minWidth: 150, textAlign: 'center'
      }}>
        {monthLabel(value)}
      </span>
      <button
        aria-label="Next month"
        style={{ ...chevronStyle, opacity: atCurrentMonth ? 0.4 : 1, cursor: atCurrentMonth ? 'default' : 'pointer' }}
        disabled={atCurrentMonth}
        onClick={() => onChange(addMonths(value, 1))}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default MonthBar;
