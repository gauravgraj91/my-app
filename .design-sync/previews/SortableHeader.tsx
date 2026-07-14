import { SortableHeader } from 'my-app';

export const TableHeader = () => (
  <table style={{ width: '100%', maxWidth: 640, borderCollapse: 'collapse' }}>
    <thead>
      <tr>
        <SortableHeader field="billNumber" label="Bill #" sortField="billNumber" sortDirection="asc" handleSort={() => {}} />
        <SortableHeader field="vendor" label="Vendor" sortField="billNumber" sortDirection="asc" handleSort={() => {}} />
        <SortableHeader field="amount" label="Amount" sortField="billNumber" sortDirection="asc" handleSort={() => {}} />
        <SortableHeader field="dueDate" label="Due Date" sortField="billNumber" sortDirection="asc" handleSort={() => {}} />
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style={{ padding: '12px 16px', fontSize: 14, borderBottom: '1px solid var(--border-subtle)' }}>INV-2041</td>
        <td style={{ padding: '12px 16px', fontSize: 14, borderBottom: '1px solid var(--border-subtle)' }}>Sharma Traders</td>
        <td style={{ padding: '12px 16px', fontSize: 14, borderBottom: '1px solid var(--border-subtle)' }}>₹12,500</td>
        <td style={{ padding: '12px 16px', fontSize: 14, borderBottom: '1px solid var(--border-subtle)' }}>18 Jul 2026</td>
      </tr>
      <tr>
        <td style={{ padding: '12px 16px', fontSize: 14 }}>INV-2040</td>
        <td style={{ padding: '12px 16px', fontSize: 14 }}>Gupta &amp; Sons</td>
        <td style={{ padding: '12px 16px', fontSize: 14 }}>₹8,240</td>
        <td style={{ padding: '12px 16px', fontSize: 14 }}>15 Jul 2026</td>
      </tr>
    </tbody>
  </table>
);

export const DescendingSort = () => (
  <table style={{ width: '100%', maxWidth: 480, borderCollapse: 'collapse' }}>
    <thead>
      <tr>
        <SortableHeader field="amount" label="Amount" sortField="amount" sortDirection="desc" handleSort={() => {}} />
        <SortableHeader field="vendor" label="Vendor" sortField="amount" sortDirection="desc" handleSort={() => {}} />
      </tr>
    </thead>
  </table>
);
