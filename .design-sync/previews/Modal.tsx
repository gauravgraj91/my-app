import { Modal, Input, Select, Button } from 'my-app';

// The sized, transformed wrapper contains the fixed-position overlay so the
// open modal renders inside the card instead of escaping the viewport.
export const CreateBill = () => (
  <div style={{ position: 'relative', width: 700, height: 620, transform: 'translateZ(0)', overflow: 'hidden', borderRadius: 12 }}>
    <Modal isOpen onClose={() => {}} title="Add New Bill" maxWidth={480}>
      <Input label="Bill Number" placeholder="INV-2041" defaultValue="INV-2041" />
      <Select
        label="Vendor"
        options={[
          { value: 'sharma', label: 'Sharma Traders' },
          { value: 'gupta', label: 'Gupta & Sons' },
          { value: 'krishna', label: 'Krishna Wholesale' },
        ]}
      />
      <Input label="Amount" type="number" defaultValue="12500" />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <Button variant="secondary">Cancel</Button>
        <Button variant="primary">Save Bill</Button>
      </div>
    </Modal>
  </div>
);
