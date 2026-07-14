import React from 'react';

const Toast = ({ children, fixed = true }) => (
  <div style={{
    position: fixed ? 'fixed' : 'static', bottom: 28, left: fixed ? '50%' : undefined,
    transform: fixed ? 'translateX(-50%)' : undefined, zIndex: 300,
    background: 'var(--foreground)', color: 'var(--background)', borderRadius: 'var(--radius-pill)',
    padding: '12px 24px', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700,
    boxShadow: 'var(--shadow-lg)', display: 'inline-block'
  }}>
    {children}
  </div>
);

export default Toast;
