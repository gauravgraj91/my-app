import { Input } from 'my-app';
import { Search } from 'lucide-react';

export const Default = () => (
  <div style={{ maxWidth: 340 }}>
    <Input label="Vendor Name" placeholder="e.g. Sharma Traders" />
  </div>
);

export const WithIcon = () => (
  <div style={{ maxWidth: 340 }}>
    <Input label="Search Bills" icon={<Search size={18} />} placeholder="Search by bill number…" />
  </div>
);

export const ErrorState = () => (
  <div style={{ maxWidth: 340 }}>
    <Input label="Amount" defaultValue="-500" error="Amount must be greater than zero" />
  </div>
);
