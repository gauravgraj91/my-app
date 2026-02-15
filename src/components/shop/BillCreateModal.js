import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import { Calendar, User, FileText, Tag, Plus, IndianRupee, X } from 'lucide-react';
import { BillModel } from '../../firebase/billService';
import { useBills } from '../../context/BillsContext';
import { useVendors } from '../../context/VendorsContext';

const emptyProduct = () => ({ productName: '', mrp: '', quantity: '', totalAmount: '' });

const BillCreateModal = ({
  isOpen,
  onClose,
  mode = 'create',
  bill = null
}) => {
  const { bills: existingBills, handleCreateBill, handleEditBill } = useBills();
  const { vendors } = useVendors();
  const isEditMode = mode === 'edit' && bill;

  const getInitialFormData = () => ({
    billNumber: '',
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    notes: '',
    status: 'active'
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [products, setProducts] = useState([emptyProduct()]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Pre-fill form for edit mode, or generate bill number for create mode
  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode) {
      const billDate = bill.date?.toDate ? bill.date.toDate() :
        bill.date instanceof Date ? bill.date : new Date(bill.date);
      const dateStr = billDate.toISOString().split('T')[0];

      setFormData({
        billNumber: bill.billNumber || '',
        date: dateStr,
        vendor: bill.vendor || '',
        notes: bill.notes || '',
        status: bill.status || 'active'
      });
    } else if (existingBills.length >= 0) {
      const newBillNumber = BillModel.generateBillNumber(existingBills);
      setFormData(prev => ({
        ...prev,
        billNumber: newBillNumber
      }));
    }
  }, [isOpen, isEditMode, bill, existingBills]);

  // Calculate per-product derived values and grand totals
  const { productCalcs, grandTotals } = React.useMemo(() => {
    const calcs = products.map(p => {
      const qty = parseFloat(p.quantity) || 0;
      const amount = parseFloat(p.totalAmount) || 0;
      const mrp = parseFloat(p.mrp) || 0;
      if (qty <= 0) return { costPerUnit: 0, profitPerPiece: 0, totalProfit: 0 };
      const costPerUnit = amount / qty;
      const profitPerPiece = mrp - costPerUnit;
      return { costPerUnit, profitPerPiece, totalProfit: profitPerPiece * qty };
    });

    const totals = products.reduce((acc, p, i) => {
      const qty = parseFloat(p.quantity) || 0;
      const amount = parseFloat(p.totalAmount) || 0;
      return {
        totalItems: acc.totalItems + qty,
        totalAmount: acc.totalAmount + amount,
        totalProfit: acc.totalProfit + calcs[i].totalProfit
      };
    }, { totalItems: 0, totalAmount: 0, totalProfit: 0 });

    return { productCalcs: calcs, grandTotals: totals };
  }, [products]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData(getInitialFormData());
      setProducts([emptyProduct()]);
      setErrors({});
    }
  }, [isOpen]);

  // Handle bill-level input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle product-level input changes
  const handleProductChange = (index, field, value) => {
    setProducts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const addProduct = () => {
    setProducts(prev => [...prev, emptyProduct()]);
  };

  const removeProduct = (index) => {
    if (products.length <= 1) return;
    setProducts(prev => prev.filter((_, i) => i !== index));
  };

  // Validate form data
  const validateForm = () => {
    const validationErrors = BillModel.validate(formData);

    if (validationErrors) {
      setErrors(validationErrors);
      return false;
    }

    // Additional validation for bill number uniqueness (skip for current bill in edit mode)
    const existingBillNumbers = existingBills
      .filter(b => !(isEditMode && b.id === bill.id))
      .map(b => b.billNumber);
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
        products: products.filter(p => p.productName || p.quantity || p.totalAmount)
      };

      if (isEditMode) {
        await handleEditBill(bill.id, billData);
      } else {
        await handleCreateBill(billData);
      }
      onClose();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} bill:`, error);
      setErrors({ submit: error.message || `Failed to ${isEditMode ? 'update' : 'create'} bill. Please try again.` });
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
      title={isEditMode ? "Edit Bill" : "Create New Bill"}
      maxWidth={600}
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
                <Select
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} /> Vendor <span style={{ color: '#ef4444' }}>*</span>
                    </span>
                  }
                  value={formData.vendor}
                  onChange={(e) => handleChange('vendor', e.target.value)}
                  options={[
                    { value: '', label: 'Select a vendor...' },
                    ...vendors.map(v => ({ value: v.name, label: v.name }))
                  ]}
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
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Products ({products.length})</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {products.map((product, index) => (
                <div key={index} style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  position: 'relative'
                }}>
                  {/* Remove button */}
                  {products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProduct(index)}
                      disabled={loading}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#9ca3af',
                        padding: '2px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'none'; }}
                    >
                      <X size={14} />
                    </button>
                  )}

                  <Input
                    label={
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Tag size={14} /> Product Name
                      </span>
                    }
                    type="text"
                    value={product.productName}
                    onChange={(e) => handleProductChange(index, 'productName', e.target.value)}
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
                        value={product.mrp}
                        onChange={(e) => handleProductChange(index, 'mrp', e.target.value)}
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
                        value={product.totalAmount}
                        onChange={(e) => handleProductChange(index, 'totalAmount', e.target.value)}
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
                        value={product.quantity}
                        onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                        placeholder="0"
                        min="1"
                        disabled={loading}
                        containerStyle={{ marginBottom: 0 }}
                      />
                    </div>
                  </div>

                  {/* Per-product auto-calculated values */}
                  <div style={{
                    display: 'flex',
                    gap: '0',
                    padding: '8px',
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px'
                  }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#15803d', fontWeight: 500, marginBottom: '2px' }}>
                        Cost/Unit
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{productCalcs[index].costPerUnit.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ width: '1px', background: '#bbf7d0', alignSelf: 'stretch' }} />
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#15803d', fontWeight: 500, marginBottom: '2px' }}>
                        Profit/Unit
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: productCalcs[index].profitPerPiece >= 0 ? '#166534' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{productCalcs[index].profitPerPiece.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ width: '1px', background: '#bbf7d0', alignSelf: 'stretch' }} />
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#15803d', fontWeight: 500, marginBottom: '2px' }}>
                        Total Profit
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: productCalcs[index].totalProfit >= 0 ? '#166534' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{productCalcs[index].totalProfit.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Product button */}
            <button
              type="button"
              onClick={addProduct}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '12px',
                padding: '8px 14px',
                background: 'none',
                border: '1px dashed #d1d5db',
                borderRadius: '6px',
                color: '#6b7280',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                width: '100%',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#9ca3af'; e.currentTarget.style.color = '#374151'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#6b7280'; }}
            >
              <Plus size={14} /> Add Product
            </button>

            {/* Grand totals summary */}
            {products.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '0',
                padding: '12px',
                marginTop: '12px',
                background: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)',
                border: '1px solid #bfdbfe',
                borderRadius: '8px'
              }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#1d4ed8', fontWeight: 500, marginBottom: '4px' }}>
                    Total Items
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e40af', fontVariantNumeric: 'tabular-nums' }}>
                    {grandTotals.totalItems}
                  </div>
                </div>
                <div style={{ width: '1px', background: '#bfdbfe', alignSelf: 'stretch' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#1d4ed8', fontWeight: 500, marginBottom: '4px' }}>
                    Total Amount
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e40af', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{grandTotals.totalAmount.toFixed(2)}
                  </div>
                </div>
                <div style={{ width: '1px', background: '#bfdbfe', alignSelf: 'stretch' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#1d4ed8', fontWeight: 500, marginBottom: '4px' }}>
                    Total Profit
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: grandTotals.totalProfit >= 0 ? '#166534' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{grandTotals.totalProfit.toFixed(2)}
                  </div>
                </div>
              </div>
            )}
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
              {isEditMode ? 'Save Changes' : 'Create Bill'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default BillCreateModal;