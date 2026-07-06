import React from 'react';

const LoadingSpinner = ({ 
  size = 24,
  color = 'var(--primary)',
  className = '',
  ...props 
}) => {
  const spinnerStyle = {
    width: size,
    height: size,
    border: `2px solid color-mix(in srgb, ${color} 12%, transparent)`,
    borderTop: `2px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    ...props.style
  };

  // Add keyframes for spin animation
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div 
      className={`loading-spinner ${className}`}
      style={spinnerStyle}
      {...props}
    />
  );
};

export default LoadingSpinner;