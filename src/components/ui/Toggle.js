import React from 'react';

const Toggle = ({ checked = false, onChange, ...props }) => (
  <span
    onClick={() => onChange && onChange(!checked)}
    {...props}
    style={{
      position: 'relative', display: 'inline-block',
      width: 48, height: 28, borderRadius: 'var(--radius-pill)', flexShrink: 0, cursor: 'pointer',
      background: checked ? 'var(--primary)' : 'var(--secondary)', transition: 'background .2s'
    }}
  >
    <span style={{
      position: 'absolute', top: 4, left: checked ? 24 : 4, width: 20, height: 20,
      borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.25)', transition: 'left .2s'
    }} />
  </span>
);

export default Toggle;
