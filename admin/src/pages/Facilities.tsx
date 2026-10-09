import { useMemo, useState } from 'react';
import { ApiError } from '../api';
import { cx, facilityStatusLabel, formatDate, includesQuery } from '../format';
import { useHashLocation } from '../router';
import { useAdmin } from '../store';
import type { Facility, FacilityStatus } from '../types';
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

const statuses: Array<FacilityStatus | 'ALL'> = [
  'ALL',
  'PENDING_REVIEW',
  'APPROVED',
  'SUSPENDED',
  'REJECTED',
];

export function Facilities() {
  const { state, updateFacility, setFacilityStatus } = useAdmin();
  const { query } = useHashLocation();
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(query.get('status') ?? 'ALL');
  const [draft, setDraft] = useState<Facility | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    return state.facilities
      .filter((item) => (status === 'ALL' ? true : item.status === status))
      .filter((item) =>
        includesQuery(search, [
          item.businessName,
          item.city,
          item.ownerName,
          item.categoryName,
        ]),
      )
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [state.facilities, search, status]);

  const paging = usePaged(rows, `${search}|${status}|${state.facilities.length}`);
  const pending = state.facilities.filter((item) => item.status === 'PENDING_REVIEW').length;
  const approved = state.facilities.filter((item) => item.status === 'APPROVED').length;
  const blocked = state.facilities.filter((item) => item.status === 'SUSPENDED').length;

  function open(facility: Facility) {
    setDraft({ ...facility });
    setErrors({});
  }

  function validate(facility: Facility) {
    const next: Record<string, string> = {};
    if ((facility.businessName ?? '').trim().length < 2) next.businessName = 'Enter the facility name.';
    if (facility.cityId == null) next.cityId = 'Choose a city.';
    if (facility.categoryId == null) next.categoryId = 'Choose a category.';
    return next;
  }

  async function save(nextStatus?: FacilityStatus) {
    if (!draft || busy) return;
    const nextErrors = validate(draft);
    const category = state.categories.find((item) => item.id === Number(draft.categoryId));
    if (nextStatus === 'APPROVED' && category?.status === 'INACTIVE') {
      nextErrors.categoryId = 'This category is blocked. Pick an active one before approving.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const apply = async () => {
      setBusy(true);
      try {
        await updateFacility(draft.id, {
          businessName: draft.businessName.trim(),
          categoryId: Number(draft.categoryId),
          cityId: Number(draft.cityId),
          address: draft.address?.trim() || null,
          description: draft.description?.trim() || null,
        });
        if (nextStatus && nextStatus !== draft.status) {
          await setFacilityStatus(draft.id, nextStatus);
        }
        const updated = {
          ...draft,
          businessName: draft.businessName.trim(),
          categoryId: Number(draft.categoryId),
          cityId: Number(draft.cityId),
          address: draft.address?.trim() || null,
          description: draft.description?.trim() || null,
          status: nextStatus ?? draft.status,
          categoryName: category?.name ?? draft.categoryName,
          city: state.cities.find((c) => c.id === Number(draft.cityId))?.name ?? draft.city,
        };
        setDraft(updated);
        toast(
          nextStatus
            ? `Facility marked ${facilityStatusLabel[nextStatus].toLowerCase()}.`
            : 'Facility updated.',
        );
      } catch (err) {
        toast(err instanceof ApiError ? err.message : 'Could not save facility.');
      } finally {
        setBusy(false);
      }
    };

    if (nextStatus === 'SUSPENDED' || nextStatus === 'REJECTED') {
      confirm({
        title: nextStatus === 'SUSPENDED' ? 'Block this facility?' : 'Reject this facility?',
        message:
          nextStatus === 'SUSPENDED'
            ? `${draft.businessName} will disappear from search until you approve it again.`
            : `${draft.businessName} will stay off the marketplace.`,
        confirmLabel: nextStatus === 'SUSPENDED' ? 'Block' : 'Reject',
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
        <StatCard label="Facilities" value={String(state.facilities.length)} hint="All records" />
        <StatCard label="Pending review" value={String(pending)} hint="New applications" />
        <StatCard label="Approved" value={String(approved)} hint="Visible to customers" />
        <StatCard label="Blocked" value={String(blocked)} hint="Suspended by admin" />
      </section>

      <section className="panel">
        <div className="toolbar">
          <SearchField value={search} onChange={setSearch} placeholder="Search name, city, or owner" />
          <div className="filters">
            <select className="select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status">
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item === 'ALL' ? 'All statuses' : facilityStatusLabel[item]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {paging.total === 0 ? (
          <EmptyState title="No facilities" text="Try another search or status." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Category</th>
                  <th>City</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {paging.slice.map((facility) => (
                  <tr key={facility.id}>
                    <td>
                      <div className="person">
                        <Avatar name={facility.businessName} />
                        <div>
                          <strong dir="auto">{facility.businessName}</strong>
                          <span>{formatDate(facility.createdAt)}</span>
                        </div>
                      </div>
                    </td>
                    <td dir="auto">{facility.categoryName ?? '—'}</td>
                    <td dir="auto">{facility.city ?? '—'}</td>
                    <td dir="auto">{facility.ownerName ?? '—'}</td>
                    <td>
                      <StatusPill status={facility.status} label={facilityStatusLabel[facility.status]} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="btn ghost small" onClick={() => open(facility)}>
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
        <Pagination
          page={paging.page}
          pages={paging.pages}
          total={paging.total}
          pageSize={PAGE_SIZE}
          onPage={paging.setPage}
        />
      </section>

      <Drawer
        open={Boolean(draft)}
        wide
        title={draft?.businessName ?? 'Facility'}
        subtitle={draft ? formatDate(draft.createdAt) : undefined}
        onClose={() => setDraft(null)}
        footer={
          draft ? (
            <>
              <button type="button" className="btn ghost" disabled={busy} onClick={() => void save()}>
                Save changes
              </button>
              {draft.status === 'PENDING_REVIEW' || draft.status === 'REJECTED' ? (
                <button type="button" className="btn primary" disabled={busy} onClick={() => void save('APPROVED')}>
                  Approve
                </button>
              ) : null}
              {draft.status === 'PENDING_REVIEW' ? (
                <button type="button" className="btn danger" disabled={busy} onClick={() => void save('REJECTED')}>
                  Reject
                </button>
              ) : null}
              {draft.status === 'APPROVED' ? (
                <button type="button" className="btn danger" disabled={busy} onClick={() => void save('SUSPENDED')}>
                  Block
                </button>
              ) : null}
              {draft.status === 'SUSPENDED' ? (
                <button type="button" className="btn primary" disabled={busy} onClick={() => void save('APPROVED')}>
                  Unblock
                </button>
              ) : null}
            </>
          ) : null
        }
      >
        {draft ? (
          <>
            <div className="form-grid">
              <label className={cx('field', 'wide')}>
                <span>Name</span>
                <input
                  dir="auto"
                  value={draft.businessName}
                  onChange={(event) => setDraft({ ...draft, businessName: event.target.value })}
                />
                {errors.businessName ? <small>{errors.businessName}</small> : null}
              </label>
              <label className="field">
                <span>Category</span>
                <select
                  value={draft.categoryId ?? ''}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      categoryId: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                >
                  <option value="">Choose</option>
                  {state.categories
                    .filter((item) => item.status === 'ACTIVE' || item.id === draft.categoryId)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.status === 'INACTIVE' ? ' (blocked)' : ''}
                      </option>
                    ))}
                </select>
                {errors.categoryId ? <small>{errors.categoryId}</small> : null}
              </label>
              <label className="field">
                <span>City</span>
                <select
                  value={draft.cityId ?? ''}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      cityId: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                >
                  <option value="">Choose</option>
                  {state.cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
                {errors.cityId ? <small>{errors.cityId}</small> : null}
              </label>
              <label className={cx('field', 'wide')}>
                <span>Address</span>
                <input
                  dir="auto"
                  value={draft.address ?? ''}
                  onChange={(event) => setDraft({ ...draft, address: event.target.value })}
                />
              </label>
              <label className={cx('field', 'wide')}>
                <span>Description</span>
                <textarea
                  dir="auto"
                  value={draft.description ?? ''}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </label>
            </div>

            <section className="detail-section">
              <h3>Provider submission</h3>
              <dl className="detail-list">
                <div>
                  <dt>Owner</dt>
                  <dd dir="auto">
                    {draft.ownerName ?? '—'}
                    {draft.ownerPhone ? ` · ${draft.ownerPhone}` : ''}
                  </dd>
                </div>
                <div>
                  <dt>Region</dt>
                  <dd dir="auto">{draft.region ?? '—'}</dd>
                </div>
                <div>
                  <dt>Coordinates</dt>
                  <dd>
                    {draft.latitude != null && draft.longitude != null
                      ? `${draft.latitude}, ${draft.longitude}`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <StatusPill status={draft.status} label={facilityStatusLabel[draft.status]} />
                    {draft.status === 'SUSPENDED' ? (
                      <span className="muted" style={{ display: 'block', marginTop: 6 }}>
                        {draft.disabledBy === 'ADMIN'
                          ? 'Blocked by admin — provider cannot re-enable.'
                          : draft.disabledBy === 'PROVIDER'
                            ? 'Provider self-disable — they can re-enable.'
                            : 'Suspended.'}
                      </span>
                    ) : null}
                  </dd>
                </div>
                {draft.status === 'SUSPENDED' && draft.disableReason ? (
                  <div>
                    <dt>Disable reason</dt>
                    <dd dir="auto">{draft.disableReason}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Rooms</dt>
                  <dd>
                    {[
                      draft.bedrooms != null ? `${draft.bedrooms} bedrooms` : null,
                      draft.bathrooms != null ? `${draft.bathrooms} bathrooms` : null,
                      draft.majlis != null ? `${draft.majlis} majlis` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </dd>
                </div>
                <div>
                  <dt>Insurance</dt>
                  <dd dir="auto">
                    {[
                      draft.insuranceAmount != null ? String(draft.insuranceAmount) : null,
                      draft.insuranceMeta,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </dd>
                </div>
                {draft.tourUrl ? (
                  <div>
                    <dt>Tour</dt>
                    <dd>
                      <a href={draft.tourUrl} target="_blank" rel="noreferrer">
                        Open link
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
              {draft.insuranceNote ? <p className="help" dir="auto">{draft.insuranceNote}</p> : null}
              {draft.depositNote ? (
                <p className="help" dir="auto">
                  Deposit note: {draft.depositNote}
                </p>
              ) : null}
              {draft.cancellationPolicy ? (
                <p className="help" dir="auto">
                  Cancellation: {draft.cancellationPolicy}
                </p>
              ) : null}
            </section>

            {draft.images.length ? (
              <section className="detail-section">
                <h3>Photos ({draft.images.length})</h3>
                <div className="image-grid">
                  {draft.images.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="" loading="lazy" />
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            {draft.spaces.length ? (
              <section className="detail-section">
                <h3>Spaces</h3>
                <div className="chip-list">
                  {draft.spaces.map((item) => (
                    <span key={item} dir="auto">
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {draft.amenities.length ? (
              <section className="detail-section">
                <h3>Amenities</h3>
                <div className="chip-list">
                  {draft.amenities.map((item) => (
                    <span key={item} dir="auto">
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {draft.terms.length ? (
              <section className="detail-section">
                <h3>Terms</h3>
                <div className="chip-list">
                  {draft.terms.map((item) => (
                    <span key={item} dir="auto">
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {draft.services.length ? (
              <section className="detail-section">
                <h3>Services ({draft.services.length})</h3>
                <div className="service-list">
                  {draft.services.map((service) => (
                    <article key={service.id}>
                      <strong dir="auto">{service.name}</strong>
                      <span>
                        {service.basePrice.toLocaleString('en-US')} YER · deposit{' '}
                        {service.depositPercentage}% · {service.status}
                      </span>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </Drawer>
    </>
  );
}
