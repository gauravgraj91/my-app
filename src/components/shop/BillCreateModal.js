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
              <div style={{
                marginTop: '4px',
                fontSize: '12px',
                color: '#6b7280'
              }}>
                Auto-generated
              </div>
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

          {/* Product Details Section */}
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
              Product Details
            </h3>

            {/* Product Name */}
            <div>
              <Input
                label="Product Name"
                icon={<Tag size={16} />}
                type="text"
                value={formData.productName}
                onChange={(e) => handleChange('productName', e.target.value)}
                placeholder="Enter product name"
                disabled={loading}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* MRP */}
              <div>
                <Input
                  label="MRP"
                  type="number"
                  value={formData.mrp}
                  onChange={(e) => handleChange('mrp', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={loading}
                />
              </div>

              {/* Quantity */}
              <div>
                <Input
                  label="Quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleChange('quantity', e.target.value)}
                  placeholder="0"
                  min="1"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Total Amount Paid */}
            <div>
              <Input
                label="Total Amount Paid (Cost)"
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

            {/* Calculated Values Display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px',
              marginTop: '8px',
              padding: '12px',
              background: '#ffffff',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Cost / Unit</div>
                <div style={{ fontWeight: '600', color: '#374151' }}>
                  ₹{calculatedValues.costPerUnit.toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Profit / Unit</div>
                <div style={{
                  fontWeight: '600',
                  color: calculatedValues.profitPerPiece >= 0 ? '#059669' : '#dc2626'
                }}>
                  ₹{calculatedValues.profitPerPiece.toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Total Profit</div>
                <div style={{
                  fontWeight: '600',
                  color: calculatedValues.totalProfit >= 0 ? '#059669' : '#dc2626'
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
                <span>
                  <FileText size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Notes
                </span>
              }
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