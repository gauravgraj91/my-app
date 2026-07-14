import React from 'react';

const Card = ({
  children,
  className = '',
  padding = 24,
  shadow = 'default',
  style,
  ...props
}) => {
  const shadowStyles = {
    none: 'none',
    sm: 'none',
    default: 'none',
    lg: 'var(--shadow-lg)'
  };

  const cardStyle = {
    background: 'var(--card)',
    color: 'var(--card-foreground)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: shadowStyles[shadow],
    padding: padding,
    border: '1px solid var(--border)',
    ...style
  };

  return (
    <div
      className={`card ${className}`}
      {...props}
      style={cardStyle}
    >
      {children}
    </div>
  );
};

export default Card;