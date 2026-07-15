import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import {
  addPersonalTransaction,
  updatePersonalTransaction,
  deletePersonalTransaction,
  subscribeToPersonalTransactions,
  setPersonalBudgets,
  subscribeToPersonalBudgets
} from '../../firebase/personalService';
import { useNotifications } from '../ui/NotificationSystem';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import SummaryCard from '../ui/SummaryCard';
import PillTabs from '../ui/PillTabs';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import MeterBar from '../ui/MeterBar';
import ConfirmDialog from '../ui/ConfirmDialog';
import MonthBar from '../transactions/MonthBar';
import RecurringCard from '../transactions/RecurringCard';
import BudgetsCard from './BudgetsCard';
import { isInMonth, monthTotals, monthLabel, spendByCategory, exportCsv, txDate } from '../transactions/transactionHelpers';

const DEFAULT_CATEGORIES = ['food', 'travel', 'shopping', 'bills', 'health', 'entertainment', 'other'];
const CATEGORIES_KEY = 'personalCategories';

const PALETTE = [
  'var(--primary)',
  'var(--success)',
  'var(--warning)',
  'var(--foreground)',
  'var(--muted-foreground)',
  'var(--primary-accent)'
];

const CARD = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 22
};

const TH = {
  textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'var(--muted-foreground)',
  background: 'var(--secondary)', padding: '12px 18px'
};

const TD = { padding: '13px 18px', borderBottom: '1px solid var(--border-subtle)', fontSize: 14 };

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

const typeBadge = (type) => (
  <span style={{
    display: 'inline-block', fontSize: 12, fontWeight: 700, padding: '4px 12px',
    borderRadius: 'var(--radius-pill)',
    background: type === 'cashIn' ? 'var(--success-soft)' : 'var(--danger-soft)',
    color: type === 'cashIn' ? 'var(--success)' : 'var(--danger)'
  }}>
    {type === 'cashIn' ? 'Cash In' : 'Cash Out'}
  </span>
);

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const loadCategories = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(CATEGORIES_KEY));
    if (Array.isArray(stored) && stored.length > 0) return stored;
  } catch (e) { /* fall through to defaults */ }
  return DEFAULT_CATEGORIES;
};

const todayInputValue = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const EMPTY_FORM = { amount: '', type: 'cashOut', category: '', comment: '', dateStr: '' };

