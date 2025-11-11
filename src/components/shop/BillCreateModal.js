import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import { Calendar, User, FileText, Tag, Plus } from 'lucide-react';
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
    status: 'active'
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

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        billNumber: '',
        date: new Date().toISOString().split('T')[0],
        vendor: '',
        notes: '',
        status: 'active'
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
        date: new Date(formData.date)
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
          {/* Bill Number */}
          <div>
            <Input
              label={
                <span>
                  <Tag size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Bill Number *
                </span>
              }
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
              Auto-generated bill number. You can modify if needed.
            </div>
          </div>

          {/* Date */}
          <div>
            <Input
              label={
                <span>
                  <Calendar size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Date *
                </span>
              }
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              error={errors.date}
              disabled={loading}
            />
          </div>

          {/* Vendor */}
          <div>
            <Input
              label={
                <span>
                  <User size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Vendor *
                </span>
              }
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