import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import { Calendar, User, FileText, Tag, Plus, IndianRupee } from 'lucide-react';
import { BillModel } from '../../firebase/billService';

const BillCreateModal = ({
  isOpen,
  onClose,
  onSave,
  existingBills = []
}) => {
  const [formData, setFormData] = useState({
    billNumber: '',
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    notes: '',
    status: 'active',
    // Product details
    productName: '',
    mrp: '',
    quantity: '',
    totalAmount: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Generate bill number when modal opens
  useEffect(() => {
    if (isOpen && existingBills.length >= 0) {
      const newBillNumber = BillModel.generateBillNumber(existingBills);
      setFormData(prev => ({
        ...prev,
        billNumber: newBillNumber
      }));
    }
  }, [isOpen, existingBills]);

  // Calculate derived values
  const calculatedValues = React.useMemo(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const totalAmount = parseFloat(formData.totalAmount) || 0;
    const mrp = parseFloat(formData.mrp) || 0;

    if (quantity <= 0) {
      return {
        costPerUnit: 0,
        profitPerPiece: 0,
        totalProfit: 0
      };
    }

    const costPerUnit = totalAmount / quantity;
    const profitPerPiece = mrp - costPerUnit;
    const totalProfit = profitPerPiece * quantity;

    return {
      costPerUnit,
      profitPerPiece,
      totalProfit
    };
  }, [formData.quantity, formData.totalAmount, formData.mrp]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        billNumber: '',
        date: new Date().toISOString().split('T')[0],
        vendor: '',
        notes: '',
        status: 'active',
        productName: '',
        mrp: '',
        quantity: '',
        totalAmount: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  // Handle input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Validate form data
  const validateForm = () => {
    const validationErrors = BillModel.validate(formData);

    if (validationErrors) {
      setErrors(validationErrors);
      return false;
    }

    // Additional validation for bill number uniqueness
    const existingBillNumbers = existingBills.map(bill => bill.billNumber);
    if (existingBillNumbers.includes(formData.billNumber)) {
      setErrors({ billNumber: 'Bill number already exists' });
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const billData = {
        ...formData,
        date: new Date(formData.date),
        // Include calculated values
        ...calculatedValues
      };

      await onSave(billData);
      onClose();
    } catch (error) {
      console.error('Error creating bill:', error);
      setErrors({ submit: error.message || 'Failed to create bill. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // Status options
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'paid', label: 'Paid' },
    { value: 'archived', label: 'Archived' },
    { value: 'returned', label: 'Returned' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Bill"
      maxWidth={500}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ── Bill Info Section ── */}
          <div style={{
            background: '#fafbfc',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            padding: '16px'
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#6b7280',
              marginBottom: '12px'
            }}>
              Bill Info
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <Input
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Tag size={14} /> Bill # <span style={{ color: '#ef4444' }}>*</span>
                      <span style={{
                        fontSize: '10px',
                        color: '#6b7280',
                        background: '#f3f4f6',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 500
                      }}>Auto</span>
                    </span>
                  }
                  type="text"
                  value={formData.billNumber}
                  onChange={(e) => handleChange('billNumber', e.target.value)}
                  placeholder="B001"
                  error={errors.billNumber}
                  disabled={loading}
                  containerStyle={{ marginBottom: 0 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} /> Date <span style={{ color: '#ef4444' }}>*</span>
                    </span>
                  }
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  error={errors.date}
                  disabled={loading}
                  containerStyle={{ marginBottom: 0 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <Input
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} /> Vendor <span style={{ color: '#ef4444' }}>*</span>
                    </span>
                  }
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => handleChange('vendor', e.target.value)}
                  placeholder="Enter vendor name"
                  error={errors.vendor}
                  disabled={loading}
                  containerStyle={{ marginBottom: 0 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      Status
                    </span>
                  }
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  options={statusOptions}
                  disabled={loading}
                  containerStyle={{ marginBottom: 0 }}
                />
              </div>
            </div>
          </div>

          {/* ── Product Details Section ── */}
          <div style={{
            background: '#fafbfc',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            padding: '16px'
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#6b7280',
              marginBottom: '12px'
            }}>
              Product Details
            </div>

            <Input
              label={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={14} /> Product Name
                </span>
              }
              type="text"
              value={formData.productName}
              onChange={(e) => handleChange('productName', e.target.value)}
              placeholder="Enter product name"
              disabled={loading}
              containerStyle={{ marginBottom: 12 }}
            />

            {/* MRP, Total Cost, Qty in 3-column layout */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <Input
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <IndianRupee size={14} /> MRP
                    </span>
                  }
                  type="number"
                  value={formData.mrp}
                  onChange={(e) => handleChange('mrp', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={loading}
                  containerStyle={{ marginBottom: 0 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <IndianRupee size={14} /> Total Cost
                    </span>
                  }
                  type="number"
                  value={formData.totalAmount}
                  onChange={(e) => handleChange('totalAmount', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={loading}
                  containerStyle={{ marginBottom: 0 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      # Qty
                    </span>
                  }
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleChange('quantity', e.target.value)}
                  placeholder="0"
                  min="1"
                  disabled={loading}
                  containerStyle={{ marginBottom: 0 }}
                />
              </div>
            </div>

            {/* Auto-calculated values in green card */}
            <div style={{
              display: 'flex',
              gap: '0',
              padding: '12px',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
              border: '1px solid #bbf7d0',
              borderRadius: '8px'
            }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  fontSize: '10px',
                  color: '#15803d',
                  fontWeight: 500,
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}>
                  Cost/Unit
                  <span style={{
                    fontSize: '9px',
                    color: '#86efac',
                    background: '#166534',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    fontWeight: 600
                  }}>AUTO</span>
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#166534',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  ₹{calculatedValues.costPerUnit.toFixed(2)}
                </div>
              </div>
              <div style={{
                width: '1px',
                background: '#bbf7d0',
                alignSelf: 'stretch'
              }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  fontSize: '10px',
                  color: '#15803d',
                  fontWeight: 500,
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}>
                  Profit/Unit
                  <span style={{
                    fontSize: '9px',
                    color: '#86efac',
                    background: '#166534',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    fontWeight: 600
                  }}>AUTO</span>
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: calculatedValues.profitPerPiece >= 0 ? '#166534' : '#dc2626',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  ₹{calculatedValues.profitPerPiece.toFixed(2)}
                </div>
              </div>
              <div style={{
                width: '1px',
                background: '#bbf7d0',
                alignSelf: 'stretch'
              }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  fontSize: '10px',
                  color: '#15803d',
                  fontWeight: 500,
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}>
                  Total Profit
                  <span style={{
                    fontSize: '9px',
                    color: '#86efac',
                    background: '#166534',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    fontWeight: 600
                  }}>AUTO</span>
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: calculatedValues.totalProfit >= 0 ? '#166534' : '#dc2626',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  ₹{calculatedValues.totalProfit.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Textarea
              label={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} /> Notes
                  <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>
                    ({formData.notes.length}/500)
                  </span>
                </span>
              }
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Add any notes about this bill..."
              rows={2}
              error={errors.notes}
              disabled={loading}
              containerStyle={{ marginBottom: 0 }}
            />
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ⚠️ {errors.submit}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            paddingTop: '12px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              icon={<Plus size={16} />}
            >
              Create Bill
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default BillCreateModal;