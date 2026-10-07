import { useMemo, useState } from 'react';
import { ApiError } from '../api';
import {
  formatDateTime,
  formatMoney,
  includesQuery,
  paymentStatusLabel,
  paymentTypeLabel,
} from '../format';
import { useHashLocation } from '../router';
import { useAdmin } from '../store';
import type { Payment, PaymentStatus, PaymentType } from '../types';
import {
  Drawer,
  EmptyState,
  PAGE_SIZE,
  Pagination,
  SearchField,
  StatCard,
  StatusPill,
  useConfirm,
  usePaged,
  useToast,
} from '../ui';

const statuses: Array<PaymentStatus | 'ALL'> = ['ALL', 'INITIATED', 'SUCCESS', 'FAILED'];
const types: Array<PaymentType | 'ALL'> = ['ALL', 'DEPOSIT', 'REMAINING', 'REFUND'];

export function Wallet() {
  const { state, setPaymentStatus, refundPayment } = useAdmin();
  const { query } = useHashLocation();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(query.get('status') ?? 'ALL');
  const [type, setType] = useState<PaymentType | 'ALL'>('ALL');
  const [selected, setSelected] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);

  const collected = state.payments.reduce((sum, payment) => {
    if (payment.status !== 'SUCCESS' || payment.type === 'REFUND') return sum;
    return sum + payment.amount;
  }, 0);
  const refunded = state.payments.reduce((sum, payment) => {
    if (payment.status !== 'SUCCESS' || payment.type !== 'REFUND') return sum;
    return sum + payment.amount;
  }, 0);
  const pendingAmount = state.payments.reduce((sum, payment) => {
    if (payment.status !== 'INITIATED') return sum;
    return sum + payment.amount;
  }, 0);
  const failed = state.payments.filter((payment) => payment.status === 'FAILED').length;

  const rows = useMemo(() => {
    return state.payments
      .filter((payment) => (status === 'ALL' ? true : payment.status === status))
      .filter((payment) => (type === 'ALL' ? true : payment.type === type))
      .filter((payment) =>
        includesQuery(search, [
          payment.bookingNumber,
          payment.facilityName,
          payment.method,
          payment.userName,
        ]),
      )
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [state.payments, search, status, type]);

  const paging = usePaged(rows, `${search}|${status}|${type}|${state.payments.length}`);
  const current = selected
    ? state.payments.find((item) => item.id === selected.id) ?? selected
    : null;
  const refundExists = current
    ? state.payments.some(
        (item) => item.type === 'REFUND' && item.relatedPaymentId === current.id,
      )
    : false;

  function mark(payment: Payment, next: PaymentStatus) {
    const apply = () => {
      setBusy(true);
      void setPaymentStatus(payment.id, next)
        .then(() => toast(next === 'SUCCESS' ? 'Payment confirmed.' : 'Payment marked failed.'))
        .catch((err) => toast(err instanceof ApiError ? err.message : 'Could not update payment.'))
        .finally(() => setBusy(false));
    };
    if (next === 'FAILED') {
      confirm({
        title: 'Mark this payment as failed?',
        message: `${payment.bookingNumber ?? 'Payment'} for ${formatMoney(payment.amount)} will stay unpaid.`,
        confirmLabel: 'Mark failed',
        danger: true,
        onConfirm: apply,
      });
      return;
    }
    apply();
  }

  function refund(payment: Payment) {
    confirm({
      title: 'Refund this payment?',
      message: `${formatMoney(payment.amount)} will be recorded as a refund on ${payment.bookingNumber ?? 'this booking'}.`,
      confirmLabel: 'Refund',
      danger: true,
      onConfirm: () => {
        setBusy(true);
        void refundPayment(payment.id)
          .then(() => toast('Refund recorded.'))
          .catch((err) => toast(err instanceof ApiError ? err.message : 'Could not refund payment.'))
          .finally(() => setBusy(false));
      },
    });
  }

  return (
    <>
      <section className="stat-grid">
        <StatCard tone="navy" label="Net collected" value={formatMoney(collected - refunded)} hint="Paid in, minus refunds" />
        <StatCard label="Pending" value={formatMoney(pendingAmount)} hint="Waiting for confirmation" />
        <StatCard label="Refunded" value={formatMoney(refunded)} hint="Returned to customers" />
        <StatCard label="Failed" value={String(failed)} hint="Unsuccessful attempts" />
      </section>

      <section className="panel">
        <div className="toolbar">
          <SearchField value={search} onChange={setSearch} placeholder="Search booking, customer, or method" />
          <div className="filters">
            <select className="select" value={status} aria-label="Payment status" onChange={(event) => setStatus(event.target.value)}>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item === 'ALL' ? 'All statuses' : paymentStatusLabel[item]}
                </option>
              ))}
            </select>
            <select
              className="select"
              value={type}
              aria-label="Payment type"
              onChange={(event) => setType(event.target.value as PaymentType | 'ALL')}
            >
              {types.map((item) => (
                <option key={item} value={item}>
                  {item === 'ALL' ? 'All types' : paymentTypeLabel[item]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {paging.total === 0 ? (
          <EmptyState title="No payments" text="Try another search, status, or type." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {paging.slice.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <strong>{payment.bookingNumber ?? '—'}</strong>
                      <span className="muted">{formatDateTime(payment.createdAt)}</span>
                    </td>
                    <td dir="auto">{payment.userName ?? '—'}</td>
                    <td>{paymentTypeLabel[payment.type]}</td>
                    <td>{payment.method}</td>
                    <td className={payment.type === 'REFUND' ? 'money negative' : 'money'}>
                      {payment.type === 'REFUND' ? '−' : ''}
                      {formatMoney(payment.amount)}
                    </td>
                    <td>
                      <StatusPill status={payment.status} label={paymentStatusLabel[payment.status]} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="btn ghost small" onClick={() => setSelected(payment)}>
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={paging.page} pages={paging.pages} total={paging.total} pageSize={PAGE_SIZE} onPage={paging.setPage} />
      </section>

      <Drawer
        open={Boolean(current)}
        title={current?.bookingNumber ?? 'Payment'}
        subtitle={current?.facilityName ?? undefined}
        onClose={() => setSelected(null)}
        footer={
          current ? (
            <>
              {current.status === 'INITIATED' ? (
                <button type="button" className="btn primary" disabled={busy} onClick={() => mark(current, 'SUCCESS')}>
                  Confirm payment
                </button>
              ) : null}
              {current.status === 'INITIATED' ? (
                <button type="button" className="btn danger" disabled={busy} onClick={() => mark(current, 'FAILED')}>
                  Mark failed
                </button>
              ) : null}
              {current.status === 'SUCCESS' && current.type !== 'REFUND' && !refundExists ? (
                <button type="button" className="btn danger" disabled={busy} onClick={() => refund(current)}>
                  Refund
                </button>
              ) : null}
            </>
          ) : null
        }
      >
        {current ? (
          <dl className="detail-list">
            <div>
              <dt>Customer</dt>
              <dd dir="auto">{current.userName ?? '—'}</dd>
            </div>
            <div>
              <dt>Facility</dt>
              <dd dir="auto">{current.facilityName ?? '—'}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{paymentTypeLabel[current.type]}</dd>
            </div>
            <div>
              <dt>Method</dt>
              <dd>{current.method}</dd>
            </div>
            {current.reference ? (
              <div>
                <dt>Transfer ref</dt>
                <dd dir="auto">{current.reference}</dd>
              </div>
            ) : null}
            <div>
              <dt>Amount</dt>
              <dd>{formatMoney(current.amount)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{paymentStatusLabel[current.status]}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatDateTime(current.createdAt)}</dd>
            </div>
            {refundExists ? (
              <div>
                <dt>Refund</dt>
                <dd>A refund has already been recorded.</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </Drawer>
    </>
  );
}
