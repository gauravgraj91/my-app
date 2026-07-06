import React from 'react';

const Badge = ({ 
  children,
  variant = 'default',
  size = 'medium',
  icon,
  className = '',
  ...props 
}) => {
  const variants = {
    default: {
      background: 'var(--secondary)',
      color: 'var(--foreground)'
    },
    primary: {
      background: 'var(--primary-soft)',
      color: 'var(--primary)'
    },
    success: {
      background: 'var(--success-soft)',
      color: 'var(--success)'
    },
    warning: {
      background: 'var(--warning-soft)',
      color: 'var(--warning)'
    },
    danger: {
      background: 'var(--danger-soft)',
      color: 'var(--danger)'
    },
    info: {
      background: 'var(--primary-soft)',
      color: 'var(--primary)'
    }
  };

  const sizes = {
    small: { padding: '2px 6px', fontSize: 10 },
    medium: { padding: '4px 8px', fontSize: 12 },
    large: { padding: '6px 12px', fontSize: 14 }
  };

  const badgeStyle = {
    ...variants[variant],
    ...sizes[size],
    borderRadius: 12,
    fontWeight: 500,
    display: 'inline-flex',
    alignItems: 'center',
    gap: icon ? 4 : 0,
    ...props.style
  };

  return (
    <span 
      className={`badge badge-${variant} ${className}`}
      style={badgeStyle}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;