import { Textarea } from 'my-app';

export const Default = () => (
  <div style={{ maxWidth: 400 }}>
    <Textarea label="Notes" placeholder="Payment terms, delivery notes…" defaultValue="Deliver before Friday. 2% early-payment discount agreed." />
  </div>
);

export const ErrorState = () => (
  <div style={{ maxWidth: 400 }}>
    <Textarea label="Dispute Reason" rows={3} error="Please describe the issue" />
  </div>
);
