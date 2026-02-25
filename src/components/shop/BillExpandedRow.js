import React from 'react';
import { Package, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const STYLES = {
  subHeaderCell: {
    padding: '10px 16px', textAlign: 'left',
    fontSize: '11px', fontWeight: '600', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0',
  },
  subTableCell: { padding: '10px 16px' },
};

const BillExpandedRow = ({ bill, products }) => (
  <tr>
    <td colSpan={10} style={{ padding: 0 }}>
      <div style={{
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        padding: '0',
      }}>
        {products.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0' }}>
            <thead>
              <tr>
                <th style={{ ...STYLES.subHeaderCell, padding: '10px 20px 10px 60px' }}>
                  Product
                </th>
                <th style={STYLES.subHeaderCell}>
                  Category
                </th>
                <th style={{ ...STYLES.subHeaderCell, textAlign: 'right' }}>
                  Qty
                </th>
                <th style={{ ...STYLES.subHeaderCell, textAlign: 'right' }}>
                  MRP
                </th>
                <th style={{ ...STYLES.subHeaderCell, padding: '10px 20px 10px 16px', textAlign: 'right' }}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, pIdx) => (
                <tr
                  key={product.id || pIdx}
                  style={{
                    borderBottom: pIdx < products.length - 1 ? '1px solid #eef0f2' : 'none',
                    transition: 'background 0.1s',
                  }}
                >
                  <td style={{ ...STYLES.subTableCell, padding: '10px 20px 10px 60px' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: '600',
                      color: product.productName ? '#1e293b' : '#d97706',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}>
                      {!product.productName && <AlertTriangle size={12} color="#d97706" />}
                      {product.productName || 'Unnamed Product'}
                    </span>
                  </td>
                  <td style={STYLES.subTableCell}>
                    <span style={{
                      fontSize: '12px', color: '#94a3b8',
                      background: '#eef0f2', padding: '1px 6px', borderRadius: '4px',
                    }}>
                      {product.category || '-'}
                    </span>
                  </td>
                  <td style={{ ...STYLES.subTableCell, textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      {product.totalQuantity || product.quantity || 0}
                    </span>
                  </td>
                  <td style={{ ...STYLES.subTableCell, textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      {formatCurrency(product.mrp || product.pricePerPiece)}
                    </span>
                  </td>
                  <td style={{ ...STYLES.subTableCell, padding: '10px 20px 10px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                      {formatCurrency(product.totalAmount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{
            padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px',
          }}>
            <Package size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            <div>No products in this bill</div>
          </div>
        )}
        {(bill.discountAmount > 0 || bill.surchargeAmount > 0 || bill.transportCost > 0) && (
          <div style={{
            display: 'flex', gap: '16px', padding: '10px 20px 10px 60px',
            background: '#fffbeb', borderTop: '1px solid #fde68a',
            fontSize: '12px', color: '#92400e', flexWrap: 'wrap',
          }}>
            {bill.discountAmount > 0 && (
              <span>Discount ({bill.discountPercent}%): <strong style={{ color: '#166534' }}>-{formatCurrency(bill.discountAmount)}</strong></span>
            )}
            {bill.surchargeAmount > 0 && (
              <span>Surcharge ({bill.surchargePercent}%): <strong style={{ color: '#dc2626' }}>+{formatCurrency(bill.surchargeAmount)}</strong></span>
            )}
            {bill.transportCost > 0 && (
              <span>Transport: <strong style={{ color: '#dc2626' }}>+{formatCurrency(bill.transportCost)}</strong></span>
            )}
            <span style={{ marginLeft: 'auto', fontWeight: '700' }}>Final: {formatCurrency(bill.finalAmount)}</span>
          </div>
        )}
      </div>
    </td>
  </tr>
);

export default BillExpandedRow;
