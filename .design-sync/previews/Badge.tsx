import { Badge } from 'my-app';
import { CheckCircle } from 'lucide-react';

export const Variants = () => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
    <Badge variant="default">Draft</Badge>
    <Badge variant="primary">New</Badge>
    <Badge variant="success">Paid</Badge>
    <Badge variant="warning">Due Soon</Badge>
    <Badge variant="danger">Overdue</Badge>
    <Badge variant="info">Partial</Badge>
  </div>
);

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
    <Badge size="small" variant="primary">Small</Badge>
    <Badge size="medium" variant="primary">Medium</Badge>
    <Badge size="large" variant="primary">Large</Badge>
  </div>
);

export const WithIcon = () => (
  <Badge variant="success" icon={<CheckCircle size={12} />}>Verified Vendor</Badge>
);
