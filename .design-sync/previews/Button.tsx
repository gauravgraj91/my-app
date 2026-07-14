import { Button } from 'my-app';
import { Plus, Trash2 } from 'lucide-react';

export const Variants = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
    <Button variant="primary">Save Bill</Button>
    <Button variant="secondary">Cancel</Button>
    <Button variant="success">Mark Paid</Button>
    <Button variant="danger">Delete</Button>
    <Button variant="outline">View Details</Button>
  </div>
);

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Button size="small">Small</Button>
    <Button size="medium">Medium</Button>
    <Button size="large">Large</Button>
  </div>
);

export const WithIcon = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Button icon={<Plus size={16} />}>Add Vendor</Button>
    <Button variant="danger" icon={<Trash2 size={16} />}>Delete Bill</Button>
  </div>
);

export const Loading = () => <Button loading>Saving…</Button>;
