import React from 'react';
import { Package, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const STYLES = {
  subHeaderCell: {
    padding: '10px 16px', textAlign: 'left',
    fontSize: '11px', fontWeight: '600', color: 'var(--muted-foreground)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border)',
  },
  subTableCell: { padding: '10px 16px' },
};

const BillExpandedRow = ({ bill, products }) => (
  <tr>
    <td colSpan={10} style={{ padding: 0 }}>
      <div style={{
        background: 'var(--secondary)',
        borderBottom: '1px solid var(--border)',
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
                    borderBottom: pIdx < products.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.1s',
                  }}
                >
                  <td style={{ ...STYLES.subTableCell, padding: '10px 20px 10px 60px' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: '600',
                      color: product.productName ? 'var(--foreground)' : 'var(--warning)',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}>
                      {!product.productName && <AlertTriangle size={12} color="var(--warning)" />}
                      {product.productName || 'Unnamed Product'}
                    </span>
                  </td>
                  <td style={STYLES.subTableCell}>
                    <span style={{
                      fontSize: '12px', color: 'var(--muted-foreground)',
                      background: 'var(--border)', padding: '1px 6px', borderRadius: '4px',
                    }}>
                      {product.category || '-'}
                    </span>
                  </td>
                  <td style={{ ...STYLES.subTableCell, textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--foreground)' }}>
                      {product.totalQuantity || product.quantity || 0}
                    </span>
                  </td>
                  <td style={{ ...STYLES.subTableCell, textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
                      {formatCurrency(product.mrp || product.pricePerPiece)}
                    </span>
                  </td>
                  <td style={{ ...STYLES.subTableCell, padding: '10px 20px 10px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--foreground)' }}>
                      {formatCurrency(product.totalAmount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{
            padding: '24px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '13px',
          }}>
            <Package size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            <div>No products in this bill</div>
          </div>
        )}
        {(bill.discountAmount > 0 || bill.surchargeAmount > 0 || bill.transportCost > 0) && (
          <div style={{
            display: 'flex', gap: '16px', padding: '10px 20px 10px 60px',
            background: 'var(--warning-soft)', borderTop: '1px solid var(--border)',
            fontSize: '12px', color: 'var(--warning)', flexWrap: 'wrap',
          }}>
            {bill.discountAmount > 0 && (
              <span>Discount ({bill.discountPercent}%): <strong style={{ color: 'var(--success)' }}>-{formatCurrency(bill.discountAmount)}</strong></span>
            )}
            {bill.surchargeAmount > 0 && (
              <span>Surcharge ({bill.surchargePercent}%): <strong style={{ color: 'var(--danger)' }}>+{formatCurrency(bill.surchargeAmount)}</strong></span>
            )}
            {bill.transportCost > 0 && (
              <span>Transport: <strong style={{ color: 'var(--danger)' }}>+{formatCurrency(bill.transportCost)}</strong></span>
            )}
            <span style={{ marginLeft: 'auto', fontWeight: '700' }}>Final: {formatCurrency(bill.finalAmount)}</span>
          </div>
        )}
      </div>
    </td>
  </tr>
);

export default BillExpandedRow;
