import React from 'react';
import Card from './Card';
import Button from './Button';

const StatCard = ({ 
  title,
  icon,
  onViewAll,
  children,
  className = '',
  ...props 
}) => {
  return (
    <Card className={className} {...props}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>
          {icon && <span style={{ marginRight: 8 }}>{icon}</span>}
          {title}
        </h3>
        {onViewAll && (
          <Button 
            variant="outline" 
            size="small" 
            onClick={onViewAll}
            style={{ textDecoration: 'underline' }}
          >
            View All
          </Button>
        )}
      </div>
      {children}
    </Card>
  );
};

export const StatItem = ({ 
  value, 
  label, 
  color = '#6b7280',
  size = 'medium',
  className = '',
  ...props 
}) => {
  const sizes = {
    small: { fontSize: 16, fontWeight: 600 },
    medium: { fontSize: 20, fontWeight: 600 },
    large: { fontSize: 24, fontWeight: 700 }
  };

  return (
    <div style={{ textAlign: 'center' }} className={className} {...props}>
      <div style={{ ...sizes[size], color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
    </div>
  );
};

export const StatGrid = ({ 
  columns = 2, 
  gap = 16, 
  children,
  className = '',
  ...props 
}) => {
  return (
    <div 
      style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${columns}, 1fr)`, 
        gap: gap 
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
};

export default StatCard;