import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  padding = 24, 
  shadow = 'default',
  ...props 
}) => {
  const shadowStyles = {
    none: 'none',
    sm: '0 1px 3px rgba(0,0,0,0.12)',
    default: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
  };

  const cardStyle = {
    background: '#fff',
    borderRadius: 12,
    boxShadow: shadowStyles[shadow],
    padding: padding,
    border: '1px solid #e5e7eb',
    transition: 'box-shadow 0.2s ease-in-out',
    ...props.style
  };

  return (
    <div 
      className={`card ${className}`}
      style={cardStyle}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;