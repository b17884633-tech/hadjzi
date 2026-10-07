import { useMemo, useState } from 'react';
import { ApiError } from '../api';
import { accountStatusLabel, cx, formatDate, fullName, includesQuery, roleLabel } from '../format';
import { useHashLocation } from '../router';
import { getSessionUser } from '../session';
import { useAdmin } from '../store';
import type { AccountStatus, AdminUser, UserRole } from '../types';
import {
  Avatar,
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

const statuses: Array<AccountStatus | 'ALL'> = ['ALL', 'PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED'];
const roles: UserRole[] = ['CUSTOMER', 'PROVIDER', 'ADMIN'];
const emptyErrors = { firstName: '', lastName: '', phone: '', email: '' };

export function Users() {
  const { state, updateUser, setUserStatus } = useAdmin();
  const { query } = useHashLocation();
  const confirm = useConfirm();
  const toast = useToast();
  const me = getSessionUser();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(query.get('status') ?? 'ALL');
  const [draft, setDraft] = useState<AdminUser | null>(null);
  const [errors, setErrors] = useState(emptyErrors);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    return state.users
      .filter((user) => (status === 'ALL' ? true : user.status === status))
      .filter((user) =>
        includesQuery(search, [fullName(user.firstName, user.lastName), user.phone, user.email, user.role]),
      )
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [state.users, search, status]);

  const paging = usePaged(rows, `${search}|${status}|${state.users.length}`);
  const active = state.users.filter((user) => user.status === 'ACTIVE').length;
  const pending = state.users.filter((user) => user.status === 'PENDING_VERIFICATION').length;
  const blocked = state.users.filter((user) => user.status === 'SUSPENDED').length;
  const isSelf = draft?.id === me?.id;

  function open(user: AdminUser) {
    setDraft({ ...user });
    setErrors(emptyErrors);
  }

  function validate(user: AdminUser) {
    const next = { ...emptyErrors };
    if (user.firstName.trim().length < 2) next.firstName = 'Enter a first name.';
    if (user.lastName.trim().length < 2) next.lastName = 'Enter a last name.';
    const phone = user.phone.replace(/\s/g, '');
    if (!/^\+\d{8,15}$/.test(phone)) next.phone = 'Use a number like +967770000010.';
    if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email.trim())) {
      next.email = 'Enter a valid email.';
    }
    return next;
  }

  async function save(nextStatus?: AccountStatus) {
    if (!draft || busy) return;
    const nextErrors = validate(draft);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    if (isSelf && nextStatus === 'SUSPENDED') return;

    const apply = async () => {
      setBusy(true);
      try {
        await updateUser(draft.id, {
          firstName: draft.firstName.trim(),
          lastName: draft.lastName.trim(),
          phone: draft.phone.replace(/\s/g, ''),
          email: draft.email?.trim() || null,
          role: isSelf ? 'ADMIN' : draft.role,
        });
        if (nextStatus && nextStatus !== draft.status) {
          await setUserStatus(draft.id, nextStatus);
        }
        setDraft({
          ...draft,
          firstName: draft.firstName.trim(),
          lastName: draft.lastName.trim(),
          phone: draft.phone.replace(/\s/g, ''),
          email: draft.email?.trim() || null,
          role: isSelf ? 'ADMIN' : draft.role,
          status: nextStatus ?? draft.status,
        });
        if (nextStatus === 'SUSPENDED') toast('User blocked.');
        else if (nextStatus === 'ACTIVE' && draft.status === 'PENDING_VERIFICATION') toast('Account verified.');
        else if (nextStatus === 'ACTIVE' && draft.status === 'SUSPENDED') toast('User unblocked.');
        else toast('Profile saved.');
      } catch (err) {
        toast(err instanceof ApiError ? err.message : 'Could not save user.');
      } finally {
        setBusy(false);
      }
    };

    if (nextStatus === 'SUSPENDED') {
      confirm({
        title: 'Block this user?',
        message: `${fullName(draft.firstName, draft.lastName)} will not be able to sign in or take bookings.`,
        confirmLabel: 'Block',
        danger: true,
        onConfirm: () => {
          void apply();
        },
      });
      return;
    }
    await apply();
  }

  return (
    <>
      <section className="stat-grid">
        <StatCard label="Users" value={String(state.users.length)} hint="Customers, providers, admins" />
        <StatCard label="Active" value={String(active)} hint="Can use the app" />
        <StatCard label="Pending verification" value={String(pending)} hint="New accounts" />
        <StatCard label="Blocked" value={String(blocked)} hint="Suspended accounts" />
      </section>

      <section className="panel">
        <div className="toolbar">
          <SearchField value={search} onChange={setSearch} placeholder="Search name, phone, or email" />
          <select className="select" value={status} aria-label="Status" onChange={(event) => setStatus(event.target.value)}>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item === 'ALL' ? 'All statuses' : accountStatusLabel[item]}
              </option>
            ))}
          </select>
        </div>
        {paging.total === 0 ? (
          <EmptyState title="No users" text="Try another search or status." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {paging.slice.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="person">
                        <Avatar name={fullName(user.firstName, user.lastName)} />
                        <div>
                          <strong dir="auto">{fullName(user.firstName, user.lastName)}</strong>
                          <span>{user.email || 'No email'}</span>
                        </div>
                      </div>
                    </td>
                    <td>{user.phone}</td>
                    <td>{roleLabel[user.role]}</td>
                    <td>
                      <StatusPill status={user.status} label={accountStatusLabel[user.status]} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="btn ghost small" onClick={() => open(user)}>
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
        open={Boolean(draft)}
        title={draft ? fullName(draft.firstName, draft.lastName) : 'User'}
        subtitle={draft ? `Joined ${formatDate(draft.createdAt)}` : undefined}
        onClose={() => setDraft(null)}
        footer={
          draft ? (
            <>
              <button type="button" className="btn ghost" disabled={busy} onClick={() => void save()}>
                Save changes
              </button>
              {draft.status === 'PENDING_VERIFICATION' ? (
                <button type="button" className="btn primary" disabled={busy} onClick={() => void save('ACTIVE')}>
                  Verify
                </button>
              ) : null}
              {draft.status === 'SUSPENDED' ? (
                <button type="button" className="btn primary" disabled={busy} onClick={() => void save('ACTIVE')}>
                  Unblock
                </button>
              ) : null}
              {draft.status !== 'SUSPENDED' ? (
                <button type="button" className="btn danger" disabled={busy || isSelf} onClick={() => void save('SUSPENDED')}>
                  Block
                </button>
              ) : null}
            </>
          ) : null
        }
      >
        {draft ? (
          <div className="form-grid">
            <label className="field">
              <span>First name</span>
              <input dir="auto" value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} />
              {errors.firstName ? <small>{errors.firstName}</small> : null}
            </label>
            <label className="field">
              <span>Last name</span>
              <input dir="auto" value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} />
              {errors.lastName ? <small>{errors.lastName}</small> : null}
            </label>
            <label className="field">
              <span>Phone</span>
              <input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
              {errors.phone ? <small>{errors.phone}</small> : null}
            </label>
            <label className="field">
              <span>Email</span>
              <input value={draft.email ?? ''} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
              {errors.email ? <small>{errors.email}</small> : null}
            </label>
            <label className={cx('field', 'wide')}>
              <span>Role</span>
              <select
                value={draft.role}
                disabled={isSelf}
                onChange={(event) => setDraft({ ...draft, role: event.target.value as UserRole })}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel[role]}
                  </option>
                ))}
              </select>
            </label>
            {isSelf ? <p className={cx('help', 'wide')}>This is the signed-in admin account, so it cannot be blocked.</p> : null}
          </div>
        ) : null}
      </Drawer>
    </>
  );
}