const PersonalTracker = () => {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const { showSuccess, showError } = useNotifications();

  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [categories, setCategories] = useState(loadCategories);
  const now = new Date();
  const [month, setMonth] = useState({ year: now.getFullYear(), monthIndex: now.getMonth() });
  const [form, setForm] = useState({ ...EMPTY_FORM, dateStr: todayInputValue() });
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    setError(null);
    const unsubTx = subscribeToPersonalTransactions(
      tenantId,
      (items) => { setTransactions(items); setLoading(false); },
      (err) => {
        console.error('Personal transactions subscription error:', err);
        setError(err.message || 'Failed to load transactions');
        setLoading(false);
      }
    );
    const unsubBudgets = subscribeToPersonalBudgets(
      tenantId,
      setBudgets,
      (err) => console.error('Budgets subscription error:', err)
    );
    return () => { unsubTx(); unsubBudgets(); };
  }, [tenantId]);

  const monthTransactions = useMemo(
    () => transactions.filter(tx => isInMonth(tx, month)),
    [transactions, month]
  );

  const totals = useMemo(() => monthTotals(monthTransactions), [monthTransactions]);

  const breakdown = useMemo(() => spendByCategory(monthTransactions), [monthTransactions]);

  const spentMap = useMemo(() => {
    const map = {};
    breakdown.forEach(({ category, total }) => { map[category] = total; });
    return map;
  }, [breakdown]);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monthTransactions.filter(tx => {
      if (filter !== 'all' && tx.type !== filter) return false;
      if (categoryFilter !== 'all' && (tx.category || 'other') !== categoryFilter && tx.type === 'cashOut') return false;
      if (categoryFilter !== 'all' && tx.type === 'cashIn') return false;
      if (q && !(tx.comment || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [monthTransactions, filter, categoryFilter, search]);

  const handleCategoryChange = (value, target, setTarget) => {
    if (value === '__add__') {
      const name = window.prompt('New category name:');
      const cleaned = (name || '').trim().toLowerCase();
      if (cleaned && !categories.includes(cleaned)) {
        const next = [...categories, cleaned];
        setCategories(next);
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(next));
        setTarget({ ...target, category: cleaned });
      }
      return;
    }
    setTarget({ ...target, category: value });
  };

  const validate = (f) => {
    const amount = parseFloat(f.amount);
    if (!amount || amount <= 0) return 'Enter a valid amount';
    if (!f.comment.trim()) return 'Comment is required';
    if (f.type === 'cashOut' && !f.category) return 'Pick a category';
    if (!f.dateStr) return 'Pick a date';
    return null;
  };

  const buildPayload = (f) => ({
    type: f.type,
    amount: parseFloat(f.amount),
    category: f.type === 'cashOut' ? f.category : null,
    comment: f.comment.trim(),
    date: new Date(`${f.dateStr}T12:00:00`)
  });

  const handleAdd = async () => {
    const problem = validate(form);
    if (problem) { showError(problem); return; }
    setSubmitting(true);
    try {
      await addPersonalTransaction(buildPayload(form), tenantId);
      setForm({ ...EMPTY_FORM, type: form.type, dateStr: todayInputValue() });
      showSuccess('Transaction added!');
    } catch (err) {
      console.error('Error adding personal transaction:', err);
      showError('Failed to add transaction. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (tx) => {
    const d = txDate(tx);
    const pad = (n) => String(n).padStart(2, '0');
    setEditForm({
      amount: String(tx.amount),
      type: tx.type,
      category: tx.category || '',
      comment: tx.comment || '',
      dateStr: d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : todayInputValue()
    });
    setEditTarget(tx);
  };

  const handleEditSave = async () => {
    const problem = validate(editForm);
    if (problem) { showError(problem); return; }
    setSubmitting(true);
    try {
      await updatePersonalTransaction(editTarget.id, buildPayload(editForm));
      setEditTarget(null);
      showSuccess('Transaction updated!');
    } catch (err) {
      console.error('Error updating personal transaction:', err);
      showError('Failed to update transaction. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deletePersonalTransaction(deleteTarget.id);
      showSuccess('Transaction deleted!');
    } catch (err) {
      console.error('Error deleting personal transaction:', err);
      showError('Failed to delete transaction. Please try again.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleExport = () => {
    exportCsv(
      `personal-transactions-${monthLabel(month).replace(' ', '-').toLowerCase()}.csv`,
      ['Date', 'Type', 'Category', 'Amount', 'Comment'],
      filteredTransactions.map(tx => [
        formatDate(txDate(tx)),
        tx.type === 'cashIn' ? 'Cash In' : 'Cash Out',
        tx.type === 'cashOut' ? capitalize(tx.category || 'other') : '',
        tx.amount,
        tx.comment || ''
      ])
    );
  };

  const categoryOptions = (withAdd) => [
    ...categories.map(c => ({ value: c, label: capitalize(c) })),
    ...(withAdd ? [{ value: '__add__', label: '＋ Add category…' }] : [])
  ];

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 15 }}>Loading your money…</div>;
  }

  if (error) {
    return (
      <div style={{ ...CARD, background: 'var(--danger-soft)', textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--danger)', marginBottom: 6 }}>Failed to load transactions</div>
        <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 16 }}>{error}</div>
        <Button variant="secondary" onClick={() => { setError(null); setLoading(true); }}>Retry</Button>
      </div>
    );
  }

  if (!tenantId) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 15 }}>Unable to load transactions — no tenant found.</div>;
  }

  const editFields = (f, setF) => (
    <>
      <Input label="Amount" type="number" min="0" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} placeholder="0" />
      <div style={{ marginBottom: 16 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Type</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={typePillStyle(f.type === 'cashIn', 'success')} onClick={() => setF({ ...f, type: 'cashIn', category: '' })}>Cash In</button>
          <button style={typePillStyle(f.type === 'cashOut', 'danger')} onClick={() => setF({ ...f, type: 'cashOut' })}>Cash Out</button>
        </div>
      </div>
      {f.type === 'cashOut' && (
        <Select
          label="Category"
          value={f.category}
          onChange={e => handleCategoryChange(e.target.value, f, setF)}
          options={[{ value: '', label: 'Pick a category…' }, ...categoryOptions(true)]}
        />
      )}
      <Input label="Date" type="date" value={f.dateStr} onChange={e => setF({ ...f, dateStr: e.target.value })} />
      <Input label="Comment" type="text" value={f.comment} onChange={e => setF({ ...f, comment: e.target.value })} placeholder="What was this for?" />
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <MonthBar value={month} onChange={setMonth} />
        <Button variant="secondary" onClick={handleExport}>Export CSV</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <SummaryCard
          label="Income"
          value={formatCurrency(totals.cashIn)}
          subtitle={`${totals.inCount} entr${totals.inCount === 1 ? 'y' : 'ies'} this month`}
          icon={TrendingUp}
          color="var(--success)"
          bgColor="var(--success-soft)"
        />
        <SummaryCard
          label="Spent"
          value={formatCurrency(totals.cashOut)}
          subtitle={`${totals.outCount} entr${totals.outCount === 1 ? 'y' : 'ies'} this month`}
          icon={TrendingDown}
          color="var(--danger)"
          bgColor="var(--danger-soft)"
        />
        <SummaryCard
          label="Net"
          value={formatCurrency(totals.net)}
          subtitle={totals.net >= 0 ? `saved in ${monthLabel(month).split(' ')[0]}` : `overspent in ${monthLabel(month).split(' ')[0]}`}
          icon={Wallet}
          color={totals.net >= 0 ? 'var(--success)' : 'var(--danger)'}
          bgColor={totals.net >= 0 ? 'var(--success-soft)' : 'var(--danger-soft)'}
        />
      </div>

      <div style={CARD}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Add transaction</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Input
            label="Amount" type="number" min="0" value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            placeholder="0" containerStyle={{ flex: 1, minWidth: 120, marginBottom: 0 }}
          />
          <div>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Type</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={typePillStyle(form.type === 'cashIn', 'success')} onClick={() => setForm({ ...form, type: 'cashIn', category: '' })}>Cash In</button>
              <button style={typePillStyle(form.type === 'cashOut', 'danger')} onClick={() => setForm({ ...form, type: 'cashOut' })}>Cash Out</button>
            </div>
          </div>
          {form.type === 'cashOut' && (
            <Select
              label="Category"
              value={form.category}
              onChange={e => handleCategoryChange(e.target.value, form, setForm)}
              options={[{ value: '', label: 'Pick…' }, ...categoryOptions(true)]}
              containerStyle={{ flex: 1, minWidth: 130, marginBottom: 0 }}
            />
          )}
          <Input
            label="Date" type="date" value={form.dateStr}
            onChange={e => setForm({ ...form, dateStr: e.target.value })}
            containerStyle={{ minWidth: 150, marginBottom: 0 }}
          />
          <Input
            label="Comment" type="text" value={form.comment}
            onChange={e => setForm({ ...form, comment: e.target.value })}
            placeholder="What was this for?" containerStyle={{ flex: 2, minWidth: 180, marginBottom: 0 }}
          />
          <Button variant="primary" onClick={handleAdd} disabled={submitting}>
            {submitting ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, alignItems: 'start' }}>
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Where {monthLabel(month).split(' ')[0]} went</h2>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted-foreground)' }}>{formatCurrency(totals.cashOut)} spent</span>
          </div>
          {breakdown.length === 0 ? (
            <div style={{ padding: '14px 0', color: 'var(--muted-foreground)', fontSize: 14 }}>No spending this month yet.</div>
          ) : (
            <>
              <MeterBar
                total={totals.cashOut}
                height={12}
                segments={breakdown.map((c, i) => ({ value: c.total, color: PALETTE[i % PALETTE.length] }))}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 22px', fontSize: 13, marginTop: 14 }}>
                {breakdown.map((c, i) => (
                  <span key={c.category}>
                    <span style={{
                      display: 'inline-block', width: 9, height: 9, borderRadius: '50%',
                      marginRight: 7, background: PALETTE[i % PALETTE.length]
                    }} />
                    <b style={{ textTransform: 'capitalize' }}>{c.category}</b>{' '}
                    {formatCurrency(c.total)}{' '}
                    <span style={{ color: 'var(--muted-foreground)' }}>
                      {totals.cashOut > 0 ? Math.round((c.total / totals.cashOut) * 100) : 0}%
                    </span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <BudgetsCard
          budgets={budgets}
          onSave={(cleaned) => setPersonalBudgets(tenantId, cleaned)}
          categories={categories}
          spentByCategory={spentMap}
          monthLabel={monthLabel(month)}
        />
      </div>

      <RecurringCard scope="personal" tenantId={tenantId} categories={categories} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <PillTabs
          items={[
            { value: 'all', label: 'All' },
            { value: 'cashIn', label: 'Cash In' },
            { value: 'cashOut', label: 'Cash Out' }
          ]}
          value={filter}
          onChange={setFilter}
          size="sm"
        />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{
              font: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--foreground)',
              background: 'var(--card)', border: '1px solid var(--input)',
              borderRadius: 'var(--radius-pill)', padding: '7px 16px', cursor: 'pointer'
            }}
          >
            <option value="all">All categories</option>
            {categories.map(c => <option key={c} value={c}>{capitalize(c)}</option>)}
          </select>
          <input
            type="search"
            placeholder="Search comments…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              font: 'inherit', fontSize: 13, color: 'var(--foreground)',
              background: 'var(--card)', border: '1px solid var(--input)',
              borderRadius: 'var(--radius-pill)', padding: '7px 16px', width: 180
            }}
          />
        </div>
      </div>

      <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>Date</th>
                <th style={TH}>Type</th>
                <th style={TH}>Category</th>
                <th style={TH}>Comment</th>
                <th style={{ ...TH, textAlign: 'right' }}>Amount</th>
                <th style={TH}></th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ ...TD, textAlign: 'center', color: 'var(--muted-foreground)', borderBottom: 'none' }}>
                    No transactions in {monthLabel(month)}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, i) => {
                  const last = i === filteredTransactions.length - 1;
                  const cell = { ...TD, borderBottom: last ? 'none' : TD.borderBottom };
                  return (
                    <tr key={tx.id}>
                      <td style={{ ...cell, whiteSpace: 'nowrap' }}>{formatDate(txDate(tx))}</td>
                      <td style={cell}>{typeBadge(tx.type)}</td>
                      <td style={cell}>
                        {tx.type === 'cashOut' ? (
                          <span style={{
                            display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '3px 10px',
                            borderRadius: 'var(--radius-pill)', background: 'var(--secondary)',
                            color: 'var(--muted-foreground)', textTransform: 'capitalize'
                          }}>
                            {tx.category || 'other'}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={cell}>{tx.comment}</td>
                      <td style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(tx.amount)}</td>
                      <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => openEdit(tx)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
                            fontSize: 12, fontWeight: 700, color: 'var(--primary-accent)',
                            padding: '5px 10px', borderRadius: 'var(--radius-pill)'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(tx)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
                            fontSize: 12, fontWeight: 700, color: 'var(--danger)',
                            padding: '5px 10px', borderRadius: 'var(--radius-pill)'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit transaction" maxWidth={440}>
        <div style={{ padding: '20px 24px 24px' }}>
          {editFields(editForm, setEditForm)}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleEditSave} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete transaction?"
        message={deleteTarget ? `${formatCurrency(deleteTarget.amount)} — "${deleteTarget.comment}" will be removed permanently.` : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default PersonalTracker;
