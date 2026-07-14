import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const SummaryCard = ({ label, value, amount, count, subtitle, icon: Icon, color, bgColor }) => (
  <div style={{
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
    padding: '20px', position: 'relative', overflow: 'hidden',
  }}>
    <div style={{
      position: 'absolute', top: '16px', right: '16px',
      width: '40px', height: '40px', borderRadius: '10px',
      background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={20} color={color} />
    </div>
    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--muted-foreground)', marginBottom: '8px' }}>
      {label}
    </div>
    <div style={{ fontSize: '24px', fontWeight: '800', color: color, marginBottom: '4px' }}>
      {value !== undefined ? value : formatCurrency(amount)}
    </div>
    <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
      {subtitle}
    </div>
  </div>
);

export default SummaryCard;
