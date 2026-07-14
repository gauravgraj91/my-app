import { StatGrid, StatItem } from 'my-app';

export const TwoColumns = () => (
  <div style={{ maxWidth: 320 }}>
    <StatGrid columns={2}>
      <StatItem value="52" label="Total Bills" color="var(--primary)" />
      <StatItem value="12" label="Unpaid" color="var(--danger)" />
      <StatItem value="38" label="Paid" color="var(--success)" />
      <StatItem value="2" label="Disputed" color="var(--warning)" />
    </StatGrid>
  </div>
);

export const FourColumns = () => (
  <div style={{ maxWidth: 560 }}>
    <StatGrid columns={4} gap={24}>
      <StatItem value="52" label="Total" />
      <StatItem value="12" label="Unpaid" color="var(--danger)" />
      <StatItem value="38" label="Paid" color="var(--success)" />
      <StatItem value="2" label="Disputed" color="var(--warning)" />
    </StatGrid>
  </div>
);
