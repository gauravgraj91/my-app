import { Toggle } from 'my-app';

export const States = () => (
  <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
    <Toggle checked={false} onChange={() => {}} />
    <Toggle checked={true} onChange={() => {}} />
  </div>
);
