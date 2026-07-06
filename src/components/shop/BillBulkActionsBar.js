import React from 'react';
import { Copy, Archive, Download, Trash2, Pencil, X } from 'lucide-react';

const BulkActionButton = ({ icon: Icon, label, onClick, disabled, variant = 'default' }) => {
  const isDanger = variant === 'danger';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        background: isDanger ? 'var(--danger)' : 'none', border: 'none',
        color: isDanger ? 'var(--background)' : 'var(--border)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '13px', fontWeight: isDanger ? '600' : '500',
        padding: isDanger ? '6px 12px' : '6px 10px',
        borderRadius: '8px', transition: 'all 0.15s',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.color = isDanger ? 'var(--danger)' : 'var(--background)'; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.color = isDanger ? 'var(--background)' : 'var(--border)'; }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
};

const BillBulkActionsBar = ({
  selectedBills,
  bills,
  bulkActionLoading,
  onEdit,
  onDuplicate,
  onArchive,
  onExport,
  onDelete,
  onClear,
}) => {
  if (selectedBills.size === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '24px', left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: '12px',
      background: 'var(--foreground)', color: 'var(--background)',
      padding: '12px 20px', borderRadius: '14px',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 1000,
      animation: 'slideUp 0.25s ease-out',
    }}>
      <span style={{
        fontSize: '13px', fontWeight: '600',
        display: 'flex', alignItems: 'center', gap: '8px'
      }}>
        <span style={{
          background: 'var(--primary)', padding: '2px 8px', borderRadius: '10px',
          fontSize: '12px', fontWeight: '700'
        }}>
          {selectedBills.size}
        </span>
        selected
      </span>

      <div style={{ width: '1px', height: '24px', background: 'var(--foreground)' }} />

      <BulkActionButton
        icon={Pencil}
        label="Edit"
        onClick={() => {
          const billId = Array.from(selectedBills)[0];
          const billToEdit = bills.find(b => b.id === billId);
          if (billToEdit) onEdit(billToEdit);
        }}
        disabled={bulkActionLoading || selectedBills.size !== 1}
      />
      <BulkActionButton icon={Copy} label="Duplicate" onClick={onDuplicate} disabled={bulkActionLoading} />
      <BulkActionButton icon={Archive} label="Archive" onClick={onArchive} disabled={bulkActionLoading} />
      <BulkActionButton icon={Download} label="Export" onClick={onExport} disabled={bulkActionLoading} />

      <div style={{ width: '1px', height: '24px', background: 'var(--foreground)' }} />

      <BulkActionButton
        icon={Trash2} label="Delete"
        onClick={onDelete}
        disabled={bulkActionLoading} variant="danger"
      />

      <button
        onClick={onClear}
        style={{
          display: 'flex', alignItems: 'center',
          background: 'none', border: 'none', color: 'var(--muted-foreground)',
          cursor: 'pointer', padding: '6px', borderRadius: '8px',
          transition: 'all 0.15s', marginLeft: '4px',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--muted-foreground)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-foreground)'; }}
        title="Clear selection"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default BillBulkActionsBar;
