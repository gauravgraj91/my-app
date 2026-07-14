import { StatCard, StatGrid, StatItem } from 'my-app';
import { Package } from 'lucide-react';

export const WithStats = () => (
  <div style={{ maxWidth: 380 }}>
    <StatCard title="Inventory" icon={<Package size={18} />} onViewAll={() => {}}>
      <StatGrid columns={2}>
        <StatItem value="1,284" label="Products" color="var(--primary)" />
        <StatItem value="37" label="Low Stock" color="var(--warning)" />
        <StatItem value="6" label="Categories" />
        <StatItem value="₹4.2L" label="Stock Value" color="var(--success)" />
      </StatGrid>
    </StatCard>
  </div>
);

export const Simple = () => (
  <div style={{ maxWidth: 320 }}>
    <StatCard title="This Week">
      <p style={{ margin: 0, fontSize: 14, color: 'var(--muted-foreground)' }}>
        9 bills created, 7 paid, 2 pending review.
      </p>
    </StatCard>
  </div>
);
