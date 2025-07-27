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
      background: '#f3f4f6',
      color: '#374151'
    },
    primary: {
      background: '#3b82f620',
      color: '#3b82f6'
    },
    success: {
      background: '#10b98120',
      color: '#10b981'
    },
    warning: {
      background: '#f59e0b20',
      color: '#f59e0b'
    },
    danger: {
      background: '#ef444420',
      color: '#ef4444'
    },
    info: {
      background: '#06b6d420',
      color: '#06b6d4'
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