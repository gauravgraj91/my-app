import { PillTabs } from 'my-app';

export const Default = () => (
  <PillTabs items={['All', 'Paid', 'Overdue']} value="Paid" onChange={() => {}} />
);

export const Small = () => (
  <PillTabs items={['All', 'Paid', 'Overdue']} value="All" onChange={() => {}} size="sm" />
);
