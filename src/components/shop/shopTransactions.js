import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { addTransaction, subscribeToTransactions, deleteTransaction } from '../../firebase/transactionService';
import { useNotifications } from '../ui/NotificationSystem';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import SummaryCard from '../ui/SummaryCard';
import PillTabs from '../ui/PillTabs';
import Button from '../ui/Button';
import Input from '../ui/Input';
import ConfirmDialog from '../ui/ConfirmDialog';
import MonthBar from '../transactions/MonthBar';
import RecurringCard from '../transactions/RecurringCard';
import { isInMonth, monthTotals, monthLabel, exportCsv, txDate } from '../transactions/transactionHelpers';

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

const ShopTransactions = () => {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('cashIn');
  const [comment, setComment] = useState('');
  const [filter, setFilter] = useState('all');
  const now = new Date();
  const [month, setMonth] = useState({ year: now.getFullYear(), monthIndex: now.getMonth() });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { showSuccess, showError } = useNotifications();

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    setError(null);
    const unsubscribe = subscribeToTransactions(
      tenantId,
      (items) => {
        setTransactions(items);
        setLoading(false);
      },
      (err) => {
        console.error('Transaction subscription error:', err);
        setError(err.message || 'Failed to load transactions');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [tenantId]);

  const monthTransactions = useMemo(
    () => transactions.filter(tx => isInMonth(tx, month)),
    [transactions, month]
  );

  const filteredTransactions = useMemo(
    () => monthTransactions.filter(tx => filter === 'all' || tx.type === filter),
    [monthTransactions, filter]
  );

  const totals = useMemo(() => monthTotals(monthTransactions), [monthTransactions]);

  const handleTransaction = async () => {
    if (amount === '' || Number(amount) === 0) {
      showError('Amount cannot be zero');
      return;
    }
    if (!comment.trim()) {
      showError('Please add a comment for the transaction');
      return;
    }
    setSubmitting(true);
    try {
      await addTransaction({
        type,
        amount: Number(amount),
        date: new Date(),
        comment: comment.trim()
      }, tenantId);
      setAmount('');
      setComment('');
      showSuccess('Transaction added successfully!');
    } catch (err) {
      console.error('Error adding transaction:', err);
      showError('Failed to add transaction. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTransaction(deleteTarget.id);
      showSuccess('Transaction deleted successfully!');
    } catch (err) {
      console.error('Error deleting transaction:', err);
      showError('Failed to delete transaction. Please try again.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleExport = () => {
    exportCsv(
      `shop-transactions-${monthLabel(month).replace(' ', '-').toLowerCase()}.csv`,
      ['Date', 'Type', 'Amount', 'Comment'],
      filteredTransactions.map(tx => [
        formatDate(txDate(tx)),
        tx.type === 'cashIn' ? 'Cash In' : 'Cash Out',
        tx.amount,
        tx.comment || ''
      ])
    );
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 15 }}>Loading transactions…</div>;
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <MonthBar value={month} onChange={setMonth} />
        <Button variant="secondary" onClick={handleExport}>Export CSV</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <SummaryCard
          label={`Cash In · ${monthLabel(month).split(' ')[0]}`}
          value={formatCurrency(totals.cashIn)}
          subtitle={`${totals.inCount} transaction${totals.inCount !== 1 ? 's' : ''} this month`}
          icon={TrendingUp}
          color="var(--success)"
          bgColor="var(--success-soft)"
        />
        <SummaryCard
          label={`Cash Out · ${monthLabel(month).split(' ')[0]}`}
          value={formatCurrency(totals.cashOut)}
          subtitle={`${totals.outCount} transaction${totals.outCount !== 1 ? 's' : ''} this month`}
          icon={TrendingDown}
          color="var(--danger)"
          bgColor="var(--danger-soft)"
        />
        <SummaryCard
          label={`Net · ${monthLabel(month).split(' ')[0]}`}
          value={formatCurrency(totals.net)}
          subtitle="cash flow this month"
          icon={Wallet}
          color={totals.net >= 0 ? 'var(--success)' : 'var(--danger)'}
          bgColor={totals.net >= 0 ? 'var(--success-soft)' : 'var(--danger-soft)'}
        />
      </div>

      <div style={CARD}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Add transaction</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Input
            label="Amount"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            containerStyle={{ flex: 1, minWidth: 140, marginBottom: 0 }}
          />
          <div>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Type</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={typePillStyle(type === 'cashIn', 'success')} onClick={() => setType('cashIn')}>Cash In</button>
              <button style={typePillStyle(type === 'cashOut', 'danger')} onClick={() => setType('cashOut')}>Cash Out</button>
            </div>
          </div>
          <Input
            label="Comment"
            type="text"
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="What was this for?"
            containerStyle={{ flex: 2, minWidth: 200, marginBottom: 0 }}
          />
          <Button variant="primary" onClick={handleTransaction} disabled={submitting}>
            {submitting ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </div>

      <div>
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
      </div>

      <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>Date</th>
                <th style={TH}>Type</th>
                <th style={{ ...TH, textAlign: 'right' }}>Amount</th>
                <th style={TH}>Comment</th>
                <th style={TH}></th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ ...TD, textAlign: 'center', color: 'var(--muted-foreground)', borderBottom: 'none' }}>
                    No transactions in {monthLabel(month)}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, i) => (
                  <tr key={tx.id}>
                    <td style={{ ...TD, whiteSpace: 'nowrap', borderBottom: i === filteredTransactions.length - 1 ? 'none' : TD.borderBottom }}>
                      {formatDate(txDate(tx))}
                    </td>
                    <td style={{ ...TD, borderBottom: i === filteredTransactions.length - 1 ? 'none' : TD.borderBottom }}>
                      {typeBadge(tx.type)}
                    </td>
                    <td style={{ ...TD, textAlign: 'right', fontWeight: 700, borderBottom: i === filteredTransactions.length - 1 ? 'none' : TD.borderBottom }}>
                      {formatCurrency(tx.amount)}
                    </td>
                    <td style={{ ...TD, borderBottom: i === filteredTransactions.length - 1 ? 'none' : TD.borderBottom }}>
                      {tx.comment}
                    </td>
                    <td style={{ ...TD, whiteSpace: 'nowrap', borderBottom: i === filteredTransactions.length - 1 ? 'none' : TD.borderBottom }}>
                      <button
                        onClick={() => setDeleteTarget(tx)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
                          fontSize: 12, fontWeight: 700, color: 'var(--danger)',
                          padding: '5px 12px', borderRadius: 'var(--radius-pill)'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RecurringCard scope="shop" tenantId={tenantId} />

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

export default ShopTransactions;
