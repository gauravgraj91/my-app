import { LoadingSpinner } from 'my-app';

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
    <LoadingSpinner size={16} />
    <LoadingSpinner size={24} />
    <LoadingSpinner size={40} />
  </div>
);

export const Colors = () => (
  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
    <LoadingSpinner color="var(--primary)" />
    <LoadingSpinner color="var(--success)" />
    <LoadingSpinner color="var(--danger)" />
  </div>
);
