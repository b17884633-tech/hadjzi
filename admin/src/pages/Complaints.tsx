import { useMemo, useState } from 'react';
import { ApiError } from '../api';
import { audienceLabel, complaintStatusLabel, formatDateTime, fullName, includesQuery } from '../format';
import { useHashLocation } from '../router';
import { useAdmin } from '../store';
import type { Complaint, ComplaintStatus, NoticeAudience } from '../types';
import {
  Avatar,
  Drawer,
  EmptyState,
  Modal,
  PAGE_SIZE,
  Pagination,
  SearchField,
  StatCard,
  StatusPill,
  usePaged,
  useToast,
} from '../ui';

const statuses: Array<ComplaintStatus | 'ALL'> = ['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];

export function Complaints() {
  const { state, setComplaint, addNotice } = useAdmin();
  const { query } = useHashLocation();
  const toast = useToast();
  const [tab, setTab] = useState<'messages' | 'notices'>('messages');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(query.get('status') ?? 'ALL');
  const [draft, setDraft] = useState<Complaint | null>(null);
  const [resolution, setResolution] = useState('');
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState('');
  const [composer, setComposer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({
    title: '',
    message: '',
    audience: 'ALL' as NoticeAudience,
    userId: '',
  });
  const [noticeError, setNoticeError] = useState('');

  const rows = useMemo(() => {
    return state.complaints
      .filter((item) => (status === 'ALL' ? true : item.status === status))
      .filter((item) =>
        includesQuery(search, [
          item.subject,
          item.message,
          item.bookingNumber,
          item.facilityName,
          item.userName,
        ]),
      )
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [state.complaints, search, status]);

  const paging = usePaged(rows, `${search}|${status}|${state.complaints.length}`);
  const noticeRows = usePaged(state.notices, `notices-${state.notices.length}`);

  const openCount = state.complaints.filter((item) => item.status === 'OPEN').length;
  const reviewCount = state.complaints.filter((item) => item.status === 'UNDER_REVIEW').length;
  const resolvedCount = state.complaints.filter((item) => item.status === 'RESOLVED').length;

  function openComplaint(item: Complaint) {
    setDraft(item);
    setResolution(item.resolution ?? '');
    setNotify(true);
    setError('');
  }

  async function closeComplaint(next: ComplaintStatus) {
    if (!draft || busy) return;
    if ((next === 'RESOLVED' || next === 'REJECTED') && resolution.trim().length < 4) {
      setError('Write a short resolution before closing this complaint.');
      return;
    }
    setBusy(true);
    try {
      await setComplaint(draft.id, next, resolution.trim());
      if (notify && draft.userId) {
        const title =
          next === 'RESOLVED'
            ? 'Your complaint was resolved'
            : next === 'REJECTED'
              ? 'Update on your complaint'
              : 'We are reviewing your complaint';
        await addNotice({
          title,
          message:
            resolution.trim() ||
            `Your message “${draft.subject}” is now ${complaintStatusLabel[next].toLowerCase()}.`,
          audience: 'USER',
          userId: draft.userId,
        });
      }
      setDraft({ ...draft, status: next, resolution: resolution.trim() });
      toast(notify ? 'Complaint updated and the user was notified.' : 'Complaint updated.');
      setError('');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not update complaint.');
    } finally {
      setBusy(false);
    }
  }

  async function sendNotice() {
    const title = notice.title.trim();
    const message = notice.message.trim();
    if (title.length < 2) {
      setNoticeError('Enter a title.');
      return;
    }
    if (message.length < 4) {
      setNoticeError('Write the notification message.');
      return;
    }
    if (notice.audience === 'USER' && !notice.userId) {
      setNoticeError('Choose a user.');
      return;
    }
    setBusy(true);
    try {
      await addNotice({
        title,
        message,
        audience: notice.audience,
        userId: notice.audience === 'USER' ? notice.userId : null,
      });
      setComposer(false);
      setNotice({ title: '', message: '', audience: 'ALL', userId: '' });
      setNoticeError('');
      setTab('notices');
      toast('Notification sent.');
    } catch (err) {
      setNoticeError(err instanceof ApiError ? err.message : 'Could not send notification.');
    } finally {
      setBusy(false);
    }
  }

  function audienceText(audience: NoticeAudience, userName: string | null) {
    if (audience === 'USER') return userName || 'One user';
    return audienceLabel[audience];
  }

  return (
    <>
      <section className="stat-grid">
        <StatCard label="Open" value={String(openCount)} hint="New messages" />
        <StatCard label="In review" value={String(reviewCount)} hint="Being handled" />
        <StatCard label="Resolved" value={String(resolvedCount)} hint="Closed with a reply" />
        <StatCard label="Notifications" value={String(state.notices.length)} hint="Sent from this desk" />
      </section>

      <section className="panel">
        <div className="toolbar">
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'messages'} onClick={() => setTab('messages')}>
              Messages
            </button>
            <button type="button" role="tab" aria-selected={tab === 'notices'} onClick={() => setTab('notices')}>
              Notifications
            </button>
          </div>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setNoticeError('');
              setComposer(true);
            }}
          >
            Send notification
          </button>
        </div>

        {tab === 'messages' ? (
          <>
            <div className="toolbar">
              <SearchField value={search} onChange={setSearch} placeholder="Search subject, booking, or user" />
              <select className="select" value={status} aria-label="Status" onChange={(event) => setStatus(event.target.value)}>
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item === 'ALL' ? 'All statuses' : complaintStatusLabel[item]}
                  </option>
                ))}
              </select>
            </div>
            {paging.total === 0 ? (
              <EmptyState title="No complaints" text="New customer messages will show up here." />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>Subject</th>
                      <th>Booking</th>
                      <th>Status</th>
                      <th>Received</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {paging.slice.map((item) => {
                      const name = item.userName || 'Unknown';
                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="person">
                              <Avatar name={name} />
                              <div>
                                <strong dir="auto">{name}</strong>
                                <span dir="auto">
                                  {item.facilityName ||
                                    (item.bookingId ? '—' : 'General feedback')}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <strong className="clip">{item.subject}</strong>
                          </td>
                          <td>{item.bookingNumber || '—'}</td>
                          <td>
                            <StatusPill status={item.status} label={complaintStatusLabel[item.status]} />
                          </td>
                          <td>{formatDateTime(item.createdAt)}</td>
                          <td>
                            <div className="row-actions">
                              <button type="button" className="btn ghost small" onClick={() => openComplaint(item)}>
                                Open
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination page={paging.page} pages={paging.pages} total={paging.total} pageSize={PAGE_SIZE} onPage={paging.setPage} />
          </>
        ) : noticeRows.total === 0 ? (
          <EmptyState title="No notifications yet" text="Send one to all users, a role, or a single account." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Audience</th>
                    <th>Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {noticeRows.slice.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong className="clip">{item.title}</strong>
                        <span className="muted clip">{item.message}</span>
                      </td>
                      <td dir="auto">{audienceText(item.audience, item.userName)}</td>
                      <td>{formatDateTime(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={noticeRows.page}
              pages={noticeRows.pages}
              total={noticeRows.total}
              pageSize={PAGE_SIZE}
              onPage={noticeRows.setPage}
            />
          </>
        )}
      </section>

      <Drawer
        open={Boolean(draft)}
        title={draft?.subject ?? 'Complaint'}
        subtitle={
          draft
            ? draft.bookingId
              ? `${draft.bookingNumber ?? '—'} · ${draft.facilityName ?? '—'}`
              : 'General feedback'
            : undefined
        }
        onClose={() => setDraft(null)}
        footer={
          draft ? (
            <>
              {draft.status === 'OPEN' ? (
                <button type="button" className="btn ghost" disabled={busy} onClick={() => void closeComplaint('UNDER_REVIEW')}>
                  Mark in review
                </button>
              ) : null}
              {draft.status !== 'RESOLVED' ? (
                <button type="button" className="btn primary" disabled={busy} onClick={() => void closeComplaint('RESOLVED')}>
                  Resolve
                </button>
              ) : null}
              {draft.status !== 'REJECTED' ? (
                <button type="button" className="btn danger" disabled={busy} onClick={() => void closeComplaint('REJECTED')}>
                  Reject
                </button>
              ) : null}
            </>
          ) : null
        }
      >
        {draft ? (
          <div className="stack">
            <section className="detail-section" style={{ marginTop: 0 }}>
              <h3>Message</h3>
              <p className="message-body" dir="auto">
                {draft.message}
              </p>
            </section>
            <label className="field">
              <span>Reply / resolution</span>
              <textarea
                dir="auto"
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
              />
              {error ? <small>{error}</small> : null}
            </label>
            <label className="checkline">
              <input
                type="checkbox"
                checked={notify}
                disabled={!draft.userId}
                onChange={(event) => setNotify(event.target.checked)}
              />
              Notify this user
            </label>
            <p className="help">Current status: {complaintStatusLabel[draft.status]}</p>
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={composer}
        title="Send notification"
        onClose={() => setComposer(false)}
        onSubmit={(event) => {
          event.preventDefault();
          void sendNotice();
        }}
        submitLabel={busy ? 'Sending…' : 'Send'}
      >
        <div className="stack">
          <label className="field">
            <span>Audience</span>
            <select
              value={notice.audience}
              onChange={(event) => setNotice({ ...notice, audience: event.target.value as NoticeAudience })}
            >
              <option value="ALL">All users</option>
              <option value="CUSTOMERS">Customers</option>
              <option value="PROVIDERS">Providers</option>
              <option value="USER">One user</option>
            </select>
          </label>
          {notice.audience === 'USER' ? (
            <label className="field">
              <span>User</span>
              <select value={notice.userId} onChange={(event) => setNotice({ ...notice, userId: event.target.value })}>
                <option value="">Choose</option>
                {state.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {fullName(user.firstName, user.lastName)} · {user.phone}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="field">
            <span>Title</span>
            <input value={notice.title} onChange={(event) => setNotice({ ...notice, title: event.target.value })} />
          </label>
          <label className="field">
            <span>Message</span>
            <textarea value={notice.message} onChange={(event) => setNotice({ ...notice, message: event.target.value })} />
          </label>
          {noticeError ? <div className="error-banner">{noticeError}</div> : null}
        </div>
      </Modal>
    </>
  );
}
