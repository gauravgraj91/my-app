import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FileText, Search, Calendar, User, Package, Check, AlertCircle } from 'lucide-react';
import { subscribeToBills } from '../../firebase/billService';
import { format } from 'date-fns';

const AssignBillModal = ({
  isOpen,
  onClose,
  onAssign,
  products = [], // Array of products to assign (for bulk) or single product
  mode = 'single' // 'single' or 'bulk'
}) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  // Subscribe to bills
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError('');
    setSelectedBillId('');
    setSearchTerm('');

    const unsubscribe = subscribeToBills((billsData) => {
      // Filter out archived bills
      const activeBills = billsData.filter(bill => bill.status !== 'archived');
      setBills(activeBills);
      setLoading(false);
    }, {
      onError: (err) => {
        setError('Failed to load bills. Please try again.');
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
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
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Package size={20} color="#0369a1" />
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1' }}>
              {mode === 'bulk' ? 'Bulk Assignment' : 'Assigning Product'}
            </div>
            <div style={{ fontSize: '13px', color: '#0c4a6e' }}>
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
                color: '#9ca3af'
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
                border: '1px solid #d1d5db',
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
          border: '1px solid #e5e7eb',
          borderRadius: '8px'
        }}>
          {loading ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              Loading bills...
            </div>
          ) : filteredBills.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280'
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
                    borderBottom: index < filteredBills.length - 1 ? '1px solid #f3f4f6' : 'none',
                    cursor: 'pointer',
                    background: selectedBillId === bill.id ? '#eff6ff' : 'white',
                    transition: 'background 0.15s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedBillId !== bill.id) {
                      e.currentTarget.style.background = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedBillId !== bill.id) {
                      e.currentTarget.style.background = 'white';
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
                        color: '#1f2937',
                        fontSize: '14px'
                      }}>
                        {bill.billNumber}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: bill.status === 'active' ? '#dcfce7' : '#f3f4f6',
                        color: bill.status === 'active' ? '#166534' : '#6b7280'
                      }}>
                        {bill.status || 'active'}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      fontSize: '12px',
                      color: '#6b7280'
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
                      color: '#1f2937'
                    }}>
                      {formatCurrency(bill.totalAmount)}
                    </div>
                    {selectedBillId === bill.id && (
                      <Check size={16} color="#2563eb" style={{ marginTop: '4px' }} />
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
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
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
          borderTop: '1px solid #e5e7eb'
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
