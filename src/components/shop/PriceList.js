import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, X, Package, Tag, IndianRupee, TrendingUp,
  SortAsc, SortDesc, ShoppingBag, Calendar, Users
} from 'lucide-react';
import { subscribeToShopProducts } from '../../firebase/shopProductService';
import { formatCurrency, formatDate } from '../../utils/formatters';

// --- Styles ---
const STYLES = {
  headerCell: {
    padding: '12px 16px', textAlign: 'left',
    fontSize: '12px', fontWeight: '600', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
    cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
    transition: 'color 0.15s',
  },
  tableCell: { padding: '12px 16px' },
};

const SortableHeader = ({ field, label, style: headerStyle = {}, sortField, sortDirection, handleSort }) => (
  <th
    onClick={() => handleSort(field)}
    style={{ ...STYLES.headerCell, ...headerStyle }}
  >
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {label}
      {sortField === field && (
        sortDirection === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />
      )}
    </span>
  </th>
);

const SummaryCard = ({ label, value, subtitle, icon: Icon, color, bgColor }) => (
  <div style={{
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
    padding: '20px', position: 'relative', overflow: 'hidden',
  }}>
    <div style={{
      position: 'absolute', top: '16px', right: '16px',
      width: '40px', height: '40px', borderRadius: '10px',
      background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={20} color={color} />
    </div>
    <div style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '8px' }}>
      {label}
    </div>
    <div style={{ fontSize: '24px', fontWeight: '800', color: color, marginBottom: '4px' }}>
      {value}
    </div>
    <div style={{ fontSize: '13px', color: '#94a3b8' }}>{subtitle}</div>
  </div>
);

