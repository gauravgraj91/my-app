import { Avatar } from 'my-app';

export const Variants = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Avatar name="Sharma Traders" />
    <Avatar name="Gupta & Sons" alert />
    <Avatar name="Krishna Wholesale" round />
  </div>
);
