import { Select } from 'my-app';

const vendors = [
  { value: 'sharma', label: 'Sharma Traders' },
  { value: 'gupta', label: 'Gupta & Sons' },
  { value: 'krishna', label: 'Krishna Wholesale' },
];

export const Default = () => (
  <div style={{ maxWidth: 340 }}>
    <Select label="Vendor" options={vendors} />
  </div>
);

export const ErrorState = () => (
  <div style={{ maxWidth: 340 }}>
    <Select label="Category" options={[{ value: '', label: 'Choose a category…' }]} error="Category is required" />
  </div>
);
