import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Package, IndianRupee, Hash, Tag, User, Plus, Edit } from 'lucide-react';
import { useBills } from '../../context/BillsContext';

const ProductModal = ({
  isOpen,
  onClose,
  product = null, // null for create, object for edit
  bill = null, // bill context for product creation
  mode = 'create' // 'create' or 'edit'
}) => {
  const { handleAddProductToBill } = useBills();
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

  // Calculate profit per piece when MRP or price per piece changes
  useEffect(() => {
    const mrp = parseFloat(formData.mrp) || 0;
    const pricePerPiece = parseFloat(formData.pricePerPiece) || 0;
    const profitPerPiece = mrp - pricePerPiece;

    if (profitPerPiece.toFixed(2) !== parseFloat(formData.profitPerPiece).toFixed(2)) {
      setFormData(prev => ({
        ...prev,
        profitPerPiece: profitPerPiece.toFixed(2)
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.mrp, formData.pricePerPiece]);

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

    // Business logic validation
    if (!isNaN(mrp) && !isNaN(pricePerPiece) && pricePerPiece > mrp) {
      newErrors.pricePerPiece = 'Price per piece cannot be greater than MRP';
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

      await handleAddProductToBill(productData, bill);
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Bill Context Info */}
          {bill && (
            <div style={{
              padding: '10px 14px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#1e40af',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              <span style={{ fontWeight: 600 }}>📋 {bill.billNumber}</span>
              <span style={{ color: '#93c5fd' }}>•</span>
              <span>{bill.vendor}</span>
              {bill.date && (
                <>
                  <span style={{ color: '#93c5fd' }}>•</span>
                  <span>{(() => {
                    const date = bill.date?.toDate ? bill.date.toDate() :
                      bill.date instanceof Date ? bill.date :
                        new Date(bill.date);
                    return date.toLocaleDateString();
                  })()}</span>
                </>
              )}
            </div>
          )}

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
                  <Package size={14} /> Product Name <span style={{ color: '#ef4444' }}>*</span>
                </span>
              }
              type="text"
              value={formData.productName}
              onChange={(e) => handleChange('productName', e.target.value)}
              placeholder="Enter product name"
              error={errors.productName}
              disabled={loading}
              containerStyle={{ marginBottom: 12 }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <Select
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Tag size={14} /> Category <span style={{ color: '#ef4444' }}>*</span>
                    </span>
                  }
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  options={categoryOptions}
                  error={errors.category}
                  disabled={loading}
                  containerStyle={{ marginBottom: 0 }}
                />
              </div>
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
            </div>
          </div>

          {/* ── Pricing Section ── */}
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
              Pricing & Quantity
            </div>

            {/* MRP, Quantity, Price Per Piece - 3 column */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <Input
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <IndianRupee size={14} /> MRP <span style={{ color: '#ef4444' }}>*</span>
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
                  containerStyle={{ marginBottom: 0 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <IndianRupee size={14} /> Cost/pc <span style={{ color: '#ef4444' }}>*</span>
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
                  containerStyle={{ marginBottom: 0 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Hash size={14} /> Qty <span style={{ color: '#ef4444' }}>*</span>
                    </span>
                  }
                  type="number"
                  step="1"
                  min="0"
                  value={formData.totalQuantity}
                  onChange={(e) => handleChange('totalQuantity', e.target.value)}
                  placeholder="0"
                  error={errors.totalQuantity}
                  disabled={loading}
                  containerStyle={{ marginBottom: 0 }}
                />
              </div>
            </div>

            {/* Auto-calculated fields */}
            <div style={{
              display: 'flex',
              gap: '12px',
              padding: '12px',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
              border: '1px solid #bbf7d0',
              borderRadius: '8px'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '11px',
                  color: '#15803d',
                  fontWeight: 500,
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <IndianRupee size={12} /> Profit/pc
                  <span style={{
                    fontSize: '10px',
                    color: '#86efac',
                    background: '#166534',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    marginLeft: '4px'
                  }}>AUTO</span>
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: parseFloat(formData.profitPerPiece) >= 0 ? '#166534' : '#dc2626',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  ₹{formData.profitPerPiece || '0.00'}
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                  MRP − Cost/pc
                </div>
              </div>
              <div style={{
                width: '1px',
                background: '#bbf7d0',
                alignSelf: 'stretch'
              }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '11px',
                  color: '#15803d',
                  fontWeight: 500,
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <IndianRupee size={12} /> Total Amount
                  <span style={{
                    fontSize: '10px',
                    color: '#86efac',
                    background: '#166534',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    marginLeft: '4px'
                  }}>AUTO</span>
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#166534',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  ₹{formData.totalAmount || '0.00'}
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                  Cost/pc × Qty
                </div>
              </div>
            </div>
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