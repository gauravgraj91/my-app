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
  DollarSign,
  IndianRupee,
  TrendingUp
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import BillEditModal from './BillEditModal';
import { format } from 'date-fns';

const BillCard = ({
  bill,
  products = [],
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onProductClick,
  className = '',
  style = {}
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Format currency helper
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(value || 0);
  };

  // Format date helper
  const formatDate = (date) => {
    if (!date) return 'No date';
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return format(dateObj, 'dd MMM yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  // Calculate profit margin
  const getProfitMargin = () => {
    if (!bill.totalAmount || bill.totalAmount === 0) return 0;
    return ((bill.totalProfit || 0) / bill.totalAmount * 100).toFixed(1);
  };

  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'archived': return 'default';
      case 'returned': return 'danger';
      default: return 'default';
    }
  };

  // Handle edit save
  const handleEditSave = async (updatedBill) => {
    try {
      await onEdit(bill.id, updatedBill);
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating bill:', error);
      throw error;
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    try {
      await onDelete(bill.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting bill:', error);
    }
  };

  // Handle duplicate
  const handleDuplicate = async () => {
    try {
      await onDuplicate(bill.id);
    } catch (error) {
      console.error('Error duplicating bill:', error);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      await onExport(bill.id);
    } catch (error) {
      console.error('Error exporting bill:', error);
    }
  };

  return (
    <>
      <Card className={`bill-card ${className}`} padding={0} style={style}>
        {/* Bill Header */}
        <div className="bill-header" style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {/* Bill Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  {bill.billNumber}
                </h3>
                <Badge
                  variant={getStatusVariant(bill.status)}
                  size="small"
                >
                  {bill.status || 'active'}
                </Badge>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: '#6b7280', fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} />
                  <span>{formatDate(bill.date)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={14} />
                  <span>{bill.vendor || 'Unknown Vendor'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Package size={14} />
                  <span>{bill.productCount || 0} items</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <Button
                variant="outline"
                size="small"
                icon={<Edit size={14} />}
                onClick={() => setShowEditModal(true)}
                aria-label="Edit bill"
              />
              <Button
                variant="outline"
                size="small"
                icon={<Copy size={14} />}
                onClick={handleDuplicate}
                aria-label="Duplicate bill"
              />
              <Button
                variant="outline"
                size="small"
                icon={<Download size={14} />}
                onClick={handleExport}
                aria-label="Export bill"
              />
              <Button
                variant="danger"
                size="small"
                icon={<Trash2 size={14} />}
                onClick={() => setShowDeleteConfirm(true)}
                aria-label="Delete bill"
              />
            </div>
          </div>
        </div>

        {/* Bill Summary */}
        <div className="bill-summary" style={{ padding: '20px 24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div className="summary-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <IndianRupee size={16} color="#10b981" />
                <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                  Total Amount
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                {formatCurrency(bill.totalAmount)}
              </div>
            </div>

            <div className="summary-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Package size={16} color="#3b82f6" />
                <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                  Quantity
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                {bill.totalQuantity || 0}
              </div>
            </div>

            <div className="summary-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <TrendingUp size={16} color="#f59e0b" />
                <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                  Profit
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                {formatCurrency(bill.totalProfit)}
              </div>
            </div>

            <div className="summary-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <TrendingUp size={16} color="#8b5cf6" />
                <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                  Margin
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                {getProfitMargin()}%
              </div>
            </div>
          </div>

          {/* Notes */}
          {bill.notes && (
            <div style={{
              padding: '12px',
              background: '#f9fafb',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Notes:</div>
              <div style={{ fontSize: '14px', color: '#374151' }}>{bill.notes}</div>
            </div>
          )}

          {/* Expand/Collapse Button */}
          <Button
            variant="outline"
            size="small"
            icon={isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ width: '100%' }}
          >
            {isExpanded ? 'Hide Products' : `Show Products (${products.length})`}
          </Button>
        </div>

        {/* Expandable Product List */}
        {isExpanded && (
          <div className="bill-products" style={{
            borderTop: '1px solid #e5e7eb',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {products.length > 0 ? (
              <div>
                {products.map((product, index) => (
                  <div
                    key={product.id || index}
                    className="product-item"
                    style={{
                      padding: '12px 24px',
                      borderBottom: index < products.length - 1 ? '1px solid #f3f4f6' : 'none',
                      cursor: onProductClick ? 'pointer' : 'default',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => onProductClick && onProductClick(product)}
                    onMouseEnter={(e) => {
                      if (onProductClick) {
                        e.target.style.backgroundColor = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (onProductClick) {
                        e.target.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#1f2937',
                          marginBottom: '4px'
                        }}>
                          {product.productName || 'Unnamed Product'}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          display: 'flex',
                          gap: '12px'
                        }}>
                          <span>Qty: {product.totalQuantity || 0}</span>
                          <span>Price: {formatCurrency(product.pricePerPiece)}</span>
                          {product.category && <span>Category: {product.category}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1f2937'
                        }}>
                          {formatCurrency(product.totalAmount)}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: product.profitPerPiece >= 0 ? '#10b981' : '#ef4444'
                        }}>
                          Profit: {formatCurrency((product.profitPerPiece || 0) * (product.totalQuantity || 0))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '40px 24px',
                textAlign: 'center',
                color: '#6b7280'
              }}>
                <Package size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div>No products in this bill</div>
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
            fontSize: '48px',
            marginBottom: '16px',
            color: '#ef4444'
          }}>
            ⚠️
          </div>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Delete Bill {bill.billNumber}?
          </h3>
          <p style={{
            margin: '0 0 24px 0',
            color: '#6b7280',
            lineHeight: '1.5'
          }}>
            This will permanently delete the bill and all its associated products.
            This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
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