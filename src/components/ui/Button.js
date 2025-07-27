import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  icon,
  loading = false,
  className = '',
  ...props 
}) => {
  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      color: 'white',
      border: 'none',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
    },
    secondary: {
      background: '#f3f4f6',
      color: '#374151',
      border: 'none'
    },
    success: {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      color: 'white',
      border: 'none',
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
      color: 'white',
      border: 'none',
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
    },
    outline: {
      background: 'transparent',
      color: '#3b82f6',
      border: '1px solid #3b82f6'
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
    ...props.style
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