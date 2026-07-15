import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import MeterBar from '../ui/MeterBar';
import Button from '../ui/Button';
import Input from '../ui/Input';

const CARD = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 22
};

const budgetColor = (spent, budget) => {
  if (spent > budget) return 'var(--danger)';
  if (spent >= 0.8 * budget) return 'var(--warning)';
  return 'var(--success)';
};

const BudgetsCard = ({ budgets, onSave, categories, spentByCategory, monthLabel }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    setDraft({ ...budgets });
    setEditing(true);
  };

  const handleSave = async () => {
    const cleaned = {};
    Object.entries(draft).forEach(([category, value]) => {
      const n = parseFloat(value);
      if (n > 0) cleaned[category] = n;
    });
    setSaving(true);
    try {
      await onSave(cleaned);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const budgeted = categories.filter(c => budgets[c] > 0);

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Budgets</h2>
        {!editing && <Button variant="secondary" size="small" onClick={startEditing}>Edit budgets</Button>}
      </div>

      {editing ? (
        <div>
          {categories.map(category => (
            <div key={category} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{category}</span>
              <Input
                type="number"
                min="0"
                placeholder="No budget"
                value={draft[category] ?? ''}
                onChange={(e) => setDraft({ ...draft, [category]: e.target.value })}
                containerStyle={{ marginBottom: 8, width: 140 }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      ) : budgeted.length === 0 ? (
        <div style={{ padding: '14px 0', color: 'var(--muted-foreground)', fontSize: 14 }}>
          No budgets set — add monthly limits per category to track overspending.
        </div>
      ) : (
        budgeted.map((category, i) => {
          const budget = budgets[category];
          const spent = spentByCategory[category] || 0;
          const color = budgetColor(spent, budget);
          const pct = Math.round((spent / budget) * 100);
          return (
            <div key={category} style={{
              display: 'flex', flexDirection: 'column', gap: 8, padding: '13px 0',
              borderBottom: i === budgeted.length - 1 ? 'none' : '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{category}</span>
                <span style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>
                  {formatCurrency(spent)} / {formatCurrency(budget)}
                </span>
              </div>
              <MeterBar total={budget} segments={[{ value: spent, color }]} height={12} />
              {spent > budget ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)' }}>
                  Over by {formatCurrency(spent - budget)} in {monthLabel}
                </span>
              ) : pct >= 80 ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning)' }}>{pct}% used</span>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
};

export default BudgetsCard;
