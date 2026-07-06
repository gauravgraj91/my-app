import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  icon,
  loading = false,
  className = '',
  style: customStyle,
  ...props
}) => {
  const variants = {
    primary: {
      background: 'var(--primary)',
      color: 'var(--primary-foreground)',
      border: 'none'
    },
    secondary: {
      background: 'var(--secondary)',
      color: 'var(--foreground)',
      border: '1px solid var(--border)'
    },
    success: {
      background: 'var(--success)',
      color: 'var(--primary-foreground)',
      border: 'none'
    },
    danger: {
      background: 'var(--danger)',
      color: 'var(--primary-foreground)',
      border: 'none'
    },
    outline: {
      background: 'transparent',
      color: 'var(--primary)',
      border: '1px solid var(--primary)'
    }
  };

  const sizes = {
    small: { padding: '8px 16px', fontSize: 12 },
    medium: { padding: '12px 24px', fontSize: 14 },
    large: { padding: '16px 32px', fontSize: 16 }
  };

  const buttonStyle = {
    ...variants[variant],
    ...sizes[size],
    borderRadius: 8,
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: icon ? 8 : 0,
    transition: 'all 0.2s',
    opacity: loading ? 0.7 : 1,
    ...customStyle
  };

  return (
    <button 
      className={`btn btn-${variant} ${className}`}
      style={buttonStyle}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <span>Loading...</span>
      ) : (
        <>
          {icon && <span>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;