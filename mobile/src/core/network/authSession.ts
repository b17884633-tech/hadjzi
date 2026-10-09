type UnauthorizedListener = () => void;

const listeners = new Set<UnauthorizedListener>();
let clearing = false;

/** UI registers here (e.g. AppProvider) to clear local user state on 401. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyUnauthorized(): void {
  if (clearing) return;
  clearing = true;
  try {
    listeners.forEach((listener) => listener());
  } finally {
    clearing = false;
  }
}
