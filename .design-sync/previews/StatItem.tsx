import { StatItem } from 'my-app';

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 40 }}>
    <StatItem size="small" value="128" label="Small" />
    <StatItem size="medium" value="128" label="Medium" />
    <StatItem size="large" value="128" label="Large" />
  </div>
);

export const Colors = () => (
  <div style={{ display: 'flex', gap: 40 }}>
    <StatItem value="₹45,230" label="Outstanding" color="var(--danger)" size="large" />
    <StatItem value="₹1,28,400" label="Collected" color="var(--success)" size="large" />
    <StatItem value="24" label="Vendors" color="var(--primary)" size="large" />
  </div>
);
