import React from 'react';
import { X } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

const BillFilters = ({ filters, onFilterChange, onClear }) => (
  <Card style={{ marginBottom: '16px', padding: '16px' }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px', marginBottom: '16px'
    }}>
      <Input
        label="Vendor"
        placeholder="Filter by vendor name"
        value={filters.vendor}
        onChange={(e) => onFilterChange('vendor', e.target.value)}
      />
      <Input
        label="Start Date"
        type="date"
        value={filters.startDate}
        onChange={(e) => onFilterChange('startDate', e.target.value)}
      />
      <Input
        label="End Date"
        type="date"
        value={filters.endDate}
        onChange={(e) => onFilterChange('endDate', e.target.value)}
      />
    </div>

    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px', marginBottom: '16px'
    }}>
      <Input
        label="Min Amount"
        type="number"
        placeholder="0"
        min="0"
        step="0.01"
        value={filters.minAmount}
        onChange={(e) => onFilterChange('minAmount', e.target.value)}
      />
      <Input
        label="Max Amount"
        type="number"
        placeholder="100000"
        min="0"
        step="0.01"
        value={filters.maxAmount}
        onChange={(e) => onFilterChange('maxAmount', e.target.value)}
      />
      <Input
        label="Min Profit"
        type="number"
        placeholder="0"
        step="0.01"
        value={filters.minProfit}
        onChange={(e) => onFilterChange('minProfit', e.target.value)}
      />
      <Input
        label="Max Profit"
        type="number"
        placeholder="10000"
        step="0.01"
        value={filters.maxProfit}
        onChange={(e) => onFilterChange('maxProfit', e.target.value)}
      />
    </div>

    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px', marginBottom: '16px'
    }}>
      <Input
        label="Min Product Count"
        type="number"
        placeholder="1"
        min="0"
        step="1"
        value={filters.minProductCount}
        onChange={(e) => onFilterChange('minProductCount', e.target.value)}
      />
      <Input
        label="Max Product Count"
        type="number"
        placeholder="100"
        min="0"
        step="1"
        value={filters.maxProductCount}
        onChange={(e) => onFilterChange('maxProductCount', e.target.value)}
      />
      <div style={{ display: 'flex', alignItems: 'end' }}>
        <Button
          variant="outline"
          onClick={onClear}
          icon={<X size={16} />}
        >
          Clear All Filters
        </Button>
      </div>
    </div>

    {Object.values(filters).some(value => value !== '') && (
      <div style={{
        background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: '8px',
        padding: '12px', fontSize: '14px', color: 'var(--muted-foreground)'
      }}>
        <strong>Active Filters:</strong>{' '}
        {Object.entries(filters)
          .filter(([_, value]) => value !== '')
          .map(([key, value]) => {
            const filterLabels = {
              vendor: 'Vendor', startDate: 'Start Date', endDate: 'End Date',
              minAmount: 'Min Amount', maxAmount: 'Max Amount',
              minProfit: 'Min Profit', maxProfit: 'Max Profit',
              minProductCount: 'Min Products', maxProductCount: 'Max Products',
              status: 'Status'
            };
            return `${filterLabels[key]}: ${value}`;
          })
          .join(', ')}
      </div>
    )}
  </Card>
);

export default BillFilters;
