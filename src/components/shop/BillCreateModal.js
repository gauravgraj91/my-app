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
  const { bills: existingBills, billProducts, handleCreateBill, handleEditBill } = useBills();
  const { vendors } = useVendors();
  const isEditMode = mode === 'edit' && bill;

  const getInitialFormData = () => ({
    billNumber: '',
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    notes: '',
    status: 'active',
    discountPercent: '',
    surchargePercent: '',
    transportCost: ''
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [products, setProducts] = useState([emptyProduct()]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const formInitialized = React.useRef(false);

  // Pre-fill form for edit mode, or generate bill number for create mode.
  // Runs once per modal open — real-time bills updates must not clobber user input.
  useEffect(() => {
    if (!isOpen) {
      formInitialized.current = false;
      return;
    }
    if (formInitialized.current) return;
    formInitialized.current = true;

    if (isEditMode) {
      const billDate = bill.date?.toDate ? bill.date.toDate() :
        bill.date instanceof Date ? bill.date : new Date(bill.date);
      const dateStr = billDate.toISOString().split('T')[0];

      setFormData({
        billNumber: bill.billNumber || '',
        date: dateStr,
        vendor: bill.vendor || '',
        notes: bill.notes || '',
        status: bill.status || 'active',
        discountPercent: bill.discountPercent ? String(bill.discountPercent) : '',
        surchargePercent: bill.surchargePercent ? String(bill.surchargePercent) : '',
        transportCost: bill.transportCost ? String(bill.transportCost) : ''
      });

      // Load existing products into the products array
      const existing = billProducts[bill.id];
      if (existing && existing.length > 0) {
        setProducts(existing.map(p => ({
          productName: p.productName || '',
          mrp: String(p.mrp || ''),
          quantity: String(p.totalQuantity || p.quantity || ''),
          totalAmount: String(p.totalAmount || '')
        })));
      } else {
        setProducts([emptyProduct()]);
      }
    } else {
      const newBillNumber = BillModel.generateBillNumber(existingBills);
      setFormData(prev => ({
        ...prev,
        billNumber: newBillNumber
      }));
    }
  }, [isOpen, isEditMode, bill, existingBills, billProducts]);

  // Calculate per-product derived values and grand totals (with extra charges)
  const { productCalcs, grandTotals, extraCharges } = React.useMemo(() => {
    // Base per-product calcs (before charges)
    const baseCalcs = products.map(p => {
      const qty = parseFloat(p.quantity) || 0;
      const amount = parseFloat(p.totalAmount) || 0;
      const mrp = parseFloat(p.mrp) || 0;
      if (qty <= 0) return { costPerUnit: 0, profitPerPiece: 0, totalProfit: 0 };
      const costPerUnit = Math.round((amount / qty + Number.EPSILON) * 100) / 100;
      const profitPerPiece = Math.round((mrp - costPerUnit + Number.EPSILON) * 100) / 100;
      const totalProfit = Math.round((profitPerPiece * qty + Number.EPSILON) * 100) / 100;
      return { costPerUnit, profitPerPiece, totalProfit };
    });

    const baseTotals = products.reduce((acc, p, i) => {
      const qty = parseFloat(p.quantity) || 0;
      const amount = parseFloat(p.totalAmount) || 0;
      return {
        totalItems: acc.totalItems + qty,
        totalAmount: acc.totalAmount + amount,
        totalProfit: acc.totalProfit + baseCalcs[i].totalProfit
      };
    }, { totalItems: 0, totalAmount: 0, totalProfit: 0 });

    // Extra charges
    const charges = BillModel.computeExtraCharges(baseTotals.totalAmount, {
      discountPercent: formData.discountPercent,
      surchargePercent: formData.surchargePercent,
      transportCost: formData.transportCost,
    });
    const netAdjustment = -charges.discountAmount + charges.surchargeAmount + charges.transportCost;
    const hasCharges = netAdjustment !== 0;

    // Effective per-product calcs (with proportional charge distribution)
    const calcs = products.map((p, i) => {
      if (!hasCharges) return baseCalcs[i];
      const qty = parseFloat(p.quantity) || 0;
      const amount = parseFloat(p.totalAmount) || 0;
      const mrp = parseFloat(p.mrp) || 0;
      if (qty <= 0 || baseTotals.totalAmount === 0) return baseCalcs[i];
      const share = netAdjustment * (amount / baseTotals.totalAmount);
      const effectiveAmount = amount + share;
      const costPerUnit = Math.round((effectiveAmount / qty + Number.EPSILON) * 100) / 100;
      const profitPerPiece = Math.round((mrp - costPerUnit + Number.EPSILON) * 100) / 100;
      const totalProfit = Math.round((profitPerPiece * qty + Number.EPSILON) * 100) / 100;
      return { costPerUnit, profitPerPiece, totalProfit };
    });

    const effectiveTotalProfit = calcs.reduce((s, c) => s + c.totalProfit, 0);

    return {
      productCalcs: calcs,
      grandTotals: { ...baseTotals, totalProfit: effectiveTotalProfit, finalAmount: charges.finalAmount },
      extraCharges: charges,
    };
  }, [products, formData.discountPercent, formData.surchargePercent, formData.transportCost]);

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
            background: 'var(--muted)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px'
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--muted-foreground)',
              marginBottom: '12px'
            }}>
              Bill Info
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <Input
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Tag size={14} /> Bill # <span style={{ color: 'var(--danger)' }}>*</span>
                      <span style={{
                        fontSize: '10px',
                        color: 'var(--muted-foreground)',
                        background: 'var(--secondary)',
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
                      <Calendar size={14} /> Date <span style={{ color: 'var(--danger)' }}>*</span>
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
                      <User size={14} /> Vendor <span style={{ color: 'var(--danger)' }}>*</span>
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
            background: 'var(--muted)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px'
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--muted-foreground)',
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
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
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
                        color: 'var(--muted-foreground)',
                        padding: '2px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-soft)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-foreground)'; e.currentTarget.style.background = 'none'; }}
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
                    background: 'var(--success-soft)',
                    border: '1px solid var(--success-soft)',
                    borderRadius: '6px'
                  }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: 'var(--success)', fontWeight: 500, marginBottom: '2px' }}>
                        Cost/Unit
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success)', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{productCalcs[index].costPerUnit.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ width: '1px', background: 'var(--success-soft)', alignSelf: 'stretch' }} />
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: 'var(--success)', fontWeight: 500, marginBottom: '2px' }}>
                        Profit/Unit
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: productCalcs[index].profitPerPiece >= 0 ? 'var(--success)' : 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{productCalcs[index].profitPerPiece.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ width: '1px', background: 'var(--success-soft)', alignSelf: 'stretch' }} />
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: 'var(--success)', fontWeight: 500, marginBottom: '2px' }}>
                        Total Profit
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: productCalcs[index].totalProfit >= 0 ? 'var(--success)' : 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
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
                border: '1px dashed var(--input)',
                borderRadius: '6px',
                color: 'var(--muted-foreground)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                width: '100%',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--muted-foreground)'; e.currentTarget.style.color = 'var(--foreground)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--input)'; e.currentTarget.style.color = 'var(--muted-foreground)'; }}
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
                background: 'var(--primary-soft)',
                border: '1px solid var(--border)',
                borderRadius: '8px'
              }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 500, marginBottom: '4px' }}>
                    Total Items
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--primary-accent)', fontVariantNumeric: 'tabular-nums' }}>
                    {grandTotals.totalItems}
                  </div>
                </div>
                <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 500, marginBottom: '4px' }}>
                    Total Amount
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--primary-accent)', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{grandTotals.totalAmount.toFixed(2)}
                  </div>
                </div>
                <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 500, marginBottom: '4px' }}>
                    Total Profit
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: grandTotals.totalProfit >= 0 ? 'var(--success)' : 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{grandTotals.totalProfit.toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Extra Charges Section ── */}
          <div style={{
            background: 'var(--muted)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px'
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--muted-foreground)',
              marginBottom: '12px'
            }}>
              Extra Charges
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <Input
                  label="Discount %"
                  type="number"
                  value={formData.discountPercent}
                  onChange={(e) => handleChange('discountPercent', e.target.value)}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={loading}
                  containerStyle={{ marginBottom: 0 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  label="Surcharge %"
                  type="number"
                  value={formData.surchargePercent}
                  onChange={(e) => handleChange('surchargePercent', e.target.value)}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={loading}
                  containerStyle={{ marginBottom: 0 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <IndianRupee size={14} /> Transport
                    </span>
                  }
                  type="number"
                  value={formData.transportCost}
                  onChange={(e) => handleChange('transportCost', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1"
                  disabled={loading}
                  containerStyle={{ marginBottom: 0 }}
                />
              </div>
            </div>

            {/* Final amount bar — only show when charges exist */}
            {(extraCharges.discountAmount > 0 || extraCharges.surchargeAmount > 0 || extraCharges.transportCost > 0) && (
              <div style={{
                display: 'flex',
                gap: '0',
                padding: '10px',
                marginTop: '12px',
                background: 'var(--warning-soft)',
                border: '1px solid var(--border)',
                borderRadius: '6px'
              }}>
                {extraCharges.discountAmount > 0 && (
                  <>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: 'var(--warning)', fontWeight: 500, marginBottom: '2px' }}>Discount</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success)' }}>-₹{extraCharges.discountAmount.toFixed(2)}</div>
                    </div>
                    <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch' }} />
                  </>
                )}
                {extraCharges.surchargeAmount > 0 && (
                  <>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: 'var(--warning)', fontWeight: 500, marginBottom: '2px' }}>Surcharge</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--danger)' }}>+₹{extraCharges.surchargeAmount.toFixed(2)}</div>
                    </div>
                    <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch' }} />
                  </>
                )}
                {extraCharges.transportCost > 0 && (
                  <>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: 'var(--warning)', fontWeight: 500, marginBottom: '2px' }}>Transport</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--danger)' }}>+₹{extraCharges.transportCost.toFixed(2)}</div>
                    </div>
                    <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch' }} />
                  </>
                )}
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: 'var(--warning)', fontWeight: 500, marginBottom: '2px' }}>Final Amount</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--warning)' }}>₹{grandTotals.finalAmount.toFixed(2)}</div>
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
                  <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', fontWeight: 400 }}>
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
              background: 'var(--danger-soft)',
              border: '1px solid var(--danger-soft)',
              borderRadius: '8px',
              color: 'var(--danger)',
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
            borderTop: '1px solid var(--border)'
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