import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '../api';
import { bookingTypeLabel, formatMoney, recordStatusLabel } from '../format';
import { useAdmin } from '../store';
import type { BookingType, Category, RecordStatus } from '../types';
import {
  EmptyState,
  Modal,
  PAGE_SIZE,
  Pagination,
  StatCard,
  StatusPill,
  useConfirm,
  usePaged,
  useToast,
} from '../ui';

const bookingTypes: BookingType[] = ['SLOT', 'UNIT_DAY', 'EVENT_DAY', 'QUANTITY'];

type Draft = {
  id: number | null;
  name: string;
  parentId: string;
  bookingType: BookingType;
  sortOrder: string;
};

const blank: Draft = { id: null, name: '', parentId: '', bookingType: 'SLOT', sortOrder: '0' };

function childIds(categories: Category[], id: number): number[] {
  const direct = categories.filter((item) => item.parentId === id).map((item) => item.id);
  return direct.concat(direct.flatMap((child) => childIds(categories, child)));
}

export function Settings() {
  const { state, addCategory, updateCategory, setDeposit } = useAdmin();
  const toast = useToast();
  const confirm = useConfirm();
  const [deposit, setDepositDraft] = useState(String(state.depositPercentage));
  const [depositError, setDepositError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDepositDraft(String(state.depositPercentage));
  }, [state.depositPercentage]);

  const ordered = useMemo(
    () => [...state.categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ar')),
    [state.categories],
  );
  const paging = usePaged(ordered, String(ordered.length));
  const active = state.categories.filter((item) => item.status === 'ACTIVE').length;
  const blocked = state.categories.filter((item) => item.status === 'INACTIVE').length;
  const sample = Math.round(100000 * (Number(deposit) || 0)) / 100;

  function parentName(id: number | null) {
    if (id == null) return '—';
    return state.categories.find((item) => item.id === id)?.name ?? '—';
  }

  function openCreate() {
    setDraft({ ...blank });
    setFormError('');
  }

  function openEdit(category: Category) {
    setDraft({
      id: category.id,
      name: category.name,
      parentId: category.parentId == null ? '' : String(category.parentId),
      bookingType: category.bookingType,
      sortOrder: String(category.sortOrder),
    });
    setFormError('');
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    if (!draft || busy) return;
    const name = draft.name.trim();
    const sortOrder = Number(draft.sortOrder);
    const parentId = draft.parentId ? Number(draft.parentId) : null;
    if (name.length < 2) {
      setFormError('Enter a category name.');
      return;
    }
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) {
      setFormError('Sort order must be a whole number from 0 to 999.');
      return;
    }
    if (draft.id != null && parentId === draft.id) {
      setFormError('A category cannot be its own parent.');
      return;
    }
    if (draft.id != null && parentId != null && childIds(state.categories, draft.id).includes(parentId)) {
      setFormError('Choose a parent that is not inside this category.');
      return;
    }

    setBusy(true);
    try {
      if (draft.id == null) {
        await addCategory({ name, parentId, bookingType: draft.bookingType, sortOrder });
        toast('Category added.');
      } else {
        await updateCategory(draft.id, { name, parentId, bookingType: draft.bookingType, sortOrder });
        toast('Category updated.');
      }
      setDraft(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save category.');
    } finally {
      setBusy(false);
    }
  }

  function toggleCategory(category: Category) {
    const next: RecordStatus = category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const run = () => {
      void updateCategory(category.id, { status: next })
        .then(() => toast(next === 'INACTIVE' ? 'Category blocked.' : 'Category activated.'))
        .catch((err) => toast(err instanceof ApiError ? err.message : 'Could not update category.'));
    };
    if (next === 'INACTIVE') {
      confirm({
        title: 'Block this category?',
        message: `${category.name} will be hidden from new listings. Existing facilities keep their history.`,
        confirmLabel: 'Block',
        danger: true,
        onConfirm: run,
      });
      return;
    }
    run();
  }

  async function saveDeposit() {
    const value = Math.round(Number(deposit) * 10) / 10;
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setDepositError('Enter a percentage from 0 to 100.');
      return;
    }
    setBusy(true);
    try {
      setDepositError('');
      await setDeposit(value);
      setDepositDraft(String(value));
      toast('Deposit percentage saved for new and existing services.');
    } catch (err) {
      setDepositError(err instanceof ApiError ? err.message : 'Could not save deposit.');
    } finally {
      setBusy(false);
    }
  }

  const blockedParents = new Set<number>();
  if (draft?.id != null) {
    blockedParents.add(draft.id);
    childIds(state.categories, draft.id).forEach((id) => blockedParents.add(id));
  }

  return (
    <>
      <section className="stat-grid">
        <StatCard label="Categories" value={String(state.categories.length)} hint="Roots and subcategories" />
        <StatCard label="Active" value={String(active)} hint="Available in the app" />
        <StatCard label="Blocked" value={String(blocked)} hint="Hidden from new listings" />
        <StatCard label="Deposit" value={`${state.depositPercentage}%`} hint="Default for services" />
      </section>

      <div className="settings-layout">
        <section className="panel deposit-card">
          <h2>Deposit percentage</h2>
          <p className="help">
            Saved to platform settings and applied to every service. Existing bookings keep the rate they were created with.
          </p>
          <div className="deposit-figure">
            {Number.isFinite(Number(deposit)) ? Number(deposit) : 0}
            <span>%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Number.isFinite(Number(deposit)) ? Number(deposit) : 0}
            onChange={(event) => {
              setDepositDraft(event.target.value);
              setDepositError('');
            }}
            aria-label="Deposit percentage"
          />
          <label className="field">
            <span>Exact value</span>
            <input
              inputMode="decimal"
              value={deposit}
              onChange={(event) => {
                setDepositDraft(event.target.value);
                setDepositError('');
              }}
            />
            {depositError ? <small>{depositError}</small> : null}
          </label>
          <p className="help">On a {formatMoney(100000)} booking the deposit is {formatMoney(Math.max(0, sample))}.</p>
          <button type="button" className="btn primary" disabled={busy} onClick={() => void saveDeposit()}>
            Save deposit
          </button>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Categories</h2>
            <button type="button" className="btn primary small" onClick={openCreate}>
              Add category
            </button>
          </div>
          {paging.total === 0 ? (
            <EmptyState title="No categories" text="Add the first category to organise facilities." />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Parent</th>
                    <th>Booking</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {paging.slice.map((category) => (
                    <tr key={category.id}>
                      <td dir="auto">
                        <strong>{category.name}</strong>
                      </td>
                      <td dir="auto">{parentName(category.parentId)}</td>
                      <td>{bookingTypeLabel[category.bookingType]}</td>
                      <td>
                        <StatusPill status={category.status} label={recordStatusLabel[category.status]} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="btn ghost small" onClick={() => openEdit(category)}>
                            Edit
                          </button>
                          <button type="button" className="btn ghost small" onClick={() => toggleCategory(category)}>
                            {category.status === 'ACTIVE' ? 'Block' : 'Activate'}
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
      </div>

      <Modal
        open={Boolean(draft)}
        title={draft?.id == null ? 'Add category' : 'Update category'}
        onClose={() => setDraft(null)}
        onSubmit={saveCategory}
        submitLabel={busy ? 'Saving…' : 'Save'}
      >
        {draft ? (
          <div className="stack">
            <label className="field">
              <span>Name</span>
              <input dir="auto" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </label>
            <label className="field">
              <span>Parent</span>
              <select
                value={draft.parentId}
                onChange={(event) => {
                  const parentId = event.target.value;
                  const parent = state.categories.find((item) => String(item.id) === parentId);
                  setDraft({
                    ...draft,
                    parentId,
                    bookingType: parent?.bookingType ?? draft.bookingType,
                  });
                }
                }
              >
                <option value="">None (top level)</option>
                {state.categories
                  .filter((item) => !blockedParents.has(item.id))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>Booking type</span>
              <select
                value={draft.bookingType}
                onChange={(event) => setDraft({ ...draft, bookingType: event.target.value as BookingType })}
              >
                {bookingTypes.map((type) => (
                  <option key={type} value={type}>
                    {bookingTypeLabel[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Sort order</span>
              <input
                inputMode="numeric"
                value={draft.sortOrder}
                onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })}
              />
            </label>
            {formError ? <div className="error-banner">{formError}</div> : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
