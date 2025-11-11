import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ 
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 500,
  className = ''
}) => {
  if (!isOpen) return null;

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };

  const modalStyle = {
    background: 'white',
    borderRadius: 16,
    padding: 0,
    width: '90%',
    maxWidth: maxWidth,
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    border: '1px solid #e5e7eb'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    background: '#f9fafb',
    borderRadius: '16px 16px 0 0'
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    padding: 4
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div 
        style={modalStyle} 
        className={className}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div style={headerStyle}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1f2937' }}>
              {title}
            </h2>
            <button 
              style={closeButtonStyle}
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div style={{ padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;