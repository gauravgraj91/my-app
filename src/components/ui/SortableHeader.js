import React from 'react';
import { SortAsc, SortDesc } from 'lucide-react';

const HEADER_STYLE = {
  padding: '12px 16px', textAlign: 'left',
  fontSize: '12px', fontWeight: '600', color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
  cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
  transition: 'color 0.15s',
};

const SortableHeader = ({ field, label, style: headerStyle = {}, sortField, sortDirection, handleSort }) => (
  <th
    onClick={() => handleSort(field)}
    style={{ ...HEADER_STYLE, ...headerStyle }}
  >
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {label}
      {sortField === field && (
        sortDirection === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />
      )}
    </span>
  </th>
);

export default SortableHeader;
