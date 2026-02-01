import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import { Calendar, User, FileText, Tag, DollarSign, Package, TrendingUp, IndianRupee } from 'lucide-react';

const BillEditModal = ({
  isOpen,
  bill,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    billNumber: '',
    date: '',
    vendor: '',
    notes: '',
    status: 'active',
    totalAmount: '',
    totalQuantity: '',
    totalProfit: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Initialize form data when bill changes
  useEffect(() => {
    if (bill) {
      const billDate = bill.date instanceof Date ? bill.date : new Date(bill.date);
      setFormData({
        billNumber: bill.billNumber || '',
        date: billDate.toISOString().split('T')[0],
        vendor: bill.vendor || '',
        notes: bill.notes || '',
        status: bill.status || 'active',
        totalAmount: bill.totalAmount || 0,
        totalQuantity: bill.totalQuantity || 0,
        totalProfit: bill.totalProfit || 0
      });
    }
  }, [bill]);

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
    const newErrors = {};

    // Bill number validation
    if (!formData.billNumber.trim()) {
      newErrors.billNumber = 'Bill number is required';
    } else if (formData.billNumber.length > 20) {
      newErrors.billNumber = 'Bill number must be less than 20 characters';
    }

    // Date validation
    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      const date = new Date(formData.date);
      if (isNaN(date.getTime())) {
        newErrors.date = 'Invalid date';
      }
    }

    // Vendor validation
    if (!formData.vendor.trim()) {
      newErrors.vendor = 'Vendor is required';
    } else if (formData.vendor.length > 100) {
      newErrors.vendor = 'Vendor name must be less than 100 characters';
    }

    // Notes validation (optional)
    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = 'Notes must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const updatedBill = {
        ...formData,
        date: new Date(formData.date)
      };

      await onSave(updatedBill);
    } catch (error) {
      console.error('Error saving bill:', error);
      setErrors({ submit: 'Failed to save bill. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!loading) {
      setErrors({});
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
      title="Edit Bill"
      maxWidth={500}
    >
      <form onSubmit={handleSubmit} role="form">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Bill Number */}
            <div>
              <Input
                label="Bill Number *"
                icon={<Tag size={16} />}
                type="text"
                value={formData.billNumber}
                onChange={(e) => handleChange('billNumber', e.target.value)}
                placeholder="Enter bill number"
                error={errors.billNumber}
                disabled={loading}
              />
            </div>

            {/* Date */}
            <div>
              <Input
                label="Date *"
                icon={<Calendar size={16} />}
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                error={errors.date}
                disabled={loading}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Vendor */}
            <div>
              <Input
                label="Vendor *"
                icon={<User size={16} />}
                type="text"
                value={formData.vendor}
                onChange={(e) => handleChange('vendor', e.target.value)}
                placeholder="Enter vendor name"
                error={errors.vendor}
                disabled={loading}
              />
            </div>

            {/* Status */}
            <div>
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                options={statusOptions}
                disabled={loading}
              />
            </div>
          </div>

          {/* Financials Section */}
          <div style={{
            padding: '16px',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              margin: '0 0 4px 0'
            }}>
              Financial Details
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Total Amount */}
              <div>
                <Input
                  label="Total Amount"
                  icon={<IndianRupee size={16} />}
                  type="number"
                  value={formData.totalAmount}
                  onChange={(e) => handleChange('totalAmount', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={loading}
                />
              </div>

              {/* Total Quantity */}
              <div>
                <Input
                  label="Total Quantity"
                  icon={<Package size={16} />}
                  type="number"
                  value={formData.totalQuantity}
                  onChange={(e) => handleChange('totalQuantity', e.target.value)}
                  placeholder="0"
                  min="0"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Total Profit */}
            <div>
              <Input
                label="Total Profit"
                icon={<TrendingUp size={16} />}
                type="number"
                value={formData.totalProfit}
                onChange={(e) => handleChange('totalProfit', e.target.value)}
                placeholder="0.00"
                step="0.01"
                disabled={loading}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              <FileText size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Notes
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Enter any notes about this bill..."
              rows={3}
              error={errors.notes}
              disabled={loading}
            />
            <div style={{
              marginTop: '4px',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              {formData.notes.length}/500 characters
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div style={{
              padding: '12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '14px'
            }}>
              {errors.submit}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            paddingTop: '20px',
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
            >
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default BillEditModal;