import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Copy,
  Download,
  Calendar,
  User,
  Package,
  IndianRupee,
  TrendingUp,
  Plus,
  MoreVertical,
  AlertTriangle
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import BillEditModal from './BillEditModal';
import { format } from 'date-fns';

// Status config for colors and labels
const STATUS_CONFIG = {
  active: { color: '#10b981', bg: '#ecfdf5', border: '#10b981', label: 'Active' },
  paid: { color: '#06b6d4', bg: '#ecfeff', border: '#06b6d4', label: 'Paid' },
  archived: { color: '#6b7280', bg: '#f3f4f6', border: '#9ca3af', label: 'Archived' },
  returned: { color: '#ef4444', bg: '#fef2f2', border: '#ef4444', label: 'Returned' },
};

const BillCard = ({
  bill,
  products = [],
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onAddProduct,
  onProductClick,
  className = '',
  style = {}
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(value || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    try {
      const dateObj = date?.toDate ? date.toDate() :
        date instanceof Date ? date :
          new Date(date);
      return format(dateObj, 'dd MMM yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getRelativeDate = (date) => {
    if (!date) return '';
    try {
      const dateObj = date?.toDate ? date.toDate() :
        date instanceof Date ? date : new Date(date);
      const now = new Date();
      const diffTime = now.setHours(0, 0, 0, 0) - new Date(dateObj).setHours(0, 0, 0, 0);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return '';
    } catch { return ''; }
  };

  const getProfitMargin = () => {
    const cost = (bill.totalAmount || 0) - (bill.totalProfit || 0);
    if (cost <= 0) return 0;
    return ((bill.totalProfit || 0) / cost * 100).toFixed(1);
  };

  const getMarginColor = (margin) => {
    if (margin <= 5) return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    if (margin <= 15) return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
    return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'paid': return 'info';
      case 'archived': return 'default';
      case 'returned': return 'danger';
      default: return 'default';
    }
  };

  const statusConfig = STATUS_CONFIG[bill.status] || STATUS_CONFIG.active;
  const profitMargin = parseFloat(getProfitMargin());
  const isPositiveProfit = (bill.totalProfit || 0) >= 0;
  const marginColors = getMarginColor(profitMargin);
  const relativeDate = getRelativeDate(bill.date);

  const handleEditSave = async (updatedBill) => {
    try {
      await onEdit(bill.id, updatedBill);
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating bill:', error);
      throw error;
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await onDelete(bill.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting bill:', error);
    }
  };

  const handleDuplicate = async () => {
    try {
      await onDuplicate(bill.id);
    } catch (error) {
      console.error('Error duplicating bill:', error);
    }
  };

  const handleExport = async () => {
    try {
      await onExport(bill.id);
    } catch (error) {
      console.error('Error exporting bill:', error);
    }
  };

  return (
    <>
      <Card
        className={`bill-card ${className}`}
        padding={0}
        style={{
          border: '1px solid #e2e8f0',
          borderLeft: `4px solid ${statusConfig.border}`,
          overflow: 'hidden',
          transition: 'box-shadow 0.2s ease, transform 0.15s ease',
          ...style
        }}
      >
        {/* Compact Bill Header — single dense block */}
        <div style={{
          padding: '14px 20px',
          background: '#fafbfc',
          borderBottom: '1px solid #f0f1f3',
        }}>
          {/* Row 1: Bill ID + badges + actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{
                margin: 0, fontSize: '15px', fontWeight: '700',
                color: '#1e293b', letterSpacing: '-0.01em'
              }}>
                {bill.billNumber}
              </h3>
              <Badge variant={getStatusVariant(bill.status)} size="small"
                style={{ fontWeight: 600, textTransform: 'capitalize', letterSpacing: '0.02em', fontSize: '10px', padding: '1px 6px' }}>
                {bill.status || 'active'}
              </Badge>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '3px',
                fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '10px',
                background: marginColors.bg, color: marginColors.color,
                border: `1px solid ${marginColors.border}`,
              }}>
                <TrendingUp size={9} />
                {profitMargin}%
              </span>

              {/* Inline stats */}
              <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px' }}>·</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b' }}>
                {formatCurrency(bill.totalAmount)}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>amt</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>·</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: isPositiveProfit ? '#16a34a' : '#dc2626' }}>
                {formatCurrency(bill.totalProfit)}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>profit</span>
            </div>

            {/* Right: Compact Actions */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {onAddProduct && (
                <button
                  onClick={() => onAddProduct(bill)}
                  aria-label="Add product"
                  title="Add product"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#10b981', border: 'none', borderRadius: '6px',
                    width: '28px', height: '28px', cursor: 'pointer', color: 'white',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#059669'}
                  onMouseLeave={e => e.currentTarget.style.background = '#10b981'}
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              )}
              <button
                onClick={() => setShowEditModal(true)}
                aria-label="Edit bill"
                title="Edit bill"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px',
                  width: '28px', height: '28px', cursor: 'pointer', color: '#64748b',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
              >
                <Edit size={13} />
              </button>

              {/* More actions dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowActions(!showActions)}
                  aria-label="More actions"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px',
                    width: '28px', height: '28px', cursor: 'pointer', color: '#64748b',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
                >
                  <MoreVertical size={13} />
                </button>
                {showActions && (
                  <>
                    <div
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}
                      onClick={() => setShowActions(false)}
                    />
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                      background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 51,
                      minWidth: '150px', overflow: 'hidden',
                    }}>
                      <button
                        onClick={() => { handleDuplicate(); setShowActions(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', color: '#374151', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.target.style.background = '#f8fafc'}
                        onMouseLeave={e => e.target.style.background = 'none'}
                      >
                        <Copy size={14} /> Duplicate
                      </button>
                      <button
                        onClick={() => { handleExport(); setShowActions(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', color: '#374151', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.target.style.background = '#f8fafc'}
                        onMouseLeave={e => e.target.style.background = 'none'}
                      >
                        <Download size={14} /> Export CSV
                      </button>
                      <div style={{ height: '1px', background: '#f1f5f9' }} />
                      <button
                        onClick={() => { setShowDeleteConfirm(true); setShowActions(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', color: '#ef4444', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.target.style.background = '#fef2f2'}
                        onMouseLeave={e => e.target.style.background = 'none'}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Meta info — date, vendor, items */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', color: '#64748b', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={12} strokeWidth={2} />
              <span>{formatDate(bill.date)}</span>
              {relativeDate && (
                <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: '600', marginLeft: '2px' }}>
                  {relativeDate}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <User size={12} strokeWidth={2} />
              <span style={{ fontWeight: '500', color: '#475569' }}>{bill.vendor || 'Unknown Vendor'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Package size={12} strokeWidth={2} />
              <span>{bill.productCount || products.length || 0} items</span>
            </div>
          </div>
        </div>

        {/* Compact body: notes + expand toggle */}
        <div style={{ padding: '8px 20px 10px' }}>
          {/* Notes */}
          {bill.notes && (
            <div style={{
              padding: '6px 10px', background: '#fefce8', borderRadius: '6px',
              border: '1px solid #fef08a', fontSize: '12px', marginBottom: '8px',
            }}>
              <span style={{ fontWeight: '600', color: '#a16207', marginRight: '4px' }}>Note:</span>
              <span style={{ color: '#92400e' }}>{bill.notes}</span>
            </div>
          )}

          {/* Expand/Collapse Products */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              gap: '5px', margin: '0 auto', padding: '4px 14px',
              background: isExpanded ? '#f1f5f9' : 'transparent',
              border: '1px solid #e2e8f0', borderRadius: '16px', cursor: 'pointer',
              fontSize: '11px', fontWeight: '600',
              color: isExpanded ? '#475569' : '#94a3b8',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isExpanded ? '#f1f5f9' : 'transparent'; e.currentTarget.style.color = isExpanded ? '#475569' : '#94a3b8'; }}
          >
            {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {isExpanded ? 'Hide' : `Products (${products.length})`}
          </button>
        </div>

        {/* Expandable Product List */}
        {isExpanded && (
          <div style={{
            borderTop: '1px solid #f1f5f9',
          }}>
            {products.length > 0 ? (
              <div>
                {/* Product list header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: '12px',
                  padding: '10px 20px',
                  background: '#f8fafc',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  <span>Product</span>
                  <span>Qty & MRP</span>
                  <span style={{ textAlign: 'right' }}>Amount</span>
                </div>

                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {products.map((product, index) => (
                    <div
                      key={product.id || index}
                      style={{
                        padding: '12px 20px',
                        borderBottom: index < products.length - 1 ? '1px solid #f8fafc' : 'none',
                        cursor: onProductClick ? 'pointer' : 'default',
                        transition: 'background 0.15s',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto',
                        gap: '12px',
                        alignItems: 'center',
                      }}
                      onClick={() => onProductClick && onProductClick(product)}
                      onMouseEnter={(e) => {
                        if (onProductClick) e.currentTarget.style.background = '#fafbfc';
                      }}
                      onMouseLeave={(e) => {
                        if (onProductClick) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* Product name & category */}
                      <div>
                        <div style={{
                          fontSize: '13px', fontWeight: '600',
                          color: product.productName ? '#1e293b' : '#d97706',
                          marginBottom: '2px',
                          display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                          {!product.productName && <AlertTriangle size={12} color="#d97706" />}
                          {product.productName || 'Unnamed Product'}
                        </div>
                        {product.category && (
                          <span style={{
                            fontSize: '11px', color: '#94a3b8',
                            background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px',
                          }}>
                            {product.category}
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        fontSize: '12px',
                        color: '#64748b',
                      }}>
                        <span>Qty: <strong style={{ color: '#334155' }}>{product.totalQuantity || product.quantity || 0}</strong></span>
                        <span>MRP: <strong style={{ color: '#334155' }}>{formatCurrency(product.mrp || product.pricePerPiece)}</strong></span>
                      </div>

                      {/* Amount & profit */}
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            color: '#1e293b'
                          }}>
                            {formatCurrency(product.totalAmount)}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: (product.profitPerPiece || 0) >= 0 ? '#16a34a' : '#dc2626'
                          }}>
                            {(product.profitPerPiece || 0) >= 0 ? '+' : ''}{formatCurrency((product.profitPerPiece || 0) * (product.totalQuantity || product.quantity || 0))}
                          </div>
                        </div>
                        {onProductClick && (
                          <Edit size={12} color="#cbd5e1" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                padding: '32px 24px',
                textAlign: 'center',
                color: '#94a3b8'
              }}>
                <Package size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <div style={{ fontSize: '13px' }}>No products in this bill</div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      {showEditModal && (
        <BillEditModal
          isOpen={showEditModal}
          bill={bill}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditSave}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Bill"
        maxWidth={400}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Trash2 size={24} color="#ef4444" />
          </div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '17px',
            fontWeight: '700',
            color: '#1e293b'
          }}>
            Delete {bill.billNumber}?
          </h3>
          <p style={{
            margin: '0 0 24px 0',
            color: '#64748b',
            lineHeight: '1.6',
            fontSize: '14px'
          }}>
            This will permanently delete the bill and all its associated products.
            This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
              style={{ borderRadius: '8px' }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              style={{ borderRadius: '8px' }}
            >
              Delete Bill
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BillCard;
