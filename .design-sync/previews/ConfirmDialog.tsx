import { ConfirmDialog } from 'my-app';

// Sized, transformed wrapper contains the fixed-position overlay (same
// pattern as Modal.tsx).
export const DeleteBill = () => (
  <div style={{ position: 'relative', width: 600, height: 360, transform: 'translateZ(0)', overflow: 'hidden', borderRadius: 12 }}>
    <ConfirmDialog
      isOpen
      title="Delete Bill INV-2041?"
      message="This will permanently remove the bill and its payment history. This action cannot be undone."
      confirmLabel="Delete"
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  </div>
);
