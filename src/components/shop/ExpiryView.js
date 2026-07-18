import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import Badge from '../ui/Badge';
import { subscribeToShopProducts } from '../../firebase/shopProductService';
import { formatDate, getDaysUntilExpiry } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

const GROUPS = [
  { key: 'expired', label: 'Expired', test: (d) => d < 0 },
  { key: 'week', label: 'This Week', test: (d) => d >= 0 && d <= 7 },
  { key: 'month', label: 'This Month', test: (d) => d > 7 && d <= 30 },
  { key: 'later', label: 'Later', test: (d) => d > 30 },
];

const groupAccent = (key) => {
  if (key === 'expired') return 'var(--danger)';
  if (key === 'week') return 'var(--warning)';
  return 'var(--muted-foreground)';
};

const daysLabel = (days) => {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  if (days === 0) return 'Today';
  return `in ${days} day${days === 1 ? '' : 's'}`;
};

const expiryBadge = (days) => {
  if (days < 0) return <Badge variant="overdue" size="small">{daysLabel(days)}</Badge>;
  if (days <= 7) return <Badge variant="danger" size="small">{daysLabel(days)}</Badge>;
  if (days <= 30) return <Badge variant="warning" size="small">{daysLabel(days)}</Badge>;
  return <Badge variant="default" size="small">{daysLabel(days)}</Badge>;
};

const ExpiryView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const unsubscribe = subscribeToShopProducts(tenantId, (items) => {
      setProducts(items || []);
      setLoading(false);
    }, { onError: () => setLoading(false) });
    return () => unsubscribe();
  }, [tenantId]);

  const grouped = useMemo(() => {
    const withExpiry = products
      .map(p => ({ ...p, _days: getDaysUntilExpiry(p.expiryDate) }))
      .filter(p => p._days !== null)
      .sort((a, b) => a._days - b._days);
    return GROUPS.map(g => ({ ...g, items: withExpiry.filter(p => g.test(p._days)) }))
      .filter(g => g.items.length > 0);
  }, [products]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted-foreground)', fontSize: 14, fontWeight: 600 }}>
        Loading…
      </div>
    );
  }

  if (grouped.length === 0) {
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', textAlign: 'center', padding: '60px 20px' }}>
        <CalendarClock size={48} style={{ margin: '0 auto 16px', color: 'var(--muted-foreground)' }} />
        <h3 style={{ fontSize: '18px', color: 'var(--foreground)', marginBottom: '8px' }}>No expiry dates tracked</h3>
        <p style={{ color: 'var(--muted-foreground)' }}>
          Add an expiry date when creating a product or bill, and it will show up here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {grouped.map(group => (
        <div key={group.key} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            background: `color-mix(in srgb, ${groupAccent(group.key)} 8%, transparent)`
          }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: groupAccent(group.key) }}>{group.label}</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted-foreground)' }}>
              {group.items.length} item{group.items.length === 1 ? '' : 's'}
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Product', 'Category', 'Vendor', 'Bill #', 'Qty', 'Expiry', ''].map((label, i) => (
                  <th key={i} style={{
                    padding: '10px 16px', textAlign: i >= 4 && i < 5 ? 'right' : 'left',
                    fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)',
                    background: 'var(--secondary)', borderBottom: '1px solid var(--border)'
                  }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--secondary)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>{item.productName}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>{item.category || '—'}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>{item.vendor || '—'}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {item.billId ? (
                      <button
                        onClick={() => navigate('/shop/bills', { state: { search: item.billNumber } })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}
                        title={`View Bill ${item.billNumber}`}
                      >
                        {item.billNumber}
                      </button>
                    ) : (
                      <span style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>&mdash;</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>{item.totalQuantity ?? '—'}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--foreground)' }}>{formatDate(item.expiryDate)}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {expiryBadge(item._days)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default ExpiryView;
