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
    default: '0 4px 20px rgba(0,0,0,0.08)',
    lg: '0 10px 40px rgba(0,0,0,0.15)'
  };

  const cardStyle = {
    background: '#fff',
    borderRadius: 16,
    boxShadow: shadowStyles[shadow],
    padding: padding,
    border: '1px solid #f3f4f6',
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