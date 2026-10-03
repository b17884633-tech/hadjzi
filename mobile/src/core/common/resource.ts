export type Resource<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

export function idle<T>(): Resource<T> {
  return { status: 'idle' };
}

export function loading<T>(): Resource<T> {
  return { status: 'loading' };
}

export function success<T>(data: T): Resource<T> {
  return { status: 'success', data };
}

export function error<T>(message: string): Resource<T> {
  return { status: 'error', message };
}
