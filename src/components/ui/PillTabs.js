import React from 'react';

const PillTabs = ({ items, value, onChange, size = 'md' }) => (
  <div style={{
    display: 'inline-flex', gap: 2, background: 'var(--secondary)',
    borderRadius: 'var(--radius-pill)', padding: 4, fontFamily: 'var(--font-sans)'
  }}>
    {items.map(item => {
      const key = typeof item === 'string' ? item : item.value;
      const label = typeof item === 'string' ? item : item.label;
      const active = key === value;
      return (
        <button
          key={key}
          onClick={() => onChange && onChange(key)}
          style={{
            fontFamily: 'var(--font-sans)', fontSize: size === 'sm' ? 13 : 14, fontWeight: active ? 700 : 600,
            padding: size === 'sm' ? '6px 14px' : '8px 18px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            borderRadius: 'var(--radius-pill)',
            background: active ? 'var(--foreground)' : 'transparent',
            color: active ? 'var(--background)' : 'var(--muted-foreground)'
          }}
        >
          {label}
        </button>
      );
    })}
  </div>
);

export default PillTabs;
