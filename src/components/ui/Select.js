import React from 'react';

const Select = ({ 
  label,
  error,
  options = [],
  className = '',
  containerStyle = {},
  id,
  ...props 
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  const selectStyle = {
    width: '100%',
    padding: '12px',
    border: `1px solid ${error ? 'var(--danger)' : 'var(--input)'}`,
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    outline: 'none',
    background: 'var(--card)',
    color: 'var(--foreground)',
    cursor: 'pointer',
    ...props.style
  };

  const containerStyles = {
    marginBottom: 16,
    ...containerStyle
  };

  return (
    <div style={containerStyles} className={className}>
      {label && (
        <label 
          htmlFor={selectId}
          style={{ 
            display: 'block', 
            fontSize: 14, 
            fontWeight: 500, 
            marginBottom: 4,
            color: error ? 'var(--danger)' : 'var(--foreground)'
          }}
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        style={selectStyle}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <div style={{
          fontSize: 12,
          color: 'var(--danger)',
          marginTop: 4
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default Select;