import { useEffect, useState } from 'react';
import { Icon, type IconName } from './icons';
import { Login } from './pages/Login';
import { Complaints } from './pages/Complaints';
import { Dashboard } from './pages/Dashboard';
import { Facilities } from './pages/Facilities';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { Wallet } from './pages/Wallet';
import { useHashLocation } from './router';
import { clearSession, getSessionUser, isLoggedIn } from './session';
import { StoreProvider, useAdmin } from './store';
import type { PageId } from './types';
import { FeedbackProvider } from './ui';
import { fullName } from './format';

const copy: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: { title: 'Overview', subtitle: 'Marketplace at a glance' },
  facilities: { title: 'Facilities', subtitle: 'Review, update, and block venues' },
  users: { title: 'Users', subtitle: 'View, update, and block accounts' },
  complaints: { title: 'Complaints', subtitle: 'Answer messages and notify users' },
  settings: { title: 'Settings', subtitle: 'Categories and the deposit rate' },
  wallet: { title: 'Wallet', subtitle: 'Deposits, balances, and refunds' },
};

function Shell({ onLogout }: { onLogout: () => void }) {
  const { page } = useHashLocation();
  const { pending, loading, error, refresh } = useAdmin();
  const [open, setOpen] = useState(false);
  const admin = getSessionUser();
  const heading = copy[page];

  useEffect(() => {
    setOpen(false);
  }, [page]);

  const items: Array<{ id: PageId; label: string; icon: IconName; pending: boolean }> = [
    { id: 'dashboard', label: 'Overview', icon: 'grid', pending: false },
    { id: 'facilities', label: 'Facilities', icon: 'building', pending: pending.facilities },
    { id: 'users', label: 'Users', icon: 'users', pending: pending.users },
    { id: 'complaints', label: 'Complaints', icon: 'message', pending: pending.complaints },
    { id: 'settings', label: 'Settings', icon: 'settings', pending: false },
    { id: 'wallet', label: 'Wallet', icon: 'wallet', pending: pending.wallet },
  ];

  const today = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="app-shell">
      {open ? (
        <button type="button" className="sidebar-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />
      ) : null}
      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <div className="brand">
          <div className="brand-mark">H</div>
          <div>
            <strong>Hadjzi</strong>
            <span>Admin</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Dashboard">
          {items.map((item) => (
            <a
              key={item.id}
              className={page === item.id ? 'nav-link active' : 'nav-link'}
              href={`#/${item.id}`}
              aria-current={page === item.id ? 'page' : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.pending ? (
                <span className="pending-dot" title="New pending records" aria-label="Has pending records" />
              ) : null}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div>
            <strong dir="auto">
              {admin ? fullName(admin.firstName, admin.lastName) : 'Admin'}
            </strong>
            <span>Administrator</span>
          </div>
          <button type="button" className="icon-btn" onClick={onLogout} aria-label="Sign out">
            <Icon name="logout" />
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button type="button" className="menu-btn icon-btn" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Icon name="menu" />
          </button>
          <div>
            <h1>{heading.title}</h1>
            <p>{heading.subtitle}</p>
          </div>
          <div className="topbar-spacer">{today}</div>
        </header>
        <div className="content">
          {loading ? (
            <div className="panel empty">
              <strong>Loading live data…</strong>
              <p>Fetching records from the shared Hadjzi database.</p>
            </div>
          ) : error ? (
            <div className="panel empty">
              <strong>Could not load the dashboard</strong>
              <p>{error}</p>
              <button type="button" className="btn primary" onClick={() => void refresh()}>
                Retry
              </button>
            </div>
          ) : (
            <>
              {page === 'dashboard' ? <Dashboard /> : null}
              {page === 'facilities' ? <Facilities /> : null}
              {page === 'users' ? <Users /> : null}
              {page === 'complaints' ? <Complaints /> : null}
              {page === 'settings' ? <Settings /> : null}
              {page === 'wallet' ? <Wallet /> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [authed, setAuthed] = useState(() => isLoggedIn());

  if (!authed) {
    return (
      <Login
        onSuccess={() => {
          if (!window.location.hash) window.location.hash = '#/dashboard';
          setAuthed(true);
        }}
      />
    );
  }

  return (
    <StoreProvider>
      <FeedbackProvider>
        <Shell
          onLogout={() => {
            clearSession();
            setAuthed(false);
          }}
        />
      </FeedbackProvider>
    </StoreProvider>
  );
}
