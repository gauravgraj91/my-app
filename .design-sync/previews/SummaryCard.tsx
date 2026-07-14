import { SummaryCard } from 'my-app';
import { IndianRupee, Package, TrendingUp, Users } from 'lucide-react';

export const DashboardRow = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
    <SummaryCard
      label="Total Outstanding"
      amount={45230}
      subtitle="12 unpaid bills"
      icon={IndianRupee}
      color="var(--danger)"
      bgColor="var(--danger-soft)"
    />
    <SummaryCard
      label="Paid This Month"
      amount={128400}
      subtitle="38 bills settled"
      icon={TrendingUp}
      color="var(--success)"
      bgColor="var(--success-soft)"
    />
    <SummaryCard
      label="Active Vendors"
      value="24"
      subtitle="3 added this month"
      icon={Users}
      color="var(--primary)"
      bgColor="var(--primary-soft)"
    />
  </div>
);

export const SingleCard = () => (
  <div style={{ maxWidth: 280 }}>
    <SummaryCard
      label="Products In Stock"
      value="1,284"
      subtitle="Across 6 categories"
      icon={Package}
      color="var(--primary)"
      bgColor="var(--primary-soft)"
    />
  </div>
);
