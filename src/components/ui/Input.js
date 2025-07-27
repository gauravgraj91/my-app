import React from 'react';

const Input = ({ 
  label,
  error,
  icon,
  className = '',
  containerStyle = {},
  ...props 
}) => {
  const inputStyle = {
    width: '100%',
    padding: icon ? '12px 12px 12px 44px' : '12px',
    border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
    ...props.style
  };

  const containerStyles = {
    marginBottom: 16,
    ...containerStyle
  };

  return (
    <div style={containerStyles} className={className}>
      {label && (
        <label style={{ 
          display: 'block', 
          fontSize: 14, 
          fontWeight: 500, 
          marginBottom: 4,
          color: error ? '#ef4444' : '#374151'
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{ 
            position: 'absolute', 
            left: 12, 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: '#9ca3af' 
          }}>
            {icon}
          </div>
        )}
        <input
          style={inputStyle}
          {...props}
        />
      </div>
      {error && (
        <div style={{ 
          fontSize: 12, 
          color: '#ef4444', 
          marginTop: 4 
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default Input;