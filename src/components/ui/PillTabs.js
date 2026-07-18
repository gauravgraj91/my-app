import React from 'react';

const PillTabs = ({ items, value, onChange, size = 'md' }) => (
  <div style={{
    display: 'inline-flex', gap: 2, background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-pill)', padding: 4, fontFamily: 'var(--font-sans)'
  }}>
    {items.map(item => {
      const key = typeof item === 'string' ? item : item.value;
      const label = typeof item === 'string' ? item : item.label;
      const Icon = typeof item === 'string' ? null : item.icon;
      const active = key === value;
      return (
        <button
          key={key}
          onClick={() => onChange && onChange(key)}
          aria-label={typeof item === 'string' ? undefined : item.ariaLabel}
          style={{
            fontFamily: 'var(--font-sans)', fontSize: size === 'sm' ? 13 : 14, fontWeight: active ? 700 : 600,
            padding: size === 'sm' ? '6px 14px' : '8px 18px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            borderRadius: 'var(--radius-pill)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: active ? 'var(--primary)' : 'transparent',
            color: active ? 'var(--primary-foreground)' : 'var(--muted-foreground)'
          }}
        >
          {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
          {label}
        </button>
      );
    })}
  </div>
);

export default PillTabs;