const PriceList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortField, setSortField] = useState('productName');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    const unsubscribe = subscribeToShopProducts((items) => {
      setProducts(items || []);
      setLoading(false);
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  // Group products by name (case-insensitive) and pick latest entry
  const priceListData = useMemo(() => {
    const grouped = {};

    products.forEach(p => {
      if (!p.productName) return;
      const key = p.productName.trim().toLowerCase();

      // Parse date for comparison
      const entryDate = p.date ? new Date(p.date) : (p.createdAt?.toDate ? p.createdAt.toDate() : new Date(0));

      if (!grouped[key]) {
        grouped[key] = {
          productName: p.productName.trim(),
          latestEntry: p,
          latestDate: entryDate,
          entries: [p],
        };
      } else {
        grouped[key].entries.push(p);
        if (entryDate > grouped[key].latestDate) {
          grouped[key].latestEntry = p;
          grouped[key].latestDate = entryDate;
        }
      }
    });

    return Object.values(grouped).map(g => ({
      id: g.latestEntry.id,
      productName: g.productName,
      category: g.latestEntry.category || '-',
      mrp: g.latestEntry.mrp || 0,
      pricePerPiece: g.latestEntry.pricePerPiece || 0,
      profitPerPiece: g.latestEntry.profitPerPiece || 0,
      vendor: g.latestEntry.vendor || '-',
      lastPurchased: g.latestDate,
      timesPurchased: g.entries.length,
      totalQty: g.entries.reduce((s, e) => s + (e.totalQuantity || 0), 0),
    }));
  }, [products]);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set();
    priceListData.forEach(p => { if (p.category && p.category !== '-') cats.add(p.category); });
    return [...cats].sort();
  }, [priceListData]);

  // Filter
  const filteredData = useMemo(() => {
    let result = priceListData;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.productName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.vendor.toLowerCase().includes(q)
      );
    }

    if (filterCategory) {
      result = result.filter(p => p.category === filterCategory);
    }

    return result;
  }, [priceListData, search, filterCategory]);

  // Sort
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortField, sortDirection]);

  // Summary stats
  const stats = useMemo(() => {
    const total = priceListData.length;
    const avgMrp = total > 0 ? priceListData.reduce((s, p) => s + p.mrp, 0) / total : 0;
    const avgPrice = total > 0 ? priceListData.reduce((s, p) => s + p.pricePerPiece, 0) / total : 0;
    const avgProfit = total > 0 ? priceListData.reduce((s, p) => s + p.profitPerPiece, 0) / total : 0;
    return { total, avgMrp, avgPrice, avgProfit };
  }, [priceListData]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Package size={48} style={{ margin: '0 auto 16px', color: '#94a3b8' }} />
        <div style={{ fontSize: '16px', color: '#64748b' }}>Loading price list...</div>
      </div>
    );
  }

  return (
    <div>
      {/* ===== SUMMARY CARDS ===== */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px', marginBottom: '24px',
      }}>
        <SummaryCard
          label="Unique Products" value={stats.total}
          subtitle={`From ${products.length} total entries`}
          icon={Package} color="#0f172a" bgColor="#f1f5f9"
        />
        <SummaryCard
          label="Avg MRP" value={formatCurrency(stats.avgMrp)}
          subtitle="Across all products"
          icon={Tag} color="#7c3aed" bgColor="#f5f3ff"
        />
        <SummaryCard
          label="Avg Purchase Price" value={formatCurrency(stats.avgPrice)}
          subtitle="Latest price per piece"
          icon={IndianRupee} color="#10b981" bgColor="#ecfdf5"
        />
        <SummaryCard
          label="Avg Profit/Pc" value={formatCurrency(stats.avgProfit)}
          subtitle="Per unit margin"
          icon={TrendingUp} color="#f59e0b" bgColor="#fff7ed"
        />
      </div>

      {/* ===== SEARCH + CATEGORY FILTERS ===== */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '16px', flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '0 0 280px' }}>
          <Search size={16} style={{
            position: 'absolute', left: '12px', top: '50%',
            transform: 'translateY(-50%)', color: '#94a3b8',
          }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search product, category, vendor..."
            style={{
              width: '100%', padding: '10px 36px 10px 36px',
              border: '1px solid #e2e8f0', borderRadius: '10px',
              fontSize: '14px', outline: 'none', background: '#fff',
              transition: 'border-color 0.15s',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: '10px', top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer', color: '#94a3b8',
                display: 'flex', alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterCategory('')}
            style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
              fontWeight: '600', border: '1px solid',
              cursor: 'pointer', transition: 'all 0.15s',
              background: !filterCategory ? '#0f172a' : '#fff',
              color: !filterCategory ? '#fff' : '#64748b',
              borderColor: !filterCategory ? '#0f172a' : '#e2e8f0',
            }}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat === filterCategory ? '' : cat)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
                fontWeight: '600', border: '1px solid',
                cursor: 'pointer', transition: 'all 0.15s',
                background: filterCategory === cat ? '#0f172a' : '#fff',
                color: filterCategory === cat ? '#fff' : '#64748b',
                borderColor: filterCategory === cat ? '#0f172a' : '#e2e8f0',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ===== TABLE ===== */}
      {sortedData.length > 0 ? (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <SortableHeader field="productName" label="Product" sortField={sortField} sortDirection={sortDirection} handleSort={handleSort} />
                  <SortableHeader field="category" label="Category" sortField={sortField} sortDirection={sortDirection} handleSort={handleSort} />
                  <SortableHeader field="mrp" label="Latest MRP" sortField={sortField} sortDirection={sortDirection} handleSort={handleSort} style={{ textAlign: 'right' }} />
                  <SortableHeader field="pricePerPiece" label="Price/Pc" sortField={sortField} sortDirection={sortDirection} handleSort={handleSort} style={{ textAlign: 'right' }} />
                  <SortableHeader field="profitPerPiece" label="Profit/Pc" sortField={sortField} sortDirection={sortDirection} handleSort={handleSort} style={{ textAlign: 'right' }} />
                  <SortableHeader field="vendor" label="Last Vendor" sortField={sortField} sortDirection={sortDirection} handleSort={handleSort} />
                  <SortableHeader field="lastPurchased" label="Last Purchased" sortField={sortField} sortDirection={sortDirection} handleSort={handleSort} />
                  <SortableHeader field="timesPurchased" label="Times Bought" sortField={sortField} sortDirection={sortDirection} handleSort={handleSort} style={{ textAlign: 'right' }} />
                  <SortableHeader field="totalQty" label="Total Qty" sortField={sortField} sortDirection={sortDirection} handleSort={handleSort} style={{ textAlign: 'right' }} />
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row, idx) => (
                  <tr key={row.id} style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: idx % 2 === 0 ? '#fff' : '#fafbfc',
                    transition: 'background 0.15s',
                  }}>
                    <td style={{ ...STYLES.tableCell, fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>
                      {row.productName}
                    </td>
                    <td style={STYLES.tableCell}>
                      <span style={{
                        fontSize: '12px', fontWeight: '600', color: '#475569',
                        background: '#f1f5f9', padding: '3px 10px', borderRadius: '10px',
                      }}>
                        {row.category}
                      </span>
                    </td>
                    <td style={{ ...STYLES.tableCell, textAlign: 'right', fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>
                      {formatCurrency(row.mrp)}
                    </td>
                    <td style={{ ...STYLES.tableCell, textAlign: 'right', fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>
                      {formatCurrency(row.pricePerPiece)}
                    </td>
                    <td style={{ ...STYLES.tableCell, textAlign: 'right', fontWeight: '700', fontSize: '14px' }}>
                      <span style={{ color: row.profitPerPiece > 0 ? '#10b981' : row.profitPerPiece < 0 ? '#ef4444' : '#94a3b8' }}>
                        {formatCurrency(row.profitPerPiece)}
                      </span>
                    </td>
                    <td style={{ ...STYLES.tableCell, fontSize: '13px', color: '#475569' }}>
                      {row.vendor}
                    </td>
                    <td style={{ ...STYLES.tableCell, fontSize: '13px', color: '#94a3b8' }}>
                      {row.lastPurchased && row.lastPurchased.getTime() > 0 ? formatDate(row.lastPurchased) : '-'}
                    </td>
                    <td style={{ ...STYLES.tableCell, textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                      {row.timesPurchased}
                    </td>
                    <td style={{ ...STYLES.tableCell, textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                      {row.totalQty}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                      {sortedData.length} product{sortedData.length !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }} />
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                      {formatCurrency(sortedData.reduce((s, r) => s + r.mrp, 0) / (sortedData.length || 1))}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                      {formatCurrency(sortedData.reduce((s, r) => s + r.pricePerPiece, 0) / (sortedData.length || 1))}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>
                      {formatCurrency(sortedData.reduce((s, r) => s + r.profitPerPiece, 0) / (sortedData.length || 1))}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }} colSpan={2} />
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>
                      {sortedData.reduce((s, r) => s + r.timesPurchased, 0)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>
                      {sortedData.reduce((s, r) => s + r.totalQty, 0)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
          textAlign: 'center', padding: '60px 20px',
        }}>
          <Package size={48} style={{ margin: '0 auto 16px', color: '#9ca3af' }} />
          <h3 style={{ fontSize: '18px', color: '#374151', marginBottom: '8px' }}>
            No products found
          </h3>
          <p style={{ color: '#6b7280' }}>
            {search || filterCategory
              ? 'Try adjusting your search or filters'
              : 'Products from bills will appear here automatically'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default PriceList;
