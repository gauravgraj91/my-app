import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Delete' }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--card)', color: 'var(--card-foreground)', borderRadius: 'var(--radius-modal)', padding: '28px',
          width: '420px', maxWidth: '90vw',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: 'var(--radius-sm)',
            background: 'var(--danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AlertTriangle size={20} color="var(--danger)" />
          </div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--foreground)' }}>{title}</h3>
        </div>
        <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--muted-foreground)', lineHeight: '1.5' }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 20px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)',
              background: 'var(--card)', color: 'var(--foreground)', fontSize: '14px', fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 20px', borderRadius: 'var(--radius-pill)', border: 'none',
              background: 'var(--danger)', color: 'var(--primary-foreground)', fontSize: '14px', fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
