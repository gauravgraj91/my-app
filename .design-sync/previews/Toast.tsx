import { Toast } from 'my-app';

// Sized, transformed wrapper contains the fixed-position overlay (same
// pattern as Modal.tsx / ConfirmDialog.tsx).
export const BillPaid = () => (
  <div style={{ position: 'relative', width: 480, height: 160, transform: 'translateZ(0)', overflow: 'hidden' }}>
    <Toast>Bill marked as paid ✓</Toast>
  </div>
);
