import React, { useState, useEffect, useRef } from 'react';
import { Repeat } from 'lucide-react';
import {
  subscribeToRecurring,
  addRecurring,
  updateRecurring,
  deleteRecurring,
  materializeDueRecurring
} from '../../firebase/recurringService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';

const CARD = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 22
};

const EMPTY_FORM = { amount: '', type: 'cashOut', comment: '', frequency: 'monthly', startDate: '', category: '' };

const typePillStyle = (active, tone) => ({
  font: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  padding: '10px 18px',
  borderRadius: 'var(--radius-pill)',
  cursor: 'pointer',
  background: active ? `var(--${tone}-soft)` : 'var(--secondary)',
  color: active ? `var(--${tone})` : 'var(--muted-foreground)',
  border: active ? `1px solid var(--${tone})` : '1px solid transparent'
});

const RecurringCard = ({ scope, tenantId, categories = [] }) => {
  const [templates, setTemplates] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const materializing = useRef(false);

  useEffect(() => {
    if (!tenantId) return;
    const unsubscribe = subscribeToRecurring(tenantId, scope, async (items) => {
      setTemplates(items);
      const now = new Date();
      const due = items.filter(t => t.active && t.nextDue && new Date(t.nextDue) <= now);
      if (due.length > 0 && !materializing.current) {
        materializing.current = true;
        try {
          await materializeDueRecurring(tenantId, due);
        } finally {
          materializing.current = false;
        }
      }
    }, (err) => console.error('Recurring subscription error:', err));
    return () => unsubscribe();
  }, [tenantId, scope]);

  const openModal = () => {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    setForm({ ...EMPTY_FORM, startDate: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}` });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { setFormError('Enter a valid amount'); return; }
    if (!form.comment.trim()) { setFormError('Name / comment is required'); return; }
    if (!form.startDate) { setFormError('Pick a start date'); return; }
    const needsCategory = scope === 'personal' && form.type === 'cashOut';
    if (needsCategory && !form.category) { setFormError('Pick a category'); return; }

    setSaving(true);
    try {
      await addRecurring({
        scope,
        type: form.type,
        amount,
        comment: form.comment.trim(),
        frequency: form.frequency,
        nextDue: new Date(`${form.startDate}T09:00:00`),
        active: true,
        category: needsCategory ? form.category : null
      }, tenantId);
      setModalOpen(false);
    } catch (err) {
      setFormError('Could not save — try again');
    } finally {
      setSaving(false);
    }
  };

  const needsCategory = scope === 'personal' && form.type === 'cashOut';

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Repeat size={17} color="var(--primary-accent)" /> Recurring
        </h2>
        <Button variant="secondary" size="small" onClick={openModal}>＋ Add recurring</Button>
      </div>

      {templates.length === 0 ? (
        <div style={{ padding: '18px 0', color: 'var(--muted-foreground)', fontSize: 14 }}>
          No recurring transactions yet — rent, salaries, subscriptions live here.
        </div>
      ) : templates.map((t, i) => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '12px 0', flexWrap: 'wrap',
          borderBottom: i === templates.length - 1 ? 'none' : '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{t.comment}</span>
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
              {t.type === 'cashIn' ? 'Cash In' : 'Cash Out'}
              {t.category ? ` · ${t.category}` : ''}
              {t.active && t.nextDue ? ` · next on ${formatDate(t.nextDue)}` : ' · paused'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
              padding: '3px 10px', borderRadius: 'var(--radius-pill)',
              background: 'var(--primary-soft)', color: 'var(--primary-accent)'
            }}>
              {t.frequency}
            </span>
            <span style={{ fontWeight: 800, fontSize: 14, color: t.type === 'cashIn' ? 'var(--success)' : 'var(--danger)' }}>
              {formatCurrency(t.amount)}
            </span>
            <button
              onClick={() => updateRecurring(t.id, { active: !t.active })}
              style={{
                font: 'inherit', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                padding: '5px 14px', borderRadius: 'var(--radius-pill)',
                background: t.active ? 'var(--success-soft)' : 'var(--secondary)',
                color: t.active ? 'var(--success)' : 'var(--muted-foreground)'
              }}
            >
              {t.active ? 'Active' : 'Paused'}
            </button>
            <button
              onClick={() => setDeleteTarget(t)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
                fontSize: 12, fontWeight: 700, color: 'var(--danger)', padding: '5px 10px',
                borderRadius: 'var(--radius-pill)'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      <div style={{
        marginTop: 12, fontSize: 12, color: 'var(--muted-foreground)',
        background: 'var(--muted)', borderRadius: 'var(--radius-sm)', padding: '8px 14px'
      }}>
        Due items are added to the ledger automatically when you open the app on or after their date.
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add recurring" maxWidth={440}>
        <div style={{ padding: '20px 24px 24px' }}>
          <Input
            label="Name / comment"
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            placeholder={scope === 'shop' ? 'Shop rent' : 'House rent'}
          />
          <Input
            label="Amount"
            type="number"
            min="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0"
          />
          <div style={{ marginBottom: 16 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Type</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={typePillStyle(form.type === 'cashIn', 'success')} onClick={() => setForm({ ...form, type: 'cashIn' })}>Cash In</button>
              <button style={typePillStyle(form.type === 'cashOut', 'danger')} onClick={() => setForm({ ...form, type: 'cashOut' })}>Cash Out</button>
            </div>
          </div>
          {needsCategory && (
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={[{ value: '', label: 'Pick a category…' }, ...categories.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))]}
            />
          )}
          <Select
            label="Repeats"
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            options={[{ value: 'monthly', label: 'Monthly' }, { value: 'weekly', label: 'Weekly' }]}
          />
          <Input
            label="First due date"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
          {formError && <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{formError}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete recurring?"
        message={deleteTarget ? `"${deleteTarget.comment}" will stop repeating. Entries already in the ledger stay.` : ''}
        onConfirm={async () => { await deleteRecurring(deleteTarget.id); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default RecurringCard;
