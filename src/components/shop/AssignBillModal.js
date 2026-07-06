import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FileText, Search, Calendar, User, Package, Check, AlertCircle } from 'lucide-react';
import { useBills } from '../../context/BillsContext';
import { format } from 'date-fns';

const AssignBillModal = ({
  isOpen,
  onClose,
  onAssign,
  products = [], // Array of products to assign (for bulk) or single product
  mode = 'single' // 'single' or 'bulk'
}) => {
  const { bills: allBills, loading: billsLoading } = useBills();
  const [assigning, setAssigning] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  // Filter out archived bills from context data
  const bills = useMemo(
    () => (allBills || []).filter(bill => bill.status !== 'archived'),
    [allBills]
  );
  const loading = billsLoading;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError('');
      setSelectedBillId('');
      setSearchTerm('');
    }
  }, [isOpen]);

  // Filter bills by search term
  const filteredBills = bills.filter(bill => {
    const search = searchTerm.toLowerCase();
    return (
      bill.billNumber?.toLowerCase().includes(search) ||
      bill.vendor?.toLowerCase().includes(search)
    );
  });

  // Format date helper - handles Firestore Timestamps, Date objects, and strings
  const formatDate = (date) => {
    if (!date) return 'No date';
    try {
      // Handle Firestore Timestamp (has toDate method)
      const dateObj = date?.toDate ? date.toDate() :
                      date instanceof Date ? date :
                      new Date(date);
      return format(dateObj, 'dd MMM yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  // Format currency helper
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  // Handle assign
  const handleAssign = async () => {
    if (!selectedBillId) {
      setError('Please select a bill');
      return;
    }

    setAssigning(true);
    setError('');

    try {
      const selectedBill = bills.find(b => b.id === selectedBillId);
      await onAssign(selectedBillId, selectedBill);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to assign product(s) to bill');
    } finally {
      setAssigning(false);
    }
  };

  // Get product names for display
  const getProductNames = () => {
    if (mode === 'single' && products.length === 1) {
      return products[0].productName || 'Unnamed Product';
    }
    return `${products.length} products`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'bulk' ? 'Assign Products to Bill' : 'Assign to Bill'}
      maxWidth={550}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Product Info */}
        <div style={{
          padding: '12px 16px',
          background: 'var(--primary-soft)',
          border: '1px solid var(--primary-soft)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Package size={20} color="var(--primary-accent)" />
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary-accent)' }}>
              {mode === 'bulk' ? 'Bulk Assignment' : 'Assigning Product'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--primary-accent)' }}>
              {getProductNames()}
            </div>
          </div>
        </div>

        {/* Search Bills */}
        <div>
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted-foreground)'
              }}
            />
            <input
              type="text"
              placeholder="Search bills by number or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid var(--input)',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Bills List */}
        <div style={{
          maxHeight: '300px',
          overflowY: 'auto',
          border: '1px solid var(--border)',
          borderRadius: '8px'
        }}>
          {loading ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--muted-foreground)'
            }}>
              Loading bills...
            </div>
          ) : filteredBills.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--muted-foreground)'
            }}>
              <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div>{searchTerm ? 'No bills match your search' : 'No active bills found'}</div>
            </div>
          ) : (
            <div>
              {filteredBills.map((bill, index) => (
                <div
                  key={bill.id}
                  onClick={() => setSelectedBillId(bill.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: index < filteredBills.length - 1 ? '1px solid var(--secondary)' : 'none',
                    cursor: 'pointer',
                    background: selectedBillId === bill.id ? 'var(--primary-soft)' : 'var(--card)',
                    transition: 'background 0.15s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedBillId !== bill.id) {
                      e.currentTarget.style.background = 'var(--secondary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedBillId !== bill.id) {
                      e.currentTarget.style.background = 'var(--card)';
                    }
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <span style={{
                        fontWeight: '600',
                        color: 'var(--foreground)',
                        fontSize: '14px'
                      }}>
                        {bill.billNumber}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: bill.status === 'active' ? 'var(--success-soft)' : 'var(--secondary)',
                        color: bill.status === 'active' ? 'var(--success)' : 'var(--muted-foreground)'
                      }}>
                        {bill.status || 'active'}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      fontSize: '12px',
                      color: 'var(--muted-foreground)'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} />
                        {bill.vendor || 'Unknown'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        {formatDate(bill.date)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Package size={12} />
                        {bill.productCount || 0} items
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--foreground)'
                    }}>
                      {formatCurrency(bill.totalAmount)}
                    </div>
                    {selectedBillId === bill.id && (
                      <Check size={16} color="var(--primary)" style={{ marginTop: '4px' }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px',
            background: 'var(--danger-soft)',
            border: '1px solid var(--danger-soft)',
            borderRadius: '8px',
            color: 'var(--danger)',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          paddingTop: '16px',
          borderTop: '1px solid var(--border)'
        }}>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={assigning}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAssign}
            loading={assigning}
            disabled={!selectedBillId || assigning}
            icon={<FileText size={16} />}
          >
            {assigning ? 'Assigning...' : `Assign to Bill`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignBillModal;
