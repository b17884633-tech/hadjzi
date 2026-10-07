import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { cx, toneFor } from './format';
import { Icon } from './icons';

type ToastItem = { id: number; message: string };
type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
};

const ToastContext = createContext<(message: string) => void>(() => {});
const ConfirmContext = createContext<(request: ConfirmRequest) => void>(() => {});

let scrollLocks = 0;

function lockScroll(lock: boolean) {
  scrollLocks = Math.max(0, scrollLocks + (lock ? 1 : -1));
  document.body.style.overflow = scrollLocks > 0 ? 'hidden' : '';
}

export function useToast() {
  return useContext(ToastContext);
}

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const push = (message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3200);
  };

  useEffect(() => {
    if (!confirm) return;
    lockScroll(true);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation();
        setConfirm(null);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      lockScroll(false);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [confirm]);

  return (
    <ToastContext.Provider value={push}>
      <ConfirmContext.Provider value={setConfirm}>
        {children}
        <div className="toasts" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className="toast" role="status">
              {toast.message}
            </div>
          ))}
        </div>
        {confirm ? (
          <div className="overlay center confirm-layer" onMouseDown={() => setConfirm(null)}>
            <div
              className="modal confirm-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <h2 id="confirm-title">{confirm.title}</h2>
              <p>{confirm.message}</p>
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setConfirm(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={cx('btn', confirm.danger ? 'danger' : 'primary')}
                  onClick={() => {
                    confirm.onConfirm();
                    setConfirm(null);
                  }}
                >
                  {confirm.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'navy';
}) {
  return (
    <article className={cx('stat-card', tone === 'navy' && 'stat-navy')}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </article>
  );
}

export function StatusPill({ status, label }: { status: string; label: string }) {
  return <span className={cx('pill', toneFor(status))}>{label}</span>;
}

export function Avatar({ name }: { name: string }) {
  const tones = ['#0d1b3e', '#1c3568', '#8d6a32', '#0f6e56', '#7a3e2e'];
  let index = 0;
  for (const char of name) index = (index + char.charCodeAt(0)) % tones.length;
  return (
    <span className="avatar" style={{ background: tones[index] }} dir="auto" aria-hidden="true">
      {name.trim().charAt(0) || '?'}
    </span>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-field">
      <Icon name="search" size={18} />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <small>{error}</small> : null}
    </label>
  );
}

export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    lockScroll(true);
    window.addEventListener('keydown', onKey);
    return () => {
      lockScroll(false);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="overlay" onMouseDown={onClose}>
      <aside
        className={cx('drawer', wide && 'drawer-wide')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="drawer-head">
          <div>
            <h2 dir="auto">{title}</h2>
            {subtitle ? <p dir="auto">{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer ? <footer className="drawer-foot">{footer}</footer> : null}
      </aside>
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  onSubmit,
  submitLabel,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel?: string;
}) {
  const titleId = useId();

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    lockScroll(true);
    window.addEventListener('keydown', onKey);
    return () => {
      lockScroll(false);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;

  const body = (
    <>
      <header className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </header>
      <div className="modal-body">{children}</div>
      {onSubmit ? (
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            {submitLabel ?? 'Save'}
          </button>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {onSubmit ? <form onSubmit={onSubmit}>{body}</form> : body}
      </div>
    </div>
  );
}

export function Pagination({
  page,
  pages,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <div className="pager">
      <p>
        Showing {start}–{end} of {total}
      </p>
      <div>
        <button type="button" className="btn ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <span>
          {page} / {pages}
        </span>
        <button type="button" className="btn ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export const PAGE_SIZE = 8;

export function usePaged<T>(items: T[], resetKey: string) {
  const [page, setPage] = useState(1);
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setPage(1);
  }
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const slice = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  return { page: safePage, pages, slice, setPage, total: items.length };
}
