import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Package, DollarSign, Hash, Tag, User, Plus, Edit } from 'lucide-react';

const ProductModal = ({
  isOpen,
  onClose,
  onSave,
  product = null, // null for create, object for edit
  bill = null, // bill context for product creation
  mode = 'create' // 'create' or 'edit'
}) => {
  const [formData, setFormData] = useState({
    productName: '',
    category: '',
    vendor: '',
    mrp: '',
    totalQuantity: '',
    pricePerPiece: '',
    profitPerPiece: '',
    totalAmount: '',
    billId: bill?.id || '',
    billNumber: bill?.billNumber || ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Initialize form data when product or bill changes
  useEffect(() => {
    if (product && mode === 'edit') {
      setFormData({
        productName: product.productName || '',
        category: product.category || '',
        vendor: product.vendor || '',
        mrp: product.mrp?.toString() || '',
        totalQuantity: product.totalQuantity?.toString() || '',
        pricePerPiece: product.pricePerPiece?.toString() || '',
        profitPerPiece: product.profitPerPiece?.toString() || '',
        totalAmount: product.totalAmount?.toString() || '',
        billId: product.billId || '',
        billNumber: product.billNumber || ''
      });
    } else if (bill && mode === 'create') {
      setFormData(prev => ({
        ...prev,
        billId: bill.id,
        billNumber: bill.billNumber,
        vendor: bill.vendor // Pre-fill vendor from bill
      }));
    }
  }, [product, bill, mode]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        productName: '',
        category: '',
        vendor: '',
        mrp: '',
        totalQuantity: '',
        pricePerPiece: '',
        profitPerPiece: '',
        totalAmount: '',
        billId: bill?.id || '',
        billNumber: bill?.billNumber || ''
      });
      setErrors({});
    }
  }, [isOpen, bill]);

  // Calculate total amount when quantity or price changes
  useEffect(() => {
    const quantity = parseFloat(formData.totalQuantity) || 0;
    const price = parseFloat(formData.pricePerPiece) || 0;
    const totalAmount = quantity * price;

    if (totalAmount !== parseFloat(formData.totalAmount)) {
      setFormData(prev => ({
        ...prev,
        totalAmount: totalAmount.toString()
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.totalQuantity, formData.pricePerPiece]);

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

    // Product name validation
    if (!formData.productName.trim()) {
      newErrors.productName = 'Product name is required';
    } else if (formData.productName.length > 100) {
      newErrors.productName = 'Product name must be less than 100 characters';
    }

    // Category validation
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    } else if (formData.category.length > 50) {
      newErrors.category = 'Category must be less than 50 characters';
    }

    // Vendor validation
    if (!formData.vendor.trim()) {
      newErrors.vendor = 'Vendor is required';
    } else if (formData.vendor.length > 100) {
      newErrors.vendor = 'Vendor name must be less than 100 characters';
    }

    // MRP validation
    const mrp = parseFloat(formData.mrp);
    if (!formData.mrp || isNaN(mrp) || mrp <= 0) {
      newErrors.mrp = 'MRP must be a positive number';
    }

    // Quantity validation
    const quantity = parseFloat(formData.totalQuantity);
    if (!formData.totalQuantity || isNaN(quantity) || quantity <= 0) {
      newErrors.totalQuantity = 'Quantity must be a positive number';
    }

    // Price per piece validation
    const pricePerPiece = parseFloat(formData.pricePerPiece);
    if (!formData.pricePerPiece || isNaN(pricePerPiece) || pricePerPiece <= 0) {
      newErrors.pricePerPiece = 'Price per piece must be a positive number';
    }

    // Profit per piece validation
    const profitPerPiece = parseFloat(formData.profitPerPiece);
    if (!formData.profitPerPiece || isNaN(profitPerPiece)) {
      newErrors.profitPerPiece = 'Profit per piece must be a valid number';
    }

    // Business logic validation
    if (!isNaN(mrp) && !isNaN(pricePerPiece) && pricePerPiece > mrp) {
      newErrors.pricePerPiece = 'Price per piece cannot be greater than MRP';
    }

    if (!isNaN(pricePerPiece) && !isNaN(profitPerPiece) && profitPerPiece >= pricePerPiece) {
      newErrors.profitPerPiece = 'Profit per piece must be less than price per piece';
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
      const productData = {
        productName: formData.productName.trim(),
        category: formData.category.trim(),
        vendor: formData.vendor.trim(),
        mrp: parseFloat(formData.mrp),
        totalQuantity: parseFloat(formData.totalQuantity),
        pricePerPiece: parseFloat(formData.pricePerPiece),
        profitPerPiece: parseFloat(formData.profitPerPiece),
        totalAmount: parseFloat(formData.totalAmount),
        billId: formData.billId,
        billNumber: formData.billNumber,
        date: new Date()
      };

      // Include the id when editing an existing product
      if (mode === 'edit' && product?.id) {
        productData.id = product.id;
      }

      await onSave(productData);
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      setErrors({ submit: error.message || 'Failed to save product. Please try again.' });
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

  // Category options (you can expand this list)
  const categoryOptions = [
    { value: '', label: 'Select Category' },
    { value: 'Electronics', label: 'Electronics' },
    { value: 'Clothing', label: 'Clothing' },
    { value: 'Food & Beverages', label: 'Food & Beverages' },
    { value: 'Home & Garden', label: 'Home & Garden' },
    { value: 'Sports & Outdoors', label: 'Sports & Outdoors' },
    { value: 'Books', label: 'Books' },
    { value: 'Toys & Games', label: 'Toys & Games' },
    { value: 'Health & Beauty', label: 'Health & Beauty' },
    { value: 'Automotive', label: 'Automotive' },
    { value: 'Other', label: 'Other' }
  ];

  const modalTitle = mode === 'edit' ? 'Edit Product' :
    (bill ? `Add Product to ${bill.billNumber}` : 'Add Product');

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      maxWidth={600}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Bill Context Info */}
          {bill && (
            <div style={{
              padding: '12px',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#0369a1'
            }}>
              <strong>Bill:</strong> {bill.billNumber} | <strong>Vendor:</strong> {bill.vendor}
              {bill.date && (
                <> | <strong>Date:</strong> {(() => {
                  // Handle Firestore Timestamp, Date object, or date string
                  const date = bill.date?.toDate ? bill.date.toDate() :
                               bill.date instanceof Date ? bill.date :
                               new Date(bill.date);
                  return date.toLocaleDateString();
                })()}</>
              )}
            </div>
          )}

          {/* Product Name */}
          <div>
            <Input
              label={
                <span>
                  <Package size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Product Name *
                </span>
              }
              type="text"
              value={formData.productName}
              onChange={(e) => handleChange('productName', e.target.value)}
              placeholder="Enter product name"
              error={errors.productName}
              disabled={loading}
            />
          </div>

          {/* Category and Vendor Row */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <Select
                label={
                  <span>
                    <Tag size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Category *
                  </span>
                }
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                options={categoryOptions}
                error={errors.category}
                disabled={loading}
              />
            </div>
            <div style={{ flex: 1 }}>
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
          </div>

          {/* MRP and Quantity Row */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <Input
                label={
                  <span>
                    <DollarSign size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    MRP *
                  </span>
                }
                type="number"
                step="0.01"
                min="0"
                value={formData.mrp}
                onChange={(e) => handleChange('mrp', e.target.value)}
                placeholder="0.00"
                error={errors.mrp}
                disabled={loading}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                label={
                  <span>
                    <Hash size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Quantity *
                  </span>
                }
                type="number"
                step="0.01"
                min="0"
                value={formData.totalQuantity}
                onChange={(e) => handleChange('totalQuantity', e.target.value)}
                placeholder="0"
                error={errors.totalQuantity}
                disabled={loading}
              />
            </div>
          </div>

          {/* Price Per Piece and Profit Per Piece Row */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <Input
                label={
                  <span>
                    <DollarSign size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Price Per Piece *
                  </span>
                }
                type="number"
                step="0.01"
                min="0"
                value={formData.pricePerPiece}
                onChange={(e) => handleChange('pricePerPiece', e.target.value)}
                placeholder="0.00"
                error={errors.pricePerPiece}
                disabled={loading}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                label={
                  <span>
                    <DollarSign size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Profit Per Piece *
                  </span>
                }
                type="number"
                step="0.01"
                value={formData.profitPerPiece}
                onChange={(e) => handleChange('profitPerPiece', e.target.value)}
                placeholder="0.00"
                error={errors.profitPerPiece}
                disabled={loading}
              />
            </div>
          </div>

          {/* Total Amount (Read-only) */}
          <div>
            <Input
              label={
                <span>
                  <DollarSign size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Total Amount
                </span>
              }
              type="number"
              step="0.01"
              value={formData.totalAmount}
              placeholder="0.00"
              disabled={true}
              style={{ background: '#f9fafb', color: '#6b7280' }}
            />
            <div style={{
              marginTop: '4px',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              Automatically calculated: Quantity × Price Per Piece
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
              icon={mode === 'edit' ? <Edit size={16} /> : <Plus size={16} />}
            >
              {loading ? (mode === 'edit' ? 'Updating...' : 'Adding...') :
                (mode === 'edit' ? 'Update Product' : 'Add Product')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ProductModal;