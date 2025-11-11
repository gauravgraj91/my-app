import React from 'react';

const Textarea = ({ 
  label,
  error,
  className = '',
  containerStyle = {},
  rows = 4,
  id,
  ...props 
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  
  const textareaStyle = {
    width: '100%',
    padding: '12px',
    border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    resize: 'vertical',
    minHeight: rows * 20,
    fontFamily: 'inherit',
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
          htmlFor={textareaId}
          style={{ 
            display: 'block', 
            fontSize: 14, 
            fontWeight: 500, 
            marginBottom: 4,
            color: error ? '#ef4444' : '#374151'
          }}
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        style={textareaStyle}
        {...props}
      />
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

export default Textarea;