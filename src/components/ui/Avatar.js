import React from 'react';

const Avatar = ({ name, alert = false, round = false, size = 44 }) => {
  const initials = (name || '').split(/[\s&—]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <span style={{
      width: size, height: size, borderRadius: round ? '50%' : 'var(--radius-sm)', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: Math.round(size * 0.3),
      background: alert ? 'var(--primary)' : 'var(--primary-soft)',
      color: alert ? 'var(--primary-foreground)' : 'var(--primary-accent)'
    }}>
      {initials}
    </span>
  );
};

export default Avatar;
