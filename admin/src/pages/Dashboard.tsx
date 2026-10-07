import { formatDate, formatMoney, fullName } from '../format';
import { navigate } from '../router';
import { useAdmin } from '../store';
import { StatCard } from '../ui';

export function Dashboard() {
  const { state } = useAdmin();
  const overview = state.overview;
  const stats = overview?.stats;
  const months = overview?.monthlyCollections ?? [];
  const peak = Math.max(...months.map((month) => month.value), 1);
  const recent = overview?.recentPayments ?? state.payments.slice(0, 5);

  const queue = [
    {
      label: 'Facilities awaiting review',
      count: stats?.facilitiesPending ?? 0,
      page: 'facilities' as const,
      status: 'PENDING_REVIEW',
    },
    {
      label: 'Users awaiting verification',
      count: stats?.usersPending ?? 0,
      page: 'users' as const,
      status: 'PENDING_VERIFICATION',
    },
    {
      label: 'New complaints',
      count: stats?.complaintsOpen ?? 0,
      page: 'complaints' as const,
      status: 'OPEN',
    },
    {
      label: 'Payments waiting',
      count: stats?.paymentsInitiated ?? 0,
      page: 'wallet' as const,
      status: 'INITIATED',
    },
  ];

  return (
    <>
      <section className="stat-grid">
        <StatCard
          tone="navy"
          label="Net collected"
          value={formatMoney(stats?.netCollected ?? 0)}
          hint="Paid in, minus refunds"
        />
        <StatCard
          label="Live facilities"
          value={String(stats?.facilitiesApproved ?? 0)}
          hint={`${stats?.facilitiesTotal ?? 0} on the platform`}
        />
        <StatCard
          label="Active users"
          value={String(stats?.usersActive ?? 0)}
          hint={`${stats?.usersTotal ?? 0} accounts`}
        />
        <StatCard
          label="Open complaints"
          value={String(stats?.complaintsOpen ?? 0)}
          hint={`${stats?.noticesTotal ?? 0} notifications sent`}
        />
      </section>

      <div className="split">
        <section className="panel">
          <div className="panel-head">
            <h2>Collections, last 6 months</h2>
          </div>
          <div className="chart" aria-label="Monthly net collections">
            {months.map((month) => (
              <div className="bar-col" key={month.key}>
                <div className="bar-track">
                  <div
                    className={month.value < 0 ? 'bar down' : 'bar'}
                    style={{
                      height: `${month.value < 0 ? 22 : Math.max(4, (month.value / peak) * 100)}%`,
                    }}
                    title={formatMoney(month.value)}
                  />
                </div>
                <span>{month.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Needs a decision</h2>
          </div>
          <div className="queue">
            {queue.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.page, item.count ? { status: item.status } : undefined)}
              >
                <span>
                  <strong>{item.label}</strong>
                  <span>{item.count ? 'Open the queue' : 'Nothing waiting'}</span>
                </span>
                <b className="count">{item.count}</b>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Latest payments</h2>
          <button type="button" className="btn ghost small" onClick={() => navigate('wallet')}>
            Open wallet
          </button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Customer</th>
                <th>Facility</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((payment) => {
                const user = state.users.find((item) => item.id === payment.userId);
                return (
                  <tr key={payment.id}>
                    <td>{payment.bookingNumber ?? '—'}</td>
                    <td dir="auto">
                      {payment.userName
                        ?? (user ? fullName(user.firstName, user.lastName) : 'Unknown')}
                    </td>
                    <td dir="auto">{payment.facilityName ?? '—'}</td>
                    <td className={payment.type === 'REFUND' ? 'money negative' : 'money'}>
                      {payment.type === 'REFUND' ? '−' : ''}
                      {formatMoney(payment.amount)}
                    </td>
                    <td>{formatDate(payment.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
